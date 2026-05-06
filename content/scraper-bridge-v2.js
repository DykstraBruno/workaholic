'use strict';

(() => {
	function isExtensionAlive() {
		try { return Boolean(chrome.runtime && chrome.runtime.id); }
		catch { return false; }
	}

	function safeSend(payload) {
		if (!isExtensionAlive()) return;
		try {
			chrome.runtime.sendMessage(payload, () => {
				void chrome.runtime.lastError;
			});
		} catch {
			/* extension reloaded — old context, drop silently */
		}
	}

	if (!isExtensionAlive()) return;

	// Remove any previously registered listener before registering a new one.
	// This makes the bridge safe to re-inject (e.g., after a parser update adds
	// support for a new site that wasn't in the old bridge's getSiteConfig).
	if (typeof globalThis.__WORKAHOLIC_BRIDGE_LISTENER === 'function') {
		try { chrome.runtime.onMessage.removeListener(globalThis.__WORKAHOLIC_BRIDGE_LISTENER); }
		catch { /* runtime gone */ }
		globalThis.__WORKAHOLIC_BRIDGE_LISTENER = null;
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
			freelancer: {
				parse: () => globalThis.parseFreelancer,
				selectors: () => globalThis.FREELANCER_SELECTORS,
			},
			weworkremotely: {
				parse: () => globalThis.parseWeWorkRemotely,
				selectors: () => globalThis.WEWORKREMOTELY_SELECTORS,
			},
			peopleperhour: {
				parse: () => globalThis.parsePeoplePerHour,
				selectors: () => globalThis.PEOPLEPERHOUR_SELECTORS,
			},
			guru: {
				parse: () => globalThis.parseGuru,
				selectors: () => globalThis.GURU_SELECTORS,
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

	const messageHandler = (message, sender, sendResponse) => {
		if (message?.type !== 'SCRAPE_SITE') {
			return;
		}

		const { site } = message;

		(async () => {
			try {
				const jobs = await collectJobs(site);
				safeSend({ site, jobs });
			} catch (err) {
				if (isExtensionAlive()) {
					console.warn(`[Content Script] Falha ao coletar ${site}:`, err?.message || err);
				}
				safeSend({ site, jobs: [] });
			}
		})();

		try { sendResponse({ ok: true }); } catch { /* port closed */ }
		return true;
	};

	globalThis.__WORKAHOLIC_BRIDGE_LISTENER = messageHandler;
	chrome.runtime.onMessage.addListener(messageHandler);
})();