'use strict';

importScripts(
  '../shared/storage.js',
  '../shared/normalizer.js',
  '../shared/filter.js',
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALARM_NAME = 'fetch-jobs';
const SCRAPER_TIMEOUT_MS = 30_000;

const SITE_URLS = {
  upwork:    'https://www.upwork.com/nx/find-work/',
  workana:   'https://www.workana.com/jobs',
  freelas99: 'https://www.99freelas.com.br/projects',
  linkedin:  'https://www.linkedin.com/jobs/',
  indeed:    'https://br.indeed.com/jobs',
  gupy:      'https://portal.gupy.io/',
};

const SCRAPER_PATHS = {
  upwork:    '../scrapers/upwork.js',
  workana:   '../scrapers/workana.js',
  freelas99: '../scrapers/freelas99.js',
  linkedin:  '../scrapers/linkedin.js',
  indeed:    '../scrapers/indeed.js',
  gupy:      '../scrapers/gupy.js',
};

// ---------------------------------------------------------------------------
// Alarm management
// ---------------------------------------------------------------------------

function setupAlarm(intervalMinutes) {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes,
    });
  });
}

// ---------------------------------------------------------------------------
// Tab helpers
// ---------------------------------------------------------------------------

/**
 * Opens a tab in the background and resolves when it finishes loading.
 * @param {string} url
 * @returns {Promise<chrome.tabs.Tab>}
 */
function openTabAndWaitForLoad(url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      }

      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

/**
 * Injects the scraper content script into a tab and waits for it to send
 * back parsed job data via runtime.sendMessage.
 * Rejects after SCRAPER_TIMEOUT_MS if no message arrives.
 * @param {number} tabId
 * @param {string} scraperPath
 * @returns {Promise<object[]>}
 */
function injectScraperAndCollect(tabId, scraperPath) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(messageListener);
      reject(new Error(`Scraper timeout for tab ${tabId}`));
    }, SCRAPER_TIMEOUT_MS);

    function messageListener(message, sender) {
      if (sender.tab && sender.tab.id === tabId && message.type === 'SCRAPER_RESULTS') {
        clearTimeout(timer);
        chrome.runtime.onMessage.removeListener(messageListener);
        resolve(message.jobs ?? []);
      }
    }

    chrome.runtime.onMessage.addListener(messageListener);

    chrome.scripting.executeScript(
      { target: { tabId }, files: [scraperPath] },
      () => {
        if (chrome.runtime.lastError) {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(messageListener);
          reject(new Error(chrome.runtime.lastError.message));
        }
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Per-site scrape
// ---------------------------------------------------------------------------

/**
 * Scrapes a single site. Always resolves with { site, jobs, error }.
 * @param {string} site
 * @returns {Promise<{ site: string, jobs: object[], error: Error|null }>}
 */
async function scrapeSite(site) {
  let tab = null;
  try {
    tab = await openTabAndWaitForLoad(SITE_URLS[site]);
    const rawJobs = await injectScraperAndCollect(tab.id, SCRAPER_PATHS[site]);
    return { site, jobs: rawJobs, error: null };
  } catch (error) {
    return { site, jobs: [], error };
  } finally {
    if (tab) {
      chrome.tabs.remove(tab.id, () => { /* ignore */ });
    }
  }
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

function setBadge(count) {
  const text = count > 0 ? String(count > 99 ? '99+' : count) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
}

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------

function notifyNewJob(job) {
  const notifId = `job-${job.id}`;
  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: job.title,
    message: `Nova vaga no ${job.site} — ${Math.round(job.score)}% match`,
  });
}

function notifyBrokenScraper(site) {
  chrome.notifications.create(`health-${site}`, {
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: 'Scraper com falhas',
    message: `O scraper do ${site} pode estar quebrado (3+ falhas consecutivas).`,
  });
}

// ---------------------------------------------------------------------------
// Health update
// ---------------------------------------------------------------------------

async function updateHealth(site, succeeded) {
  const current = await getHealthStatus(site);

  if (succeeded) {
    await saveHealthStatus(site, { consecutiveFailures: 0, lastSuccess: new Date().toISOString() });
  } else {
    const failures = (current.consecutiveFailures ?? 0) + 1;
    await saveHealthStatus(site, { consecutiveFailures: failures, lastSuccess: current.lastSuccess ?? null });
    if (failures >= 3) {
      notifyBrokenScraper(site);
    }
  }
}

// ---------------------------------------------------------------------------
// Main fetch cycle
// ---------------------------------------------------------------------------

async function runFetchCycle() {
  const profile = await getProfile();
  if (!profile) return;

  const activeSites = Object.entries(profile.sites ?? {})
    .filter(([, enabled]) => enabled)
    .map(([site]) => site);

  if (!activeSites.length) return;

  // Scrape all active sites; failures are isolated
  const results = await Promise.all(activeSites.map(scrapeSite));

  const allNormalized = [];
  for (const { site, jobs, error } of results) {
    await updateHealth(site, !error && jobs.length > 0);

    for (const raw of jobs) {
      try {
        allNormalized.push(normalize(raw, site));
      } catch {
        // skip malformed entries
      }
    }
  }

  const filtered = filterJobs(allNormalized, profile);

  let newCount = 0;
  for (const job of filtered) {
    if (!(await hasBeenSeen(job.id))) {
      notifyNewJob(job);
      await markAsSeen(job.id);
      newCount++;
    }
  }

  await saveJobs(filtered);
  await localSet({ lastFetch: new Date().toISOString() });
  setBadge(newCount);
}

// Helper: direct access to local storage (storage.js doesn't export localSet)
function localSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
  const profile = await getProfile();
  const interval = profile?.fetchInterval ?? 60;
  setupAlarm(interval);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    runFetchCycle().catch(console.error);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.profile) {
    const newProfile = changes.profile.newValue;
    const oldProfile = changes.profile.oldValue;
    if (newProfile?.fetchInterval !== oldProfile?.fetchInterval) {
      setupAlarm(newProfile.fetchInterval ?? 60);
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_NOW') {
    runFetchCycle()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async response
  }

  if (message.type === 'GET_JOBS') {
    getJobs()
      .then((jobs) => sendResponse({ jobs }))
      .catch((err) => sendResponse({ jobs: [], error: err.message }));
    return true;
  }

  if (message.type === 'GET_HEALTH') {
    const sites = ['upwork', 'workana', 'freelas99', 'linkedin', 'indeed', 'gupy'];
    Promise.all(sites.map(async (s) => [s, await getHealthStatus(s)]))
      .then((entries) => sendResponse({ health: Object.fromEntries(entries) }))
      .catch((err) => sendResponse({ health: {}, error: err.message }));
    return true;
  }
});
