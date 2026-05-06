(function () {
'use strict';

/**
 * We Work Remotely field selectors with fallbacks. The parser tries each
 * selector in order and uses the first non-empty match.
 */
const SELECTORS = {
  card: [
    'li.feature',
    'section.jobs li',
    'article.listing',
  ],
  title: [
    'span.title',
    'h2 a',
    'a span',
  ],
  description: [
    'span.company',
    '.listing-company',
    'p',
  ],
  skills: [
    'span.tooltip',
    '.category a',
    '.tags li',
  ],
  budget: [
    '.salary',
    '.compensation',
    '.pay',
  ],
  postedAt: [
    'time[datetime]',
    '.listing-date',
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

function toAbsoluteUrl(url, base) {
  if (!url) return '';
  try {
    return new URL(url, base).href;
  } catch {
    return '';
  }
}

/**
 * Pure parser for We Work Remotely jobs HTML.
 * Receives an HTML string and returns raw job entries.
 * Never throws; on any parsing issue returns [] or defaulted fields.
 *
 * @param {string} html
 * @returns {Array<{title: string, description: string, skills: string[], budget: null, url: string, postedAt: string}>}
 */
function parseWeWorkRemotely(html) {
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

      // WWR has two anchors: company logo (<a class="flag">) then job link (<a href="/remote-jobs/...">).
      // We must skip the company logo anchor and pick the job-specific link.
      let href = firstAttr(card, ['a[href*="/remote-jobs/"]', 'a'], 'href');
      if (!href) {
        const anchor = card.querySelector('a[href*="/remote-jobs/"]') || card.querySelector('a');
        href = anchor ? (anchor.getAttribute('href') || '') : '';
      }
      const url = toAbsoluteUrl(href, 'https://weworkremotely.com');

      const postedAttr = firstAttr(card, SELECTORS.postedAt, 'datetime');
      const postedText = postedAttr || firstText(card, SELECTORS.postedAt);

      return {
        title: title || '',
        description: description || '',
        skills: Array.isArray(skills) ? skills : [],
        budget: null,
        url: url || '',
        postedAt: postedText || '',
      };
    });
  } catch {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseWeWorkRemotely, SELECTORS };
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseWeWorkRemotely = parseWeWorkRemotely;
  globalThis.WEWORKREMOTELY_SELECTORS = SELECTORS;
}

})();
