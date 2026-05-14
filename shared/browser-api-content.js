'use strict';

(() => {
  if (typeof globalThis.browser !== 'undefined') return;
  if (typeof globalThis.chrome === 'undefined') return;

  const { chrome } = globalThis;

  function wrapAsync(fn, ctx, { noResult = false } = {}) {
    return (...args) => new Promise((resolve, reject) => {
      try {
        fn.call(ctx, ...args, (result) => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          resolve(noResult ? undefined : result);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  globalThis.browser = {
    runtime: {
      get id() {
        return chrome.runtime.id;
      },
      getURL: chrome.runtime.getURL.bind(chrome.runtime),
      sendMessage: wrapAsync(chrome.runtime.sendMessage, chrome.runtime),
      onInstalled: chrome.runtime.onInstalled,
      onMessage: chrome.runtime.onMessage,
    },
    storage: {
      local: {
        get: wrapAsync(chrome.storage.local.get, chrome.storage.local),
        set: wrapAsync(chrome.storage.local.set, chrome.storage.local, { noResult: true }),
      },
      sync: {
        get: wrapAsync(chrome.storage.sync.get, chrome.storage.sync),
        set: wrapAsync(chrome.storage.sync.set, chrome.storage.sync, { noResult: true }),
      },
      onChanged: chrome.storage.onChanged,
    },
  };
})();
