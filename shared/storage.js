'use strict';

const KEYS = {
  PROFILE:       'profile',
  PROFILE_LOCAL: 'profile_local_cache',
  SEEN:          'seen_jobs',
  JOBS:          'jobs',
  HEALTH_PREFIX: 'health_',
};

// Cross-browser API (Firefox: native browser.* or Chrome: webextension-polyfill).
const browserApi = (typeof globalThis !== 'undefined' && globalThis.browser)
  ? globalThis.browser
  : (typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null));

// ---------------------------------------------------------------------------
// Low-level storage wrappers (Promise-based, work in Chrome via polyfill and
// Firefox natively).
// ---------------------------------------------------------------------------

function syncSet(data) {
  return browserApi.storage.sync.set(data);
}

function syncGet(keys) {
  return browserApi.storage.sync.get(keys);
}

function localSet(data) {
  return browserApi.storage.local.set(data);
}

function localGet(keys) {
  return browserApi.storage.local.get(keys);
}

// ---------------------------------------------------------------------------
// Profile  (browser.storage.sync — syncs across devices)
// ---------------------------------------------------------------------------

/**
 * Saves the user profile.
 * @param {Object} profile
 * @returns {Promise<void>}
 */
async function saveProfile(profile) {
  // Keep a local mirror so the extension still works when sync is unavailable.
  await localSet({ [KEYS.PROFILE_LOCAL]: profile });

  try {
    await syncSet({ [KEYS.PROFILE]: profile });
  } catch {
    // Ignore sync failures; local mirror is enough for runtime filtering.
  }
}

/**
 * Returns the user profile, or null if not set.
 * @returns {Promise<Object|null>}
 */
async function getProfile() {
  try {
    const result = await syncGet(KEYS.PROFILE);
    if (result[KEYS.PROFILE]) {
      return result[KEYS.PROFILE];
    }
  } catch {
    // Fall through to local cache.
  }

  const local = await localGet(KEYS.PROFILE_LOCAL);
  return local[KEYS.PROFILE_LOCAL] ?? null;
}

// ---------------------------------------------------------------------------
// Seen jobs  (browser.storage.local)
// ---------------------------------------------------------------------------

/**
 * Marks a job id as seen. Idempotent.
 * @param {string} jobId
 * @returns {Promise<void>}
 */
async function markAsSeen(jobId) {
  const seen = await getSeen();
  if (!seen.includes(jobId)) {
    seen.push(jobId);
    await localSet({ [KEYS.SEEN]: seen });
  }
}

/**
 * Returns true when the job id has already been seen.
 * @param {string} jobId
 * @returns {Promise<boolean>}
 */
async function hasBeenSeen(jobId) {
  const seen = await getSeen();
  return seen.includes(jobId);
}

/**
 * Returns the full array of seen job ids.
 * @returns {Promise<string[]>}
 */
async function getSeen() {
  const result = await localGet(KEYS.SEEN);
  return result[KEYS.SEEN] ?? [];
}

// ---------------------------------------------------------------------------
// Jobs  (browser.storage.local)
// ---------------------------------------------------------------------------

/**
 * Replaces the saved jobs list.
 * @param {Object[]} jobs
 * @returns {Promise<void>}
 */
async function saveJobs(jobs) {
  await localSet({ [KEYS.JOBS]: jobs });
}

/**
 * Returns the saved jobs list, or [] if not set.
 * @returns {Promise<Object[]>}
 */
async function getJobs() {
  const result = await localGet(KEYS.JOBS);
  return result[KEYS.JOBS] ?? [];
}

// ---------------------------------------------------------------------------
// Scraper health  (browser.storage.local)
// ---------------------------------------------------------------------------

/**
 * Saves the health status for a scraper site.
 * @param {string} site
 * @param {{ consecutiveFailures: number, lastSuccess: string|null }} status
 * @returns {Promise<void>}
 */
async function saveHealthStatus(site, status) {
  await localSet({ [`${KEYS.HEALTH_PREFIX}${site}`]: status });
}

/**
 * Returns the health status for a scraper site.
 * Defaults to { consecutiveFailures: 0, lastSuccess: null } when not set.
 * @param {string} site
 * @returns {Promise<{ consecutiveFailures: number, lastSuccess: string|null }>}
 */
async function getHealthStatus(site) {
  const key = `${KEYS.HEALTH_PREFIX}${site}`;
  const result = await localGet(key);
  return result[key] ?? { consecutiveFailures: 0, lastSuccess: null };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveProfile,
    getProfile,
    markAsSeen,
    hasBeenSeen,
    getSeen,
    saveJobs,
    getJobs,
    saveHealthStatus,
    getHealthStatus,
  };
}

if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, {
    saveProfile,
    getProfile,
    markAsSeen,
    hasBeenSeen,
    getSeen,
    saveJobs,
    getJobs,
    saveHealthStatus,
    getHealthStatus,
  });
}
