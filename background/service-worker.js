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
const DEFAULT_FETCH_INTERVAL_MINUTES = 1;

const SITE_URLS = {
	upwork: 'https://www.upwork.com/nx/search/jobs',
	workana: 'https://www.workana.com/jobs',
	freelas99: 'https://www.99freelas.com.br/projects',
	linkedin: 'https://www.linkedin.com/jobs/search',
	indeed: 'https://br.indeed.com/jobs',
	gupy: 'https://www.gupy.io/vagas-emprego',
};

const SCRAPER_PATHS = {
	upwork: 'scrapers/upwork.js',
	workana: 'scrapers/workana.js',
	freelas99: 'scrapers/freelas99.js',
	linkedin: 'scrapers/linkedin.js',
	indeed: 'scrapers/indeed.js',
	gupy: 'scrapers/gupy.js',
};

const SITE_LABELS = {
	upwork: 'Upwork',
	workana: 'Workana',
	freelas99: '99Freelas',
	linkedin: 'LinkedIn',
	indeed: 'Indeed',
	gupy: 'Gupy',
};

// ---------------------------------------------------------------------------
// Low-level storage helper (local)
// ---------------------------------------------------------------------------

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
// Tab + script helpers
// ---------------------------------------------------------------------------

function waitForTabLoad(tabId, timeoutMs) {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			chrome.tabs.onUpdated.removeListener(listener);
			reject(new Error(`Tab load timeout: ${tabId}`));
		}, timeoutMs);

		function listener(updatedTabId, changeInfo) {
			if (updatedTabId === tabId && changeInfo.status === 'complete') {
				clearTimeout(timeout);
				chrome.tabs.onUpdated.removeListener(listener);
				resolve();
			}
		}

		chrome.tabs.onUpdated.addListener(listener);
	});
}

function createWorkerTab() {
	return new Promise((resolve, reject) => {
		chrome.tabs.create({ url: 'about:blank', active: false, pinned: true }, (tab) => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}
			resolve(tab);
		});
	});
}

function navigateTabAndWaitForLoad(tabId, url) {
	return new Promise((resolve, reject) => {
		chrome.tabs.update(tabId, { url }, (tab) => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}

			waitForTabLoad(tab.id, SCRAPER_TIMEOUT_MS)
				.then(resolve)
				.catch(reject);
		});
	});
}

function closeTabQuietly(tabId) {
	return new Promise((resolve) => {
		chrome.tabs.remove(tabId, () => {
			// Consume runtime.lastError to avoid noisy "No tab with id" warnings
			// when the tab was already closed by the browser/user.
			if (chrome.runtime.lastError) {
				resolve();
				return;
			}
			resolve();
		});
	});
}

function injectScraperAndCollect(tabId, scraperPath) {
	return new Promise((resolve, reject) => {
		let settled = false;

		const timeout = setTimeout(() => {
			if (settled) return;
			settled = true;
			chrome.runtime.onMessage.removeListener(messageListener);
			reject(new Error(`Scraper timeout in tab ${tabId}`));
		}, SCRAPER_TIMEOUT_MS);

		function messageListener(message, sender) {
			if (settled) return;
			if (!sender.tab || sender.tab.id !== tabId) return;
			if (!message || !Array.isArray(message.jobs)) return;

			settled = true;
			clearTimeout(timeout);
			chrome.runtime.onMessage.removeListener(messageListener);
			resolve(message.jobs);
		}

		chrome.runtime.onMessage.addListener(messageListener);

		chrome.scripting.executeScript(
			{
				target: { tabId },
				files: [
					`parsers/${scraperPath.split('/').pop().replace('.js', '.parser.js')}`,
					scraperPath,
				],
			},
			() => {
				if (chrome.runtime.lastError && !settled) {
					settled = true;
					clearTimeout(timeout);
					chrome.runtime.onMessage.removeListener(messageListener);
					reject(new Error(chrome.runtime.lastError.message));
				}
			},
		);
	});
}

// ---------------------------------------------------------------------------
// Per-site execution
// ---------------------------------------------------------------------------

async function scrapeSiteInTab(tabId, site) {
	try {
		await navigateTabAndWaitForLoad(tabId, SITE_URLS[site]);
		const jobs = await injectScraperAndCollect(tabId, SCRAPER_PATHS[site]);
		return { site, jobs, failed: false };
	} catch {
		return { site, jobs: [], failed: true };
	}
}

// ---------------------------------------------------------------------------
// Notifications + badge
// ---------------------------------------------------------------------------

function notifyJob(job) {
	chrome.notifications.create(`job-${job.id}`, {
		type: 'basic',
		iconUrl: 'icons/icon128.png',
		title: job.title || 'New job match',
		message: `${SITE_LABELS[job.site] || job.site} - ${Math.round(job.score || 0)}% match`,
	});
}

