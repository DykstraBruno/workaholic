'use strict';

(function runGupyScraper() {
  const TARGET_PATH = '/vagas-emprego';
  const TIMEOUT_MS = 15_000;

  function send(jobs) {
    chrome.runtime.sendMessage({ site: 'gupy', jobs: Array.isArray(jobs) ? jobs : [] });
  }

  function safeParse(html) {
    try {
      if (typeof parseGupy !== 'function') return [];
      return parseGupy(html);
    } catch {
      return [];
    }
  }

  function countCards() {
    const selectors = (typeof GUPY_SELECTORS !== 'undefined' && GUPY_SELECTORS.card)
      ? GUPY_SELECTORS.card
      : ['[data-testid="job-card"]', '.jobs-list__listitem', '.job-card'];

    const seen = new Set();
    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector);
      for (const node of nodes) seen.add(node);
    }
    return seen.size;
  }

  function captureAndSend() {
    try {
      if (countCards() < 2) {
        send([]);
        return;
      }
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
      if (countCards() >= 2) {
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
      send([]);
    }, TIMEOUT_MS);

    if (document.readyState === 'complete' && countCards() >= 2) {
      finish();
    }
  } catch {
    send([]);
  }
})();
