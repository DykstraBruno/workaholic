'use strict';

importScripts('../shared/storage.js', '../shared/normalizer.js', '../shared/filter.js');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALARM_NAME = 'fetch-jobs';
const SCRAPER_TIMEOUT_MS = 30_000;
const DEFAULT_FETCH_INTERVAL_MINUTES = 1;
const AUTH_FLOW_KEY = 'authFlow';
const DIAGNOSTICS_KEY = 'lastFetchDiagnostics';

// Persistent lock keys — survive service worker restarts
const LOCK_KEY        = 'fetchCycleLock';   // stores timestamp (ms) when lock was acquired
const LOCK_EXPIRY_MS  = 4 * 60 * 1000;     // 4 min — safely above worst-case cycle duration

const SITE_URLS = {
	upwork: 'https://www.upwork.com/nx/search/jobs',
	workana: 'https://www.workana.com/jobs',
	freelas99: 'https://www.99freelas.com.br/projects',
	linkedin: 'https://www.linkedin.com/jobs/search',
	indeed: 'https://br.indeed.com/jobs?q=desenvolvedor',
	gupy: 'https://portal.gupy.io/job-search',
};

const SUPPORTED_TAB_PATTERNS = [
	'https://www.upwork.com/*',
	'https://www.workana.com/*',
	'https://www.99freelas.com.br/*',
	'https://www.linkedin.com/*',
	'https://br.indeed.com/*',
	'https://www.gupy.io/*',
	'https://portal.gupy.io/*',
];

const SITE_LABELS = {
	upwork: 'Upwork',
	workana: 'Workana',
	freelas99: '99Freelas',
	linkedin: 'LinkedIn',
	indeed: 'Indeed',
	gupy: 'Gupy',
};

const PARSER_FILES = {
	upwork: 'parsers/upwork.parser.js',
	workana: 'parsers/workana.parser.js',
	freelas99: 'parsers/freelas99.parser.js',
	linkedin: 'parsers/linkedin.parser.js',
	indeed: 'parsers/indeed.parser.js',
	gupy: 'parsers/gupy.parser.js',
};

const PARSER_GLOBALS = {
	upwork: 'parseUpwork',
	workana: 'parseWorkana',
	freelas99: 'parseFreelas99',
	linkedin: 'parseLinkedIn',
	indeed: 'parseIndeed',
	gupy: 'parseGupy',
};

