'use strict';

(function runFreelas99Scraper() {
  const TARGET_PATH = '/projects';
  const TIMEOUT_MS = 10_000;

  function send(jobs) {
    chrome.runtime.sendMessage({ site: 'freelas99', jobs: Array.isArray(jobs) ? jobs : [] });
  }

  function safeParse(html) {
    try {
      if (typeof parseFreelas99 !== 'function') return [];
      return parseFreelas99(html);
    } catch {
      return [];
    }
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
      if (document.body && document.body.innerHTML.length > 0) {
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

    if (document.readyState === 'complete' && document.body && document.body.innerHTML.length > 0) {
      finish();
    }
  } catch {
    send([]);
  }
})();
