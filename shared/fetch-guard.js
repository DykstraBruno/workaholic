'use strict';

(function installPopupNetworkGuard() {
  function isExternalHttpUrl(raw) {
    return /^https?:\/\//i.test(String(raw || ''));
  }

  // Block external fetch from popup context.
  if (typeof globalThis.fetch === 'function') {
    const nativeFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      const rawUrl = typeof input === 'string' ? input : (input?.url || '');
      if (isExternalHttpUrl(rawUrl)) {
        return Promise.reject(new Error('External fetch blocked in popup context.'));
      }
      return nativeFetch(input, init);
    };
  }

  // Block external XHR from popup context as well.
  if (typeof globalThis.XMLHttpRequest === 'function') {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      if (isExternalHttpUrl(url)) {
        throw new Error('External XMLHttpRequest blocked in popup context.');
      }
      return originalOpen.call(this, method, url, ...rest);
    };
  }
})();