const LOGIN_URL_PATTERNS = {
	upwork: [/\/login/i, /account-security/i, /signup/i, /__cf_chl_rt_tk/i, /\/cdn-cgi\/challenge-platform/i],
	workana: [/\/login/i, /\/signin/i, /\/account/i],
	freelas99: [/\/login/i, /\/entrar/i],
	linkedin: [/\/login/i, /checkpoint/i, /signup/i],
	indeed: [/\/account\/login/i, /\/auth/i, /\/signin/i],
	gupy: [/\/login/i, /\/entrar/i, /\/candidate-login/i, /\/candidates\//i],
};

const AREA_TO_SEARCH_TERM = {
	development: 'desenvolvedor',
	design: 'designer',
	marketing: 'marketing',
	writing: 'redator',
	data: 'dados',
	mobile: 'desenvolvedor mobile',
};

// Maps profile area to 99Freelas ?categoria= slug
const FREELAS99_AREA_TO_CATEGORY = {
	development: 'web-mobile-e-software',
	mobile:      'web-mobile-e-software',
	data:        'web-mobile-e-software',
	design:      'design-e-criacao',
	marketing:   'vendas-e-marketing',
	writing:     'escrita',
};

function createDefaultProfile() {
	return {
		skills: [],
		area: 'development',
		minBudget: null,
		currency: 'BRL',
		languages: ['pt', 'en'],
		blacklist: [],
		sites: Object.fromEntries(Object.keys(SITE_URLS).map((site) => [site, true])),
		fetchInterval: DEFAULT_FETCH_INTERVAL_MINUTES,
	};
}

function getSiteUrl(site) {
	return new URL(SITE_URLS[site]);
}

function getProfileSearchTerms(profile) {
	const terms = [];
	if (Array.isArray(profile?.keywords)) {
		for (const raw of profile.keywords) {
			const value = String(raw || '').trim();
			if (value) terms.push(value);
		}
	}
	if (terms.length) return terms;

	const area = String(profile?.area || '').trim().toLowerCase();
	const fallback = AREA_TO_SEARCH_TERM[area] || area || '';
	return [fallback];
}

function getProfileSearchTerm(profile) {
	return getProfileSearchTerms(profile)[0] || '';
}

function buildSiteSearchUrl(site, term, profile) {
	const url = new URL(SITE_URLS[site]);

	if (!term) {
		if (site === 'gupy') {
			url.pathname = '/job-search/sortBy=publishedDate';
		}
		if (site === 'freelas99') {
			const area = String(profile?.area || 'development').toLowerCase();
			const category = FREELAS99_AREA_TO_CATEGORY[area] || 'web-mobile-e-software';
			url.searchParams.set('categoria', category);
		}
		return url.toString();
	}

	switch (site) {
		case 'upwork':
			url.searchParams.set('q', term);
			break;
		case 'workana':
			url.searchParams.set('query', term);
			break;
		case 'freelas99': {
			const area = String(profile?.area || 'development').toLowerCase();
			const category = FREELAS99_AREA_TO_CATEGORY[area] || 'web-mobile-e-software';
			url.searchParams.set('categoria', category);
			url.searchParams.set('q', term);
			break;
		}
		case 'linkedin':
			url.searchParams.set('keywords', term);
			break;
		case 'indeed':
			url.searchParams.set('q', term);
			break;
		case 'gupy':
			url.pathname = `/job-search/term=${encodeURIComponent(term)}`;
			break;
		default:
			break;
	}

	return url.toString();
}

function getSiteLabel(site) {
	return SITE_LABELS[site] || site;
}

function isTargetPageUrl(site, rawUrl) {
	if (!rawUrl) return false;

	try {
		const current = new URL(rawUrl);
		const target = getSiteUrl(site);
		return current.host === target.host && current.pathname.startsWith(target.pathname);
	} catch {
		return false;
	}
}

function isKnownLoginUrl(site, rawUrl) {
	if (!rawUrl) return false;

	const patterns = LOGIN_URL_PATTERNS[site] || [];
	return patterns.some((pattern) => pattern.test(rawUrl));
}

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

function getTab(tabId) {
	return new Promise((resolve, reject) => {
		chrome.tabs.get(tabId, (tab) => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}
			resolve(tab);
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

function createInteractiveTab(url) {
	return new Promise((resolve, reject) => {
		chrome.tabs.create({ url, active: true }, (tab) => {
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
		let settled = false;
		let navigationStarted = false;

		const timeout = setTimeout(() => {
			finish(new Error(`Tab load timeout: ${tabId}`));
		}, SCRAPER_TIMEOUT_MS);

		function cleanup() {
			clearTimeout(timeout);
			chrome.tabs.onUpdated.removeListener(listener);
		}

		function finish(error) {
			if (settled) return;
			settled = true;
			cleanup();
			if (error) reject(error);
			else resolve();
		}

		function isReady(tab, changeInfo) {
			const currentUrl = tab?.pendingUrl || tab?.url || '';
			const isLoaded = changeInfo?.status === 'complete' || tab?.status === 'complete';

			if (!navigationStarted || !isLoaded) return false;
			if (!currentUrl || currentUrl === 'about:blank') return false;

			return true;
		}

		function listener(updatedTabId, changeInfo, tab) {
			if (updatedTabId !== tabId) return;

			if (changeInfo.url || changeInfo.status === 'loading') {
				navigationStarted = true;
			}

			if (isReady(tab, changeInfo)) {
				finish();
			}
		}

		// Register before the update to avoid missing very fast loads.
		chrome.tabs.onUpdated.addListener(listener);

		chrome.tabs.update(tabId, { url }, (tab) => {
			if (chrome.runtime.lastError) {
				finish(new Error(chrome.runtime.lastError.message));
				return;
			}

			navigationStarted = true;

			if (isReady(tab, { status: tab?.status })) {
				finish();
			}
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

function queryTabs(queryInfo) {
	return new Promise((resolve, reject) => {
		chrome.tabs.query(queryInfo, (tabs) => {
			if (chrome.runtime.lastError) {
				reject(new Error(chrome.runtime.lastError.message));
				return;
			}
			resolve(tabs);
		});
	});
}

async function reloadSupportedTabs() {
	let tabs = [];

	try {
		tabs = await queryTabs({ url: SUPPORTED_TAB_PATTERNS });
	} catch {
		return;
	}

	for (const tab of tabs) {
		if (!tab?.id) continue;
		try {
			chrome.tabs.reload(tab.id);
		} catch {
			// Ignore tabs that disappeared during reload.
		}
	}
}

async function getAuthFlow() {
	const result = await localGet(AUTH_FLOW_KEY);
	return result[AUTH_FLOW_KEY] ?? null;
}

async function setAuthFlow(flow) {
	await localSet({ [AUTH_FLOW_KEY]: flow });
}

async function clearAuthFlow() {
	await setAuthFlow(null);
}

async function getLiveAuthFlow() {
	const flow = await getAuthFlow();
	if (!flow?.tabId || !flow?.site) return null;

	try {
		await getTab(flow.tabId);
		return flow;
	} catch {
		await clearAuthFlow();
		return null;
	}
}

async function pageLooksLikeLogin(tabId) {
	try {
		const [{ result }] = await chrome.scripting.executeScript({
			target: { tabId },
			func: () => {
				const text = (document.body?.innerText || '').slice(0, 3000).toLowerCase();
				const hasPassword = Boolean(
					document.querySelector('input[type="password"], input[name*="password" i], input[autocomplete="current-password"]')
				);
				const loginHints = /(login|log in|sign in|entrar|acessar|senha|password|continue com)/i.test(text);
				const challengeHints = /(checking your browser|verify you are human|cloudflare|captcha|just a moment)/i.test(text);
				const challengeDom = Boolean(document.querySelector('#challenge-running, .cf-browser-verification, [data-translate="checking_browser"]'));
				return (hasPassword && loginHints) || challengeHints || challengeDom;
			},
		});

		return Boolean(result);
	} catch {
		return false;
	}
}

async function siteRequiresLogin(tabId, site) {
	let tab;

	try {
		tab = await getTab(tabId);
	} catch {
		return false;
	}

	const currentUrl = tab.pendingUrl || tab.url || '';
	if (isKnownLoginUrl(site, currentUrl)) return true;
	if (site === 'upwork' && /__cf_chl_rt_tk|\/cdn-cgi\/challenge-platform/i.test(currentUrl)) return true;
	if (isTargetPageUrl(site, currentUrl)) return false;

	try {
		const current = new URL(currentUrl);
		const target = getSiteUrl(site);
		if (current.host !== target.host) return false;
	} catch {
		return false;
	}

	return pageLooksLikeLogin(tabId);
	}

async function ensureAuthTab(site, profile) {
	const currentFlow = await getLiveAuthFlow();
	if (currentFlow?.site === site) {
		return currentFlow;
	}

	const tab = await createInteractiveTab(buildSiteSearchUrl(site, getProfileSearchTerm(profile), profile));
	const flow = {
		site,
		tabId: tab.id,
		startedAt: Date.now(),
		resumeFetch: true,
	};

	await setAuthFlow(flow);
	return flow;
}

async function ensureScraperBridge(tabId, site) {
	const parserGlobal = PARSER_GLOBALS[site];
	const parserFile = PARSER_FILES[site];

	const [{ result }] = await chrome.scripting.executeScript({
		target: { tabId },
		func: (globalName) => ({
			bridgeReady: Boolean(globalThis.__WORKAHOLIC_BRIDGE_READY_V2),
			parserReady: Boolean(globalThis[globalName]),
		}),
		args: [parserGlobal],
	});

	if (!result?.parserReady) {
		await chrome.scripting.executeScript({
			target: { tabId },
			files: [parserFile],
		});
	}

	if (result?.bridgeReady) return;

	await chrome.scripting.executeScript({
		target: { tabId },
		files: [
			'content/scraper-bridge-v2.js',
		],
	});
}

function injectScraperAndCollect(tabId, site) {
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
			if (message.site !== site) return;

			settled = true;
			clearTimeout(timeout);
			chrome.runtime.onMessage.removeListener(messageListener);
			resolve(message.jobs);
		}

		chrome.runtime.onMessage.addListener(messageListener);

		ensureScraperBridge(tabId, site)
			.then(() => chrome.tabs.sendMessage(
				tabId,
				{
					type: 'SCRAPE_SITE',
					site,
				},
			))
			.catch((err) => {
				if (settled) return;
				settled = true;
				clearTimeout(timeout);
				chrome.runtime.onMessage.removeListener(messageListener);
				reject(new Error(`Failed to inject scraper bridge: ${err.message}`));
			});
	});
}

async function collectJobsDirectlyFromDom(tabId, site) {
	const parserGlobal = PARSER_GLOBALS[site];
	if (!parserGlobal) return [];

	try {
		await ensureScraperBridge(tabId, site);

		const [{ result }] = await chrome.scripting.executeScript({
			target: { tabId },
			func: (globalName) => {
				try {
					const parser = globalThis[globalName];
					if (typeof parser !== 'function') {
						return { ok: false, jobs: [] };
					}

					const html = document.documentElement?.outerHTML || document.body?.innerHTML || '';
					const parsed = parser(html);
					return {
						ok: true,
						jobs: Array.isArray(parsed) ? parsed : [],
					};
				} catch {
					return { ok: false, jobs: [] };
				}
			},
			args: [parserGlobal],
		});

		return Array.isArray(result?.jobs) ? result.jobs : [];
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// Per-site execution
// ---------------------------------------------------------------------------

async function scrapeSiteForTerm(tabId, site, term, profile) {
	try {
		await navigateTabAndWaitForLoad(tabId, buildSiteSearchUrl(site, term, profile));
		if (await siteRequiresLogin(tabId, site)) {
			return { jobs: [], loginRequired: true, failed: false };
		}

		try {
			const jobs = await injectScraperAndCollect(tabId, site);
			return { jobs, loginRequired: false, failed: false };
		} catch {
			const fallbackJobs = await collectJobsDirectlyFromDom(tabId, site);
			return { jobs: fallbackJobs, loginRequired: false, failed: fallbackJobs.length === 0 };
		}
	} catch {
		const loginRequired = await siteRequiresLogin(tabId, site).catch(() => false);
		if (loginRequired) {
			return { jobs: [], loginRequired: true, failed: false };
		}
		const fallbackJobs = await collectJobsDirectlyFromDom(tabId, site);
		return { jobs: fallbackJobs, loginRequired: false, failed: fallbackJobs.length === 0 };
	}
}

async function scrapeSiteInTab(tabId, site, profile) {
	const terms = getProfileSearchTerms(profile);
	const merged = [];
	const seenUrls = new Set();
	const seenTitles = new Set();
	let failed = false;

	for (const term of terms) {
		const result = await scrapeSiteForTerm(tabId, site, term, profile);
		failed = failed || Boolean(result.failed);

		if (result.loginRequired) {
			// Login blocks all subsequent searches for this site this cycle.
			return { site, jobs: [], failed: false, loginRequired: true };
		}

		for (const job of result.jobs || []) {
			const urlKey = canonicalizeJobUrl(job?.url || '');
			const titleKey = canonicalizeJobTitle(job?.title || '');
			if (urlKey && seenUrls.has(urlKey)) continue;
			if (titleKey && seenTitles.has(titleKey)) continue;
			if (urlKey) seenUrls.add(urlKey);
			if (titleKey) seenTitles.add(titleKey);
			merged.push(job);
		}
	}

	return { site, jobs: merged, failed, loginRequired: false };
}

// ---------------------------------------------------------------------------
// Notifications + badge
// ---------------------------------------------------------------------------

async function createNotificationSafe(notificationId, options) {
	const iconUrl = chrome.runtime.getURL('icons/icon128.png');

	try {
		await chrome.notifications.create(notificationId, {
			iconUrl,
			...options,
		});
	} catch (error) {
		// Avoid unhandled promise rejections from image download failures.
		console.warn('Notification skipped:', notificationId, error?.message || error);
	}
}

function notifyJob(job) {
	void createNotificationSafe(`job-${job.id}`, {
		type: 'basic',
		title: job.title || 'New job match',
		message: `${SITE_LABELS[job.site] || job.site} - ${Math.round(job.score || 0)}% match`,
	});
}

function notifyHealth(site, failures) {
	void createNotificationSafe(`health-${site}`, {
		type: 'basic',
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
// Persistent lock + orphaned-tab cleanup
// ---------------------------------------------------------------------------

async function acquireLock() {
	const result = await localGet(LOCK_KEY);
	const lockedAt = result[LOCK_KEY];

	// Lock is valid (held by a live cycle) — reject.
	if (lockedAt && Date.now() - lockedAt < LOCK_EXPIRY_MS) return false;

	// Lock expired or never set — the previous cycle's SW was killed.
	// Close any tab it left open before we start a new cycle.
	const tabResult = await localGet('workerTabId');
	if (tabResult.workerTabId != null) {
		await closeTabQuietly(tabResult.workerTabId);
		await localSet({ workerTabId: null });
	}

	await localSet({ [LOCK_KEY]: Date.now() });
	return true;
}

async function releaseLock() {
	await localSet({ [LOCK_KEY]: null, workerTabId: null });
}

function createSiteDiagnostics(enabledSites) {
	return Object.fromEntries(enabledSites.map((site) => [site, {
		site,
		label: getSiteLabel(site),
		rawJobs: 0,
		normalizedJobs: 0,
		matchedJobs: 0,
		failed: false,
		loginRequired: false,
	}]));
}

async function saveDiagnostics(diagnostics) {
	await localSet({ [DIAGNOSTICS_KEY]: diagnostics });
}

function canonicalizeJobUrl(rawUrl) {
	const value = String(rawUrl || '').trim();
	if (!value) return '';

	try {
		const u = new URL(value);
		u.hash = '';
		u.search = '';
		u.pathname = u.pathname.replace(/\/+$/, '');
		return u.toString();
	} catch {
		return value.split('#')[0].split('?')[0].replace(/\/+$/, '');
	}
}

function canonicalizeJobTitle(rawTitle) {
	return String(rawTitle || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s|()-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function dedupeJobs(jobs) {
	const seenByUrl = new Set();
	const seenByTitle = new Set();
	const out = [];

	for (const job of jobs || []) {
		const siteKey = String(job?.site || '').trim().toLowerCase();
		const urlKey = canonicalizeJobUrl(job?.url || '');
		const titleKey = canonicalizeJobTitle(job?.title || '');
		const titleFingerprint = titleKey ? `${siteKey}::${titleKey}` : '';
		const urlFingerprint = urlKey ? `${siteKey}::${urlKey}` : '';

		if (urlFingerprint && seenByUrl.has(urlFingerprint)) continue;
		if (titleFingerprint && seenByTitle.has(titleFingerprint)) continue;

		if (urlFingerprint) seenByUrl.add(urlFingerprint);
		if (titleFingerprint) seenByTitle.add(titleFingerprint);
		out.push(job);
	}

	return out;
}

// ---------------------------------------------------------------------------
// Fetch cycle
// ---------------------------------------------------------------------------

async function runFetchCycle() {
	const acquired = await acquireLock();
	if (!acquired) return { ok: false, error: 'already running' };

	let profile = await getProfile();
	if (!profile) {
		profile = createDefaultProfile();
		await saveProfile(profile);
	}

	const activeAuthFlow = await getLiveAuthFlow();
	if (activeAuthFlow) {
		await releaseLock();
		return {
			ok: true,
			jobs: await getJobs(),
			auth: {
				required: true,
				pending: true,
				site: activeAuthFlow.site,
				label: getSiteLabel(activeAuthFlow.site),
			},
		};
	}

	const enabledSites = Object.entries(profile.sites || {})
		.filter(([, enabled]) => enabled)
		.map(([site]) => site);

	if (!enabledSites.length) {
		await saveJobs([]);
		setBadge(0);
		await localSet({ lastFetch: new Date().toISOString() });
		await saveDiagnostics({
			generatedAt: new Date().toISOString(),
			enabledSites: [],
			profile: {
				skillsCount: profile.skills?.length || 0,
				blacklistCount: profile.blacklist?.length || 0,
				minBudget: profile.minBudget ?? null,
			},
			totals: { rawJobs: 0, normalizedJobs: 0, matchedJobs: 0 },
			sites: [],
		});
		await releaseLock();
		return { ok: true, jobs: [] };
	}

	const siteDiagnostics = createSiteDiagnostics(enabledSites);
	const perSiteResults = [];
	let workerTab = null;

	try {
		workerTab = await createWorkerTab();
		await localSet({ workerTabId: workerTab.id });

		for (const site of enabledSites) {
			const result = await scrapeSiteInTab(workerTab.id, site, profile);
			perSiteResults.push(result);
		}
	} finally {
		if (workerTab && workerTab.id != null) {
			await closeTabQuietly(workerTab.id);
		}
		await releaseLock();
	}

	const normalized = [];
	const loginRequiredSites = [];
	for (const result of perSiteResults) {
		const rawJobs = Array.isArray(result.jobs) ? result.jobs : [];
		const diagnostics = siteDiagnostics[result.site];
		diagnostics.rawJobs = rawJobs.length;
		diagnostics.failed = Boolean(result.failed);
		diagnostics.loginRequired = Boolean(result.loginRequired);

		if (result.loginRequired) {
			loginRequiredSites.push(result.site);
		}

		for (const raw of rawJobs) {
			try {
				normalized.push(normalize(raw, result.site));
				diagnostics.normalizedJobs++;
			} catch {
				// Ignore malformed job payload from a scraper.
			}
		}

		await updateSiteHealth(result.site, result.failed, rawJobs.length);
	}

	const filtered = filterJobs(normalized, profile);
	const dedupedFiltered = dedupeJobs(filtered);
	for (const job of dedupedFiltered) {
		if (siteDiagnostics[job.site]) {
			siteDiagnostics[job.site].matchedJobs++;
		}
	}

	const diagnostics = {
		generatedAt: new Date().toISOString(),
		enabledSites,
		profile: {
			skillsCount: profile.skills?.length || 0,
			blacklistCount: profile.blacklist?.length || 0,
			minBudget: profile.minBudget ?? null,
		},
		totals: {
			rawJobs: Object.values(siteDiagnostics).reduce((sum, site) => sum + site.rawJobs, 0),
			normalizedJobs: Object.values(siteDiagnostics).reduce((sum, site) => sum + site.normalizedJobs, 0),
			matchedJobs: dedupedFiltered.length,
		},
		sites: enabledSites.map((site) => siteDiagnostics[site]),
	};

	let newJobsCount = 0;
	for (const job of dedupedFiltered) {
		if (job.score < 40) continue;

		const seen = await hasBeenSeen(job.id);
		if (seen) continue;

		notifyJob(job);
		await markAsSeen(job.id);
		newJobsCount++;
	}

	await saveJobs(dedupedFiltered);
	await localSet({ lastFetch: new Date().toISOString() });
	await saveDiagnostics(diagnostics);
	setBadge(newJobsCount);

	if (loginRequiredSites.length) {
		const site = loginRequiredSites[0];
		await ensureAuthTab(site, profile);
		return {
			ok: true,
			jobs: dedupedFiltered,
			auth: {
				required: true,
				pending: false,
				site,
				label: getSiteLabel(site),
			},
		};
	}

	return { ok: true, jobs: dedupedFiltered };
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
	let profile = await getProfile();
	if (!profile) {
		profile = createDefaultProfile();
		await saveProfile(profile);
	}
	const interval = profile?.fetchInterval || DEFAULT_FETCH_INTERVAL_MINUTES;
	setupAlarm(interval);
	await reloadSupportedTabs();
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status !== 'complete' && !changeInfo.url) return;

	getLiveAuthFlow()
		.then(async (flow) => {
			if (!flow || flow.tabId !== tabId) return;

			const currentUrl = tab?.pendingUrl || tab?.url || '';
			if (!isTargetPageUrl(flow.site, currentUrl)) return;

			const stillNeedsLogin = await siteRequiresLogin(tabId, flow.site);
			if (stillNeedsLogin) return;

			await clearAuthFlow();
			return runFetchCycle();
		})
		.catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => {
	getAuthFlow()
		.then((flow) => {
			if (!flow || flow.tabId !== tabId) return;
			return clearAuthFlow();
		})
		.catch(() => {});
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