function notifyHealth(site, failures) {
	chrome.notifications.create(`health-${site}`, {
		type: 'basic',
		iconUrl: 'icons/icon128.png',
		title: 'Scraper health warning',
		message: `${SITE_LABELS[site] || site} scraper may be broken (${failures} consecutive failures).`,
	});
}

function setBadge(newJobsCount) {
	const text = newJobsCount > 0 ? String(newJobsCount) : '';
	chrome.action.setBadgeText({ text });
	chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
}

// ---------------------------------------------------------------------------
// Health status
// ---------------------------------------------------------------------------

async function updateSiteHealth(site, hasTechnicalFailure, resultsCount) {
	const current = await getHealthStatus(site);
	const failures = current.consecutiveFailures || 0;
	const nowIso = new Date().toISOString();

	// A successful technical scrape means the scraper is alive,
	// even when no jobs are currently available.
	if (!hasTechnicalFailure) {
		await saveHealthStatus(site, {
			consecutiveFailures: 0,
			lastSuccess: resultsCount > 0 ? nowIso : (current.lastSuccess || nowIso),
		});
		return;
	}

	const nextFailures = failures + 1;
	await saveHealthStatus(site, {
		consecutiveFailures: nextFailures,
		lastSuccess: current.lastSuccess || null,
	});

	if (nextFailures >= 3) {
		notifyHealth(site, nextFailures);
	}
}

// ---------------------------------------------------------------------------
// Fetch cycle
// ---------------------------------------------------------------------------

async function runFetchCycle() {
	const profile = await getProfile();
	if (!profile) return { ok: true, jobs: [] };

	const enabledSites = Object.entries(profile.sites || {})
		.filter(([, enabled]) => enabled)
		.map(([site]) => site);

	if (!enabledSites.length) {
		await saveJobs([]);
		setBadge(0);
		await localSet({ lastFetch: new Date().toISOString() });
		return { ok: true, jobs: [] };
	}

	const perSiteResults = [];
	let workerTab = null;

	try {
		workerTab = await createWorkerTab();

		for (const site of enabledSites) {
			const result = await scrapeSiteInTab(workerTab.id, site);
			perSiteResults.push(result);
		}
	} finally {
		if (workerTab && workerTab.id != null) {
			await closeTabQuietly(workerTab.id);
		}
	}

	const normalized = [];
	for (const result of perSiteResults) {
		const rawJobs = Array.isArray(result.jobs) ? result.jobs : [];

		for (const raw of rawJobs) {
			try {
				normalized.push(normalize(raw, result.site));
			} catch {
				// Ignore malformed job payload from a scraper.
			}
		}

		await updateSiteHealth(result.site, result.failed, rawJobs.length);
	}

	const filtered = filterJobs(normalized, profile);

	let newJobsCount = 0;
	for (const job of filtered) {
		if (job.score < 40) continue;

		const seen = await hasBeenSeen(job.id);
		if (seen) continue;

		notifyJob(job);
		await markAsSeen(job.id);
		newJobsCount++;
	}

	await saveJobs(filtered);
	await localSet({ lastFetch: new Date().toISOString() });
	setBadge(newJobsCount);

	return { ok: true, jobs: filtered };
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
	const profile = await getProfile();
	const interval = profile?.fetchInterval || DEFAULT_FETCH_INTERVAL_MINUTES;
	setupAlarm(interval);
});

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name !== ALARM_NAME) return;
	runFetchCycle().catch(() => {});
});

chrome.storage.onChanged.addListener((changes, areaName) => {
	if (areaName !== 'sync') return;
	if (!changes.profile) return;

	const oldInterval = changes.profile.oldValue?.fetchInterval || DEFAULT_FETCH_INTERVAL_MINUTES;
	const newInterval = changes.profile.newValue?.fetchInterval || DEFAULT_FETCH_INTERVAL_MINUTES;

	if (oldInterval !== newInterval) {
		setupAlarm(newInterval);
	}
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (!message || !message.type) return;

	if (message.type === 'FETCH_NOW') {
		runFetchCycle()
			.then((result) => sendResponse({ ok: true, result }))
			.catch((error) => sendResponse({ ok: false, error: error.message }));
		return true;
	}

	if (message.type === 'GET_JOBS') {
		getJobs()
			.then((jobs) => sendResponse({ ok: true, jobs }))
			.catch((error) => sendResponse({ ok: false, error: error.message }));
		return true;
	}

	if (message.type === 'GET_HEALTH') {
		const sites = ['upwork', 'workana', 'freelas99', 'linkedin', 'indeed', 'gupy'];

		Promise.all(sites.map(async (site) => ({ site, status: await getHealthStatus(site) })))
			.then((entries) => {
				const health = Object.fromEntries(entries.map((item) => [item.site, item.status]));
				sendResponse({ ok: true, health });
			})
			.catch((error) => sendResponse({ ok: false, error: error.message }));

		return true;
	}
});
