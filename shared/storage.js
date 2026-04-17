'use strict';

const KEYS = {
  PROFILE:       'profile',
  SEEN:          'seen_jobs',
  JOBS:          'jobs',
  HEALTH_PREFIX: 'health_',
};

// ---------------------------------------------------------------------------
// Low-level chrome.storage wrappers
// ---------------------------------------------------------------------------

function syncSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(data, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

function syncGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result);
    });
  });
}

function localSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

function localGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result);
    });
  });
}

// ---------------------------------------------------------------------------
// Profile  (chrome.storage.sync — syncs across devices)
// ---------------------------------------------------------------------------

/**
 * Saves the user profile.
 * @param {Object} profile
 * @returns {Promise<void>}
 */
async function saveProfile(profile) {
  await syncSet({ [KEYS.PROFILE]: profile });
}

/**
 * Returns the user profile, or null if not set.
 * @returns {Promise<Object|null>}
 */
async function getProfile() {
  const result = await syncGet(KEYS.PROFILE);
  return result[KEYS.PROFILE] ?? null;
}

// ---------------------------------------------------------------------------
// Seen jobs  (chrome.storage.local)
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
// Jobs  (chrome.storage.local)
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
// Scraper health  (chrome.storage.local)
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
