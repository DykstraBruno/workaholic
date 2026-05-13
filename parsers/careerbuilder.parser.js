(function () {
'use strict';

// CareerBuilder.com uses multiple possible layouts:
// 1. Modern: article.job-listing, div[data-job-id], div.job-card
// 2. Legacy: tr.job-result (table layout)
// 3. JSON-LD structured data in script tags
const SELECTORS = {
  card: [
    'article.job-listing',
    'div[data-job-id]',
    'div.job-card',
    'div[class*="job-result"]',
    'tr.job-result',
    'li[data-job-id]',
  ],
  title: [
    'h2 a',
    'a.job-title',
    'a[data-job-title]',
    'a.job-result-title',
    '[class*="job-title"] a',
    'h3 a',
  ],
  company: [
    '[class*="company"]',
    '[data-company]',
    'span.company',
    'div.company-name',
  ],
  location: [
    '[class*="location"]',
    '[data-location]',
    'span.location',
    'div.job-location',
  ],
  description: [],
  skills: [],
  budget: [],
  postedAt: [
    '[class*="posted"]',
    '[class*="date"]',
    'time',
  ],
};

function toAbsoluteUrl(url, base) {
  if (!url) return '';
  try {
    return new URL(url, base).href;
  } catch {
    return '';
  }
}

function findElement(parent, selectors) {
  for (const selector of selectors) {
    const el = parent.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function extractFromJsonLd(doc) {
  const jobs = [];
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        if (item['@type'] === 'JobPosting') {
          const url = item.url || item.identifier?.url || '';
          if (!url) continue;
          
          jobs.push({
            title: item.title || '',
            description: [item.hiringOrganization?.name, item.jobLocation?.address?.addressLocality]
              .filter(Boolean).join(' — '),
            skills: [],
            budget: item.baseSalary?.value?.value || null,
            url: toAbsoluteUrl(url, 'https://www.careerbuilder.com'),
            postedAt: item.datePosted || '',
          });
        }
      }
    } catch {
      continue;
    }
  }
  
  return jobs;
}

/**
 * Pure parser for CareerBuilder job HTML.
 * Handles multiple layout variations and JSON-LD structured data.
 *
 * @param {string} html
 * @returns {Array<{title: string, description: string, skills: string[], budget: null, url: string, postedAt: string}>}
 */
function parseCareerBuilder(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ''), 'text/html');
    const BASE = 'https://www.careerbuilder.com';

    // Try JSON-LD first (most reliable)
    const jsonJobs = extractFromJsonLd(doc);
    if (jsonJobs.length > 0) return jsonJobs;

    const jobs = [];

    // Try each card selector
    for (const cardSelector of SELECTORS.card) {
      const cards = doc.querySelectorAll(cardSelector);
      if (!cards.length) continue;

      for (const card of cards) {
        // Find title link
        const titleEl = findElement(card, SELECTORS.title);
        if (!titleEl) continue;

        const title = (titleEl.textContent || '').trim();
        if (!title) continue;

        const rawHref = (titleEl.getAttribute('href') || '').trim();
        const url = toAbsoluteUrl(rawHref, BASE);
        if (!url) continue;

        // Extract company and location
        const companyEl = findElement(card, SELECTORS.company);
        const locationEl = findElement(card, SELECTORS.location);
        const postedEl = findElement(card, SELECTORS.postedAt);

        const company = companyEl ? (companyEl.textContent || '').trim() : '';
        const location = locationEl ? (locationEl.textContent || '').trim() : '';
        const postedAt = postedEl ? (postedEl.textContent || postedEl.getAttribute('datetime') || '').trim() : '';

        const description = [company, location].filter(Boolean).join(' — ');

        jobs.push({
          title,
          description,
          skills: [],
          budget: null,
          url,
          postedAt,
        });
      }

      // If we found jobs with this selector, return them
      if (jobs.length > 0) break;
    }

    return jobs;
  } catch {
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseCareerBuilder, SELECTORS };
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseCareerBuilder = parseCareerBuilder;
  globalThis.CAREERBUILDER_SELECTORS = SELECTORS;
}

})();
