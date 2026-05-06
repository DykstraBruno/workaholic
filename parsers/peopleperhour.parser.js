(function () {
'use strict';

/**
 * PeoplePerHour field selectors with fallbacks. The parser tries each
 * selector in order and uses the first non-empty match.
 */
const SELECTORS = {
  card: [
    'li:has(h6 a[href*="/freelance-jobs/"])',
    'article:has(h6)',
    '[data-test="job-card"]',
    '.jobs-list__item',
    '.listing-item',
  ],
  title: [
    'h6 a',
    '[data-test="job-title"] a',
    'h2 a',
    '.listing-title a',
  ],
  description: [
    '[data-test="job-description"]',
    '.listing-description',
    'p',
  ],
  skills: [
    '[data-test="skill-tag"]',
    '.listing-tags span',
    '.skills span',
  ],
  budget: [
    '[data-test="job-budget"]',
    '.listing-price',
    '.budget',
  ],
  postedAt: [
    'time[datetime]',
    '.listing-posted',
    '.date',
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

function fallbackDescription(card, title) {
  const text = (card.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (title && text.startsWith(title)) {
    return text.slice(title.length).trim().slice(0, 500);
  }
  return text.slice(0, 500);
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

  const numbers = (text.match(/[\d.,]+/g) || [])
    .map((raw) => parseFloat(raw.replace(/\./g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n));

  if (!numbers.length) return null;

  const currency = /£|GBP/i.test(text) ? 'GBP' : /€|EUR/i.test(text) ? 'EUR' : 'USD';
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
 * Pure parser for PeoplePerHour jobs HTML.
 * Receives an HTML string and returns raw job entries.
 * Never throws; on any parsing issue returns [] or defaulted fields.
 *
 * @param {string} html
 * @returns {Array<{title: string, description: string, skills: string[], budget: {min:number,max:number,currency:string}|null, url: string, postedAt: string}>}
 */
function parsePeoplePerHour(html) {
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
      const title = firstText(card, SELECTORS.title);
      const description = firstText(card, SELECTORS.description) || fallbackDescription(card, title);
      const skills = parseSkills(card);
      const budgetText = firstText(card, SELECTORS.budget);
      const budget = parseBudget(budgetText);
      const href = firstAttr(card, SELECTORS.title, 'href');
      const url = toAbsoluteUrl(href, 'https://www.peopleperhour.com');

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
  module.exports = { parsePeoplePerHour, SELECTORS };
}

if (typeof globalThis !== 'undefined') {
  globalThis.parsePeoplePerHour = parsePeoplePerHour;
  globalThis.PEOPLEPERHOUR_SELECTORS = SELECTORS;
}

})();
