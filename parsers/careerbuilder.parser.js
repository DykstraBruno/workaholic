(function () {
'use strict';

// careerbuildercareers.com uses an AngularJS table layout:
//   #job-result-table > tr.job-result
//     td[0]: a.job-result-title (title + link)
//     td[1]: company name
//     td[2]: location
//     td[3]: date posted
// Job URL pattern: /en-US/job/{slug}/{id} (relative or absolute)
const SELECTORS = {
  card: [
    'tr.job-result',
  ],
  title: [
    'a.job-result-title',
  ],
  description: [],
  skills: [],
  budget: [],
  postedAt: [],
};

// Column indices in the tr.job-result table row
const COL = { TITLE: 0, COMPANY: 1, LOCATION: 2, DATE: 3 };

function toAbsoluteUrl(url, base) {
  if (!url) return '';
  try {
    return new URL(url, base).href;
  } catch {
    return '';
  }
}

/**
 * Pure parser for CareerBuilder (careerbuildercareers.com) job HTML.
 * The site uses AngularJS and renders jobs into an #job-result-table
 * with rows of class .job-result. Each row has 4 td columns:
 *   [0] title (a.job-result-title) + link
 *   [1] company name
 *   [2] location
 *   [3] date posted
 *
 * @param {string} html
 * @returns {Array<{title: string, description: string, skills: string[], budget: null, url: string, postedAt: string}>}
 */
function parseCareerBuilder(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ''), 'text/html');

    const rows = doc.querySelectorAll('tr.job-result');
    if (!rows.length) return [];

    const BASE = 'https://www.careerbuildercareers.com';
    const jobs = [];

    for (const row of rows) {
      const tds = row.querySelectorAll('td');
      const titleAnchor = row.querySelector('a.job-result-title');
      if (!titleAnchor) continue;

      const title = (titleAnchor.textContent || '').trim();
      if (!title) continue;

      const rawHref = (titleAnchor.getAttribute('href') || '').trim();
      const url = toAbsoluteUrl(rawHref, BASE);
      if (!url) continue;

      // td[1] = company, td[2] = location, td[3] = date
      const company = tds[COL.COMPANY] ? (tds[COL.COMPANY].textContent || '').trim() : '';
      const location = tds[COL.LOCATION] ? (tds[COL.LOCATION].textContent || '').trim() : '';
      const postedAt = tds[COL.DATE] ? (tds[COL.DATE].textContent || '').trim() : '';

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
