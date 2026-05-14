/* locale.js — external file to satisfy CSP script-src 'self' */
(function () {
  'use strict';

  var i18n = {
    'pt-BR': {
      title:    'Importar currículo',
      heading:  'Importar habilidades do currículo',
      label:    'Clique para selecionar um arquivo',
      htmlLang: 'pt-BR',
    },
    'en': {
      title:    'Import Resume',
      heading:  'Import resume skills',
      label:    'Click to select a file',
      htmlLang: 'en',
    },
  };

  function pickLocale(langs) {
    for (var i = 0; i < langs.length; i++) {
      var l = (langs[i] || '').toLowerCase().replace('_', '-');
      if (l === 'pt-br' || l === 'pt') return 'pt-BR';
    }
    return 'en';
  }

  function applyLocale(locale) {
    var s = i18n[locale] || i18n['en'];
    document.documentElement.lang = s.htmlLang;
    document.title = s.title;
    var h = document.getElementById('heading');
    var m = document.getElementById('label-main');
    if (h) h.textContent = s.heading;
    if (m) m.textContent = s.label;
  }

  function fallbackNav() {
    var langs = (navigator.languages && navigator.languages.length)
      ? Array.from(navigator.languages)
      : [navigator.language || 'en'];
    applyLocale(pickLocale(langs));
  }

  // 1. browser.i18n.getAcceptLanguages (Firefox + Chrome via polyfill)
  if (typeof browser !== 'undefined' && browser.i18n && browser.i18n.getAcceptLanguages) {
    browser.i18n.getAcceptLanguages().then(function (langs) {
      if (langs && langs.length) {
        applyLocale(pickLocale(langs));
      } else {
        applyLocale(pickLocale([browser.i18n.getUILanguage()]));
      }
    }).catch(function () {
      // 2. UI language sync fallback
      try {
        applyLocale(pickLocale([browser.i18n.getUILanguage()]));
      } catch (e) {
        fallbackNav();
      }
    });
    return;
  }

  // 2. chrome.i18n (Chrome without polyfill)
  if (typeof chrome !== 'undefined' && chrome.i18n) {
    try {
      chrome.i18n.getAcceptLanguages(function (langs) {
        applyLocale(pickLocale(langs && langs.length ? langs : [chrome.i18n.getUILanguage()]));
      });
      return;
    } catch (e) { /* fall through */ }
  }

  // 3. navigator fallback (least reliable in Firefox)
  fallbackNav();
})();
