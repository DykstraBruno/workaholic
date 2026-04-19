'use strict';

(function runWorkanaScraper() {
  const TARGET_PATH = '/jobs';
  const TIMEOUT_MS = 10_000;
  const CARD_SELECTORS = (typeof WORKANA_SELECTORS !== 'undefined' && Array.isArray(WORKANA_SELECTORS.card))
    ? WORKANA_SELECTORS.card
    : ['[data-test="project-card"]', '.project-item', '.project-card'];

  function send(jobs) {
    chrome.runtime.sendMessage({ site: 'workana', jobs: Array.isArray(jobs) ? jobs : [] });
  }

  function safeParse(html) {
    try {
      if (typeof parseWorkana !== 'function') return [];
      return parseWorkana(html);
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
