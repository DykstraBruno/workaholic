'use strict';

/**
 * Upwork field selectors with fallbacks. The parser tries each selector in
 * order and uses the first non-empty match.
 */
const SELECTORS = {
  card: [
    '[data-test="JobTile"]',
    '.job-tile',
    '.up-card-section',
  ],
  title: [
    'h2.job-tile-title a',
    '[data-test="job-tile-title"]',
    'h3 a',
  ],
  description: [
    '[data-test="job-description-text"]',
    '.job-description',
    'p',
  ],
  skills: [
    '[data-test="token"]',
    '.air3-token span',
    '.skills span',
  ],
  budget: [
    '[data-test="job-type-label"]',
    '[data-test="budget"]',
    '.budget',
  ],
  postedAt: [
    'time[datetime]',
    '[data-test="posted-on"]',
    '.posted-on',
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

function parseBudget(text) {
  if (!text || !text.trim()) return null;

  const numbers = (text.match(/[\d.,]+/g) || [])
    .map((raw) => parseFloat(raw.replace(/\./g, '').replace(',', '.')))
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
 * Pure parser for Upwork search HTML.
 * Receives an HTML string and returns raw job entries.
 * Never throws; on any parsing issue returns [] or defaulted fields.
 *
 * @param {string} html
 * @returns {Array<{title: string, description: string, skills: string[], budget: {min:number,max:number,currency:string}|null, url: string, postedAt: string}>}
 */
function parseUpwork(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ''), 'text/html');

    let cards = [];
    for (const selector of SELECTORS.card) {
      const found = doc.querySelectorAll(selector);
      if (found.length) {
        cards = Array.from(found);
        break;
      }
    }

    if (!cards.length) return [];

    return cards.map((card) => {
      const title = firstText(card, SELECTORS.title);
      const description = firstText(card, SELECTORS.description);
      const skills = parseSkills(card);
      const budgetText = firstText(card, SELECTORS.budget);
      const budget = parseBudget(budgetText);
      const href = firstAttr(card, SELECTORS.title, 'href');
      const url = toAbsoluteUrl(href, 'https://www.upwork.com');

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
  module.exports = { parseUpwork, SELECTORS };
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseUpwork = parseUpwork;
  globalThis.UPWORK_SELECTORS = SELECTORS;
}
