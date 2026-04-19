'use strict';

(function runIndeedScraper() {
  const TARGET_PATH = '/jobs';
  const TIMEOUT_MS = 10_000;
  const CARD_SELECTORS = (typeof INDEED_SELECTORS !== 'undefined' && Array.isArray(INDEED_SELECTORS.card))
    ? INDEED_SELECTORS.card
    : ['[data-testid="jobsearch-SerpJobCard"]', '.job_seen_beacon', '.result'];

  function send(jobs) {
    chrome.runtime.sendMessage({ site: 'indeed', jobs: Array.isArray(jobs) ? jobs : [] });
  }

  function safeParse(html) {
    try {
      if (typeof parseIndeed !== 'function') return [];
      return parseIndeed(html);
    } catch {
      return [];
    }
  }

  function hasJobsSignal() {
    for (const selector of CARD_SELECTORS) {
      if (document.querySelector(selector)) return true;
    }

    return document.querySelectorAll('script[type="application/ld+json"]').length > 0;
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
      if (hasJobsSignal()) {
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

    if (document.readyState === 'complete' && hasJobsSignal()) {
      finish();
    }
  } catch {
    send([]);
  }
})();
