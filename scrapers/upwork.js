'use strict';

(function runUpworkScraper() {
  const TARGET_PATH = '/nx/search/jobs';
  const TIMEOUT_MS = 10_000;
  const CARD_SELECTORS = (typeof UPWORK_SELECTORS !== 'undefined' && Array.isArray(UPWORK_SELECTORS.card))
    ? UPWORK_SELECTORS.card
    : ['[data-test="JobTile"]', '.job-tile', '.up-card-section'];

  function send(jobs) {
    browser.runtime.sendMessage({ site: 'upwork', jobs: Array.isArray(jobs) ? jobs : [] });
  }

  function safeParse(html) {
    try {
      if (typeof parseUpwork !== 'function') return [];
      return parseUpwork(html);
    } catch {
      return [];
    }
  }

  function countCards() {
    const seen = new Set();
    for (const selector of CARD_SELECTORS) {
      const nodes = document.querySelectorAll(selector);
      for (const node of nodes) seen.add(node);
    }
    return seen.size;
  }

  function captureAndSend() {
    try {
      const html = document.body ? document.body.innerHTML : '';
      const jobs = safeParse(html);
      send(jobs);
    } catch {
      send([]);
    }
  }

  try {
    const isTargetPage = window.location.pathname.includes(TARGET_PATH);
    if (!isTargetPage) {
      send([]);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timeoutId);
      captureAndSend();
    };

    const observer = new MutationObserver(() => {
      if (countCards() >= 1) {
        finish();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      captureAndSend();
    }, TIMEOUT_MS);

    if (document.readyState === 'complete' && countCards() >= 1) {
      finish();
    }
  } catch {
    send([]);
  }
})();
