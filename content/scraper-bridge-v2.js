'use strict';

(() => {
	if (globalThis.__WORKAHOLIC_BRIDGE_READY_V2) {
		return;
	}

	globalThis.__WORKAHOLIC_BRIDGE_READY_V2 = true;

	function getSiteConfig(site) {
		return {
			freelas99: {
				parse: () => globalThis.parseFreelas99,
				selectors: () => globalThis.FREELAS99_SELECTORS,
			},
			gupy: {
				parse: () => globalThis.parseGupy,
				selectors: () => globalThis.GUPY_SELECTORS,
			},
			indeed: {
				parse: () => globalThis.parseIndeed,
				selectors: () => globalThis.INDEED_SELECTORS,
			},
			linkedin: {
				parse: () => globalThis.parseLinkedIn,
				selectors: () => globalThis.LINKEDIN_SELECTORS,
			},
			upwork: {
				parse: () => globalThis.parseUpwork,
				selectors: () => globalThis.UPWORK_SELECTORS,
			},
			workana: {
				parse: () => globalThis.parseWorkana,
				selectors: () => globalThis.WORKANA_SELECTORS,
			},
		}[site] || null;
	}

	function cardCountFor(site) {
		const selectors = getSiteConfig(site)?.selectors?.()?.card || [];
		if (!Array.isArray(selectors) || !selectors.length) return 0;

		const seen = new Set();
		for (const selector of selectors) {
			const nodes = document.querySelectorAll(selector);
			for (const node of nodes) {
				seen.add(node);
			}
		}
		return seen.size;
	}

	function waitForCards(site, timeoutMs = 15000) {
		return new Promise((resolve) => {
			if (cardCountFor(site) > 0) {
				resolve();
				return;
			}

			const observer = new MutationObserver(() => {
				if (cardCountFor(site) > 0) {
					observer.disconnect();
					clearTimeout(timeoutId);
					resolve();
				}
			});

			observer.observe(document.documentElement, {
				childList: true,
				subtree: true,
			});

			const timeoutId = setTimeout(() => {
				observer.disconnect();
				resolve();
			}, timeoutMs);
		});
	}

	async function collectJobs(site) {
		const parse = getSiteConfig(site)?.parse?.();
		if (typeof parse !== 'function') {
			console.warn(`[Content Script] Parser indisponivel para ${site}`);
			return [];
		}

		await waitForCards(site);
		const html = document.documentElement.outerHTML;
		const jobs = parse(html);
		return Array.isArray(jobs) ? jobs : [];
	}

	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message?.type !== 'SCRAPE_SITE') {
			return;
		}

		const { site } = message;

		(async () => {
			try {
				const jobs = await collectJobs(site);
				chrome.runtime.sendMessage({ site, jobs });
			} catch (err) {
				console.error(`[Content Script] Falha ao coletar ${site}:`, err);
				chrome.runtime.sendMessage({ site, jobs: [] });
			}
		})();

		sendResponse({ ok: true });
		return true;
	});
})();