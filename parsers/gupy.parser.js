(function () {
'use strict';

/**
 * Gupy field selectors with fallbacks. The parser tries each selector in
 * order and uses the first non-empty match.
 * Updated for both old (www.gupy.io) and new (portal.gupy.io) interfaces
 */
const SELECTORS = {
  card: [
    'a[href*="jobBoardSource=gupy_portal"]',
    'a[href*="/job/"]',
    '[data-testid="job-card"]',
    'article',
    '[role="article"]',
    'div[class*="JobCard"]',
    'div[class*="job-card"]',
    '.jobs-list__listitem',
    '.job-card',
    'li[class*="job"]',
    'div[class*="vacancy"]',
  ],
  title: [
    'h3',
    'h2 a',
    'h2',
    '[data-testid="job-title"]',
    'h3 a',
    'a[class*="title"]',
    '[class*="Title"]',
  ],
  description: [
    '[data-testid="listing-details"]',
    '[data-testid="job-description"]',
    '.job-card__description',
    'p[class*="description"]',
    '[class*="Description"]',
    'p',
  ],
  skills: [
    '[data-testid="skill-tag"]',
    'span[class*="tag"]',
    'div[class*="tag"]',
    '.job-card__tags li',
    '.tags span',
    '[class*="Skill"]',
  ],
  budget: [
    '[data-testid="job-salary"]',
    '.job-card__salary',
    '.salary',
    '[class*="salary"]',
    '[class*="Salary"]',
    '[class*="price"]',
  ],
  postedAt: [
    '[data-testid="listing-card-footer"] p',
    'time[datetime]',
    'time',
    '[data-testid="job-posted-at"]',
    '.job-card__date',
    '[class*="date"]',
    '[class*="Date"]',
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

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function fallbackDescription(card, title) {
  const text = compactText(card.textContent || '');
  if (!text) return '';

  if (title && text.startsWith(title)) {
    return compactText(text.slice(title.length));
  }

  return text;
}

function parseFlexibleNumber(raw) {
  const cleaned = String(raw).replace(/\s/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
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

function parseBudget(text) {
  if (!text || !text.trim()) return null;

  const numbers = (text.match(/[\d.,]+/g) || [])
    .map(parseFlexibleNumber)
    .filter((n) => Number.isFinite(n));

  if (!numbers.length) return null;

  const currency = /R\$|BRL/i.test(text) ? 'BRL' : 'USD';
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

function parseGupy(html) {
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

    cards.sort((a, b) => {
      if (a === b) return 0;
      const pos = a.compareDocumentPosition(b);
      if (pos & 4) return -1;
      if (pos & 2) return 1;
      return 0;
    });

    if (!cards.length) return [];

    return cards.map((card) => {
      const title = firstText(card, SELECTORS.title);
      const description = firstText(card, SELECTORS.description) || fallbackDescription(card, title);
      const skills = parseSkills(card);
      const budgetText = firstText(card, SELECTORS.budget);
      const budget = parseBudget(budgetText);
      const href = card.matches('a[href]')
  		? (card.getAttribute('href') || '')
  		: firstAttr(card, ['a[href]'], 'href');
      const url = toAbsoluteUrl(href, 'https://www.gupy.io');

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
  module.exports = { parseGupy, SELECTORS };
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseGupy = parseGupy;
  globalThis.GUPY_SELECTORS = SELECTORS;
}

})();
