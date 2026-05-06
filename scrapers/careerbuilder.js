'use strict';

(function runCareerBuilderScraper() {
  const TARGET_PATH = '/en-US/search';
  const TIMEOUT_MS = 15_000;
  // careerbuildercareers.com renders job rows as tr.job-result inside #job-result-table
  const CARD_SELECTOR = 'tr.job-result';

  function send(jobs) {
    chrome.runtime.sendMessage({ site: 'careerbuilder', jobs: Array.isArray(jobs) ? jobs : [] });
  }

  function safeParse(html) {
    try {
      if (typeof parseCareerBuilder !== 'function') return [];
      return parseCareerBuilder(html);
    } catch {
      return [];
    }
  }

  function countCards() {
    return document.querySelectorAll(CARD_SELECTOR).length;
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
    const isTargetPage = window.location.pathname.startsWith(TARGET_PATH);
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
