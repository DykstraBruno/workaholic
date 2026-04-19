'use strict';

// ATENCAO: LinkedIn atualiza layout com frequencia.
// Se parar de funcionar, revisar SELECTORS em linkedin.parser.js.
// Ultima validacao: 2026-04-16

(function runLinkedInScraper() {
  const TARGET_PATH = '/jobs/search';
  const TIMEOUT_MS = 15_000;

  function send(jobs) {
    chrome.runtime.sendMessage({ site: 'linkedin', jobs: Array.isArray(jobs) ? jobs : [] });
  }

  function safeParse(html) {
    try {
      if (typeof parseLinkedIn !== 'function') return [];
      return parseLinkedIn(html);
    } catch {
      return [];
    }
  }

  function countCards() {
    const selectors = (typeof LINKEDIN_SELECTORS !== 'undefined' && LINKEDIN_SELECTORS.card)
      ? LINKEDIN_SELECTORS.card
      : ['.jobs-search-results__list-item', '.base-card', '[data-job-id]'];

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
