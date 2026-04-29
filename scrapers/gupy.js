'use strict';

(function runGupyScraper() {
  const TARGET_PATHS = ['/job-search', '/vagas-emprego'];
  const TIMEOUT_MS = 15_000;

  function send(jobs) {
    browser.runtime.sendMessage({ site: 'gupy', jobs: Array.isArray(jobs) ? jobs : [] });
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
      const html = document.body ? document.body.innerHTML : '';
      const jobs = safeParse(html);
      send(jobs);
    } catch {
      send([]);
    }
  }

  try {
    const pathname = window.location.pathname || '';
    const isTargetPage = TARGET_PATHS.some((targetPath) => pathname.includes(targetPath));
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
