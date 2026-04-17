'use strict';

const VALID_SITES = ['upwork', 'workana', 'freelas99', 'linkedin', 'indeed', 'gupy'];

/**
 * Deterministic djb2-based hash over an arbitrary string.
 * Returns a hex string — no external dependencies required.
 * @param {string} str
 * @returns {string}
 */
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 33) ^ str.charCodeAt(i);
  }
  // >>> 0 converts to unsigned 32-bit, then toString(16) gives hex
  return (h >>> 0).toString(16);
}

/**
 * Builds a stable, unique id for a job listing.
 * @param {string} site
 * @param {string} title
 * @param {string} url
 * @returns {string}
 */
function buildId(site, title, url) {
  return hashString(`${site}::${title}::${url}`);
}

/**
 * Coerces a value to an ISO date string.
 * Returns null when the value is absent or unparseable.
 * @param {*} value
 * @returns {string|null}
 */
function toISODate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Normalises budget from several possible raw shapes:
 *   { min, max, currency }  →  kept as-is (parsed to numbers)
 *   number / numeric string →  { min: v, max: v, currency: 'USD' }
 *   anything else           →  null
 * @param {*} raw
 * @returns {{ min: number, max: number, currency: string }|null}
 */
function normalizeBudget(raw) {
  if (raw == null) return null;

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const min = parseFloat(raw.min) || 0;
    const max = parseFloat(raw.max) || 0;
    if (min === 0 && max === 0) return null;
    return {
      min,
      max,
      currency: typeof raw.currency === 'string' ? raw.currency.toUpperCase() : 'USD',
    };
  }

  const value = parseFloat(raw);
  if (isNaN(value) || value <= 0) return null;
  return { min: value, max: value, currency: 'USD' };
}

/**
 * Normalises a skills value:
 *   string[]  →  trimmed, lowercased, deduped
 *   anything else / absent  →  []
 * @param {*} raw
 * @returns {string[]}
 */
function normalizeSkills(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const seen = new Set();
  const result = [];
  for (const s of raw) {
    const clean = String(s).toLowerCase().trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
  }
  return result;
}

/**
 * Receives raw data from any scraper and returns a job in the standard schema.
 *
 * @param {Object} raw
 * @param {'upwork'|'workana'|'freelas99'|'linkedin'|'indeed'|'gupy'} site
 * @returns {{
 *   id: string,
 *   title: string,
 *   description: string,
 *   skills: string[],
 *   budget: { min: number, max: number, currency: string }|null,
 *   deadline: string|null,
 *   site: string,
 *   url: string,
 *   postedAt: string,
 *   seenAt: string
 * }}
 */
function normalize(raw, site) {
  if (!VALID_SITES.includes(site)) {
    throw new Error(
      `normalize: unknown site "${site}". Valid sites: ${VALID_SITES.join(', ')}`
    );
  }

  const title = String(raw.title || '').trim();
  const url = String(raw.url || '').trim();
  const description = String(raw.description || raw.body || raw.content || '').trim();

  const postedAt = toISODate(raw.postedAt || raw.posted_at || raw.date) ?? new Date().toISOString();

  return {
    id: buildId(site, title, url),
    title,
    description,
    skills: normalizeSkills(raw.skills),
    budget: normalizeBudget(raw.budget),
    deadline: toISODate(raw.deadline),
    site,
    url,
    postedAt,
    seenAt: new Date().toISOString(),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalize };
}

if (typeof globalThis !== 'undefined') {
  globalThis.normalize = normalize;
}
