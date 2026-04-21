(function () {
'use strict';

/**
 * LinkedIn field selectors with fallbacks. The parser tries each selector in
 * order and uses the first non-empty match.
 */
const SELECTORS = {
  card: [
    // Primary job card in LinkedIn jobs search list.
    '.jobs-search-results__list-item',
    // Alternate card wrapper used in compact list variants.
    '.base-card',
    // Generic job card marker seen in occasional A/B tests.
    '[data-job-id]',
  ],
  title: [
    // Canonical LinkedIn title anchor in search result cards.
    'h3.base-search-card__title a',
    // Common layout where title text is in h3 and link is a sibling anchor.
    'h3.base-search-card__title',
    '.base-search-card__title',
    // Primary link class used in many LinkedIn cards.
    'a.base-card__full-link',
    // Fallback for cards where title is attached to aria-label.
    '[aria-label*="vaga" i]',
    // Generic heading anchor fallback.
    'h3 a',
    'h3',
  ],
  description: [
    // Snippet/description text in standard LinkedIn list cards.
    '.base-search-card__snippet',
    '.base-search-card__metadata',
    '.base-search-card__subtitle',
    // Fallback for accessibility-labelled summary blocks.
    '[aria-label*="descri" i]',
    '[aria-label*="resumo" i]',
    // Generic paragraph fallback.
    'p',
  ],
  skills: [
    // Skill chips in custom rendered cards.
    '[data-test="skill-tag"]',
    // Tag list fallback used by some localized layouts.
    '.job-search-card__listitem',
    // Accessibility-based fallback where labels include "skill".
    '[aria-label*="skill" i]',
  ],
  budget: [
    // Salary text in dedicated compensation element.
    '.job-search-card__salary-info',
    // Accessibility fallback for remuneration labels.
    '[aria-label*="salario" i]',
    // Generic budget/salary fallback classes.
    '.salary, .budget',
  ],
  postedAt: [
    // Preferred machine-readable date attribute.
    'time[datetime]',
    // Human-readable posted time in list card metadata.
    '.job-search-card__listdate',
    // Accessibility fallback for posted time labels.
    '[aria-label*="publicad" i]',
  ],
};

function firstText(root, selectors) {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (!el) continue;
    const text = (el.textContent || '').trim();
    if (text) return text;
  }
  return '';
}

function firstAttr(root, selectors, attr) {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (!el) continue;
    const value = (el.getAttribute(attr) || '').trim();
    if (value) return value;
  }
  return '';
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function collapseRepeatedTitle(title) {
  const sanitize = (v) => compactText(v).replace(/\s+with\s+verification$/i, '').trim();
  const text = compactText(title);
  if (!text) return '';

  // Case 1: exact duplicated half: "ABCABC" or "ABC ABC".
  const len = text.length;
  if (len % 2 === 0) {
    const first = text.slice(0, len / 2).trim();
    const second = text.slice(len / 2).trim();
    if (first && second && first.toLowerCase() === second.toLowerCase()) {
      return sanitize(first);
    }
  }

  // Case 2: duplicated leading phrase, e.g. "Python Developer Python Developer with ...".
  const words = text.split(' ').filter(Boolean);
  for (let n = Math.min(6, Math.floor(words.length / 2)); n >= 2; n--) {
    const a = words.slice(0, n).join(' ').toLowerCase();
    const b = words.slice(n, n * 2).join(' ').toLowerCase();
    if (a && a === b) {
      return sanitize([...words.slice(0, n), ...words.slice(n * 2)].join(' '));
    }
  }

  // Case 3: LinkedIn may append verification label to title text.
  return sanitize(text);
}

function parseSkills(card) {
  const out = [];
  for (const selector of SELECTORS.skills) {
    const items = card.querySelectorAll(selector);
    if (!items.length) continue;

    for (const item of items) {
      const value = (item.textContent || '').trim();
      if (value) out.push(value);
    }

    if (out.length) break;
  }
  return out;
}

function parseBudget(text) {
  if (!text || !text.trim()) return null;

  function parseFlexibleNumber(raw) {
    const cleaned = raw.replace(/\s/g, '');
    const hasComma = cleaned.includes(',');
    const hasDot = cleaned.includes('.');

    if (hasComma && hasDot) {
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      // If comma is the decimal separator, remove thousand dots first.
      if (lastComma > lastDot) {
        return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
      }
      // If dot is the decimal separator, remove thousand commas first.
      return parseFloat(cleaned.replace(/,/g, ''));
    }

    if (hasComma && /^\d{1,3}(,\d{3})+$/.test(cleaned)) {
      return parseFloat(cleaned.replace(/,/g, ''));
    }

    if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      return parseFloat(cleaned.replace(/\./g, ''));
    }

    return parseFloat(cleaned.replace(',', '.'));
  }

  const numbers = (text.match(/[\d.,]+/g) || [])
    .map(parseFlexibleNumber)
    .filter((n) => Number.isFinite(n));

  if (!numbers.length) return null;

  const currency = /R\$/i.test(text) ? 'BRL' : 'USD';
  const min = numbers[0];
  const max = numbers.length > 1 ? numbers[1] : numbers[0];

  return { min, max, currency };
}

