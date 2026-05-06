(function () {
'use strict';

/**
 * Guru.com field selectors with fallbacks. The parser tries each selector in
 * order and uses the first non-empty match.
 */
const SELECTORS = {
  // Used by waitForCards() to detect when job results are loaded.
  // h2 a[href*="/jobs/"] is the most reliable live-DOM signal on Guru.
  card: [
    'h2 a[href*="/jobs/"]',
    '.record_block',
    '.jResultsItem',
  ],
  title: [
    'h2 a',
    '.jTitle a',
    'h3 a',
  ],
  description: [
    '.jDesc',
    'p',
    '.serviceDescription',
  ],
  skills: [
    'a[href*="/d/jobs/c/"]',
    '.skillTag',
    '.skills li',
  ],
  budget: [
    '.jBudget',
    '.servicePrice',
    '.budget',
  ],
  postedAt: [
    'time[datetime]',
    '.jobAge',
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

function parseBudget(text) {
  if (!text || !text.trim()) return null;

  const numbers = (text.match(/[\d.,]+/g) || [])
    .map((raw) => parseFloat(raw.replace(/\./g, '').replace(',', '.')))
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

/**
 * Pure parser for Guru.com jobs HTML.
 * Receives an HTML string and returns raw job entries.
 * Never throws; on any parsing issue returns [] or defaulted fields.
 *
 * Guru renders each job in 3 separate DOM sections (employer info, job details,
 * skills/tags). Instead of relying on a card-wrapper selector (which changes),
 * this parser finds all h2 job-title links, deduplicates by canonical URL, then
 * merges data from all sections that share the same URL.
 *
 * @param {string} html
 * @returns {Array<{title: string, description: string, skills: string[], budget: {min:number,max:number,currency:string}|null, url: string, postedAt: string}>}
 */
function parseGuru(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ''), 'text/html');

    // Step 1: Find all h2 job links and group containers by canonical URL.
    // Guru job URLs look like /jobs/slug/id&SearchUrl=search.aspx? — strip &SearchUrl.
    const jobMap = new Map(); // canonical href → { title, url, containers[] }

    for (const a of doc.querySelectorAll('h2 a[href*="/jobs/"]')) {
      const rawHref = a.getAttribute('href') || '';
      const cleanHref = rawHref.includes('&') ? rawHref.slice(0, rawHref.indexOf('&')) : rawHref;
      if (!cleanHref || !(/\/jobs\/.+/).test(cleanHref)) continue;

      if (!jobMap.has(cleanHref)) {
        jobMap.set(cleanHref, {
          title: a.textContent.trim(),
          url: toAbsoluteUrl(cleanHref, 'https://www.guru.com'),
          containers: [],
        });
      }

      // Collect the closest div around each occurrence of this job's h2.
      // Each div typically contains a different slice of job data (employer info,
      // description, or skills), so we store all of them for merging.
      const container = a.closest('div') || a.parentElement;
      const entry = jobMap.get(cleanHref);
      if (container && !entry.containers.includes(container)) {
        entry.containers.push(container);
      }
    }

    if (!jobMap.size) return [];

    // Step 2: For each job, merge data from all its section containers.
    const jobs = [];
    for (const [, data] of jobMap) {
      const skills = [];
      let description = '';
      let budgetText = '';
      let postedText = '';

      for (const container of data.containers) {
        // Skills: anchor links pointing to Guru's category/skill paths.
        for (const s of container.querySelectorAll('a[href*="/d/jobs/c/"]')) {
          const t = (s.textContent || '').trim();
          if (t && !skills.includes(t)) skills.push(t);
        }
        if (!description) description = firstText(container, SELECTORS.description);
        if (!budgetText) budgetText = firstText(container, SELECTORS.budget);
        if (!postedText) {
          postedText = firstAttr(container, SELECTORS.postedAt, 'datetime')
            || firstText(container, SELECTORS.postedAt);
        }
      }

      jobs.push({
        title: data.title,
        description,
        skills,
        budget: parseBudget(budgetText) || null,
        url: data.url,
        postedAt: postedText,
      });
    }

    return jobs;
  } catch {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseGuru, SELECTORS };
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseGuru = parseGuru;
  globalThis.GURU_SELECTORS = SELECTORS;
}

})();
