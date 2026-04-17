'use strict';

/**
 * Indeed field selectors with fallbacks. The parser tries each selector in
 * order and uses the first non-empty match.
 */
const SELECTORS = {
  card: [
    '[data-testid="jobsearch-SerpJobCard"]',
    '.job_seen_beacon',
    '.result',
  ],
  title: [
    'h2 a',
    '[data-testid="job-title"]',
    '.jobTitle a',
    'h3 a',
  ],
  description: [
    '[data-testid="job-snippet"]',
    '.job-snippet',
    'p',
  ],
  skills: [
    '[data-testid="attribute_snippet_testid"]',
    '.attribute_snippet',
    '.metadata li',
  ],
  budget: [
    '[data-testid="attribute_snippet_testid"]',
    '.salary-snippet-container',
    '.salary-snippet',
  ],
  postedAt: [
    'time[datetime]',
    '[data-testid="myJobsStateDate"]',
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

function stripHtml(text) {
  return String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function parseSkillsFromJsonLd(node) {
  const raw = node.skills || node.skillsRequired || node.qualifications;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }

  return String(raw)
    .split(/,|\||;/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseBudgetFromJsonLd(node) {
  const base = node.baseSalary;
  if (!base) return null;

  const currency = String(base.currency || base?.value?.currency || 'USD').toUpperCase();
  const value = base.value;

  if (typeof value === 'number') {
    return { min: value, max: value, currency };
  }

  if (value && typeof value === 'object') {
    const minValue = Number(value.minValue ?? value.value ?? value.maxValue);
    const maxValue = Number(value.maxValue ?? value.value ?? value.minValue);

    if (Number.isFinite(minValue) && Number.isFinite(maxValue)) {
      return { min: minValue, max: maxValue, currency };
    }
  }

  return null;
}

function collectJsonLdJobPostings(doc) {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const jobs = [];

  for (const script of scripts) {
    const raw = (script.textContent || '').trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const queue = asArray(parsed);

      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== 'object') continue;

        if (Array.isArray(node['@graph'])) {
          queue.push(...node['@graph']);
        }

        const type = node['@type'];
        const isJobPosting = Array.isArray(type)
          ? type.includes('JobPosting')
          : type === 'JobPosting';

        if (!isJobPosting) continue;

        jobs.push({
          title: String(node.title || '').trim(),
          description: stripHtml(node.description || ''),
          skills: parseSkillsFromJsonLd(node),
          budget: parseBudgetFromJsonLd(node),
          url: toAbsoluteUrl(node.url || '', 'https://br.indeed.com'),
          postedAt: String(node.datePosted || '').trim(),
        });
      }
    } catch {
      // Ignore invalid JSON-LD blocks and continue with the next one.
    }
  }

  return jobs.filter((job) => (
    job.title || job.description || job.url
  ));
}

function parseViaCss(doc) {
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
    const description = firstText(card, SELECTORS.description);
    const skills = parseSkills(card);
    const budgetText = firstText(card, SELECTORS.budget);
    const budget = parseBudget(budgetText);
    const href = firstAttr(card, SELECTORS.title, 'href');
    const url = toAbsoluteUrl(href, 'https://br.indeed.com');

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
}

/**
 * Pure parser for Indeed jobs search HTML.
 * First tries JSON-LD (more stable), then falls back to CSS selectors.
 * Never throws; on any parsing issue returns [] or defaulted fields.
 *
 * @param {string} html
 * @returns {Array<{title: string, description: string, skills: string[], budget: {min:number,max:number,currency:string}|null, url: string, postedAt: string}>}
 */
function parseIndeed(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ''), 'text/html');

    const fromJsonLd = collectJsonLdJobPostings(doc);
    if (fromJsonLd.length) {
      return fromJsonLd.map((job) => ({
        title: job.title || '',
        description: job.description || '',
        skills: Array.isArray(job.skills) ? job.skills : [],
        budget: job.budget || null,
        url: job.url || '',
        postedAt: job.postedAt || '',
      }));
    }

    return parseViaCss(doc);
  } catch {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseIndeed, SELECTORS };
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseIndeed = parseIndeed;
  globalThis.INDEED_SELECTORS = SELECTORS;
}