function toAbsoluteUrl(url, base) {
  if (!url) return '';
  try {
    return new URL(url, base).href;
  } catch {
    return '';
  }
}

/**
 * Pure parser for LinkedIn jobs search HTML.
 * Receives an HTML string and returns raw job entries.
 * Never throws; on any parsing issue returns [] or defaulted fields.
 *
 * @param {string} html
 * @returns {Array<{title: string, description: string, skills: string[], budget: {min:number,max:number,currency:string}|null, url: string, postedAt: string}>}
 */
function parseLinkedIn(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ''), 'text/html');

    const cards = [];
    const seen = new Set();
    for (const selector of SELECTORS.card) {
      const found = doc.querySelectorAll(selector);
      for (const el of found) {
        if (!seen.has(el)) {
          seen.add(el);
          cards.push(el);
        }
      }
    }

    if (!cards.length) return [];

    return cards.map((card) => {
      let title = firstText(card, SELECTORS.title);
      let description = firstText(card, SELECTORS.description);
      const skills = parseSkills(card);
      const budgetText = firstText(card, SELECTORS.budget);
      const budget = parseBudget(budgetText);

      const href = firstAttr(card, SELECTORS.title, 'href')
        || firstAttr(card, ['a.base-card__full-link', 'a[href*="linkedin.com/jobs/view/"]'], 'href')
        || firstAttr(card, ['a[href*="/jobs/view/"]'], 'href');
      const url = toAbsoluteUrl(href, 'https://www.linkedin.com');

      if (!title) {
        const anchorText = firstText(card, ['a.base-card__full-link', 'a[href*="/jobs/view/"]', 'a']);
        if (anchorText) title = anchorText;
      }

      title = collapseRepeatedTitle(title);

      if (!description) {
        const wholeCardText = compactText(card.textContent || '');
        const titleText = compactText(title || '');
        if (wholeCardText && titleText && wholeCardText.startsWith(titleText)) {
          description = compactText(wholeCardText.slice(titleText.length));
        } else {
          description = wholeCardText;
        }
      }

      const postedAttr = firstAttr(card, SELECTORS.postedAt, 'datetime');
      const postedText = postedAttr || firstText(card, SELECTORS.postedAt);

      return {
        title: title || '',
        description: description || '',
        skills: Array.isArray(skills) ? skills : [],
        budget: budget || null,
        url: url || '',
        postedAt: postedText || '',
      };
    });
  } catch {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseLinkedIn, SELECTORS };
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseLinkedIn = parseLinkedIn;
  globalThis.LINKEDIN_SELECTORS = SELECTORS;
}

})();
