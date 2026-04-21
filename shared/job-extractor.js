'use strict';

/**
 * job-extractor.js
 * Extracts and cleans job description text from multiple platforms.
 */

const SITE_CONFIGS = {
  gupy: {
    match: (url) => /gupy\.io/.test(url),
    selectors: [
      '[data-testid="job-description"]',
      '[data-testid="job-details"]',
      'div[class*="JobBody"]',
      'div[class*="description"]',
      'main section',
    ],
    apiFallback: async (url) => {
      const m = url.match(/job\/([A-Za-z0-9_\-=]+)/);
      if (!m) return null;
      try {
        const resp = await fetch(`https://portal.api.gupy.io/api/v1/jobs/${m[1]}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const parts = [
          data.description,
          data.prerequisites,
          data.responsibilities,
          data.additionalInformation,
        ].filter(Boolean);
        return parts.map(htmlToCleanText).join('\n\n');
      } catch {
        return null;
      }
    },
  },

  linkedin: {
    match: (url) => /linkedin\.com\/jobs/.test(url),
    selectors: [
      '.jobs-description__content',
      '.jobs-description-content__text',
      '.description__text',
      '#job-details',
      'section[class*="description"]',
    ],
  },

  indeed: {
    match: (url) => /indeed\.com/.test(url),
    selectors: [
      '#jobDescriptionText',
      '[data-testid="jobsearch-JobComponent-description"]',
      '.jobsearch-JobComponent-description',
      '.job-description',
    ],
  },

  workana: {
    match: (url) => /workana\.com/.test(url),
    selectors: [
      '.project-details .html-description',
      '.project-description',
      '[class*="description"]',
    ],
  },

  freelas99: {
    match: (url) => /99freelas\.com\.br/.test(url),
    selectors: [
      '.project-description',
      '.description-content',
      'div[class*="descricao"]',
      'article',
    ],
  },

  upwork: {
    match: (url) => /upwork\.com/.test(url),
    selectors: [
      '[data-test="Description"]',
      '.job-description',
      'section[data-test*="description"]',
      'div[class*="description"]',
    ],
  },
};

function detectSite(url = window.location.href) {
  for (const [name, cfg] of Object.entries(SITE_CONFIGS)) {
    if (cfg.match(url)) return { name, cfg };
  }
  return { name: 'generic', cfg: null };
}

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'LI', 'UL', 'OL',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'TR', 'TD', 'TH', 'TABLE',
  'BLOCKQUOTE', 'PRE', 'FIGURE', 'HEADER', 'FOOTER', 'ASIDE',
]);

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'IFRAME',
  'NAV', 'BUTTON', 'INPUT', 'FORM', 'SELECT', 'TEXTAREA',
]);

function extractTextFromNode(node) {
  const buffer = [];

  function walk(n) {
    if (!n) return;

    if (n.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has(n.tagName)) return;

    if (n.nodeType === Node.TEXT_NODE) {
      const txt = n.textContent;
      if (txt && txt.trim()) buffer.push(txt);
      return;
    }

    if (n.nodeType !== Node.ELEMENT_NODE) return;

    if (n.tagName === 'BR') {
      buffer.push('\n');
      return;
    }

    const isListItem = n.tagName === 'LI';
    if (isListItem) buffer.push('\n- ');

    const isBlock = BLOCK_TAGS.has(n.tagName);

    for (const child of n.childNodes) walk(child);

    if (isBlock) buffer.push('\n');
  }

  walk(node);
  return buffer.join('');
}

function normalizeText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let t = raw;

  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/[\u00A0\u2000-\u200F\u202F\u205F\u3000\uFEFF]/g, ' ');
  t = t.replace(/\t/g, ' ');
  t = t.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '');
  t = t.replace(/ +/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/ *\n */g, '\n');
  t = t.split('\n').map((line) => line.trim()).join('\n').trim();

  return t;
}

function htmlToCleanText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return normalizeText(extractTextFromNode(doc.body));
}

function validateJobText(text) {
  const errors = [];
  const warnings = [];

  if (!text || text.length < 80) {
    errors.push('TEXT_TOO_SHORT: less than 80 chars, scraping likely failed');
  }

  const words = text.split(/\s+/).filter(Boolean);
  const longWords = words.filter((w) => w.length > 25);
  const longWordRatio = words.length ? longWords.length / words.length : 0;

  if (longWordRatio > 0.05) {
    errors.push(
      `WORDS_CONCATENATED: ${(longWordRatio * 100).toFixed(1)}% words >25 chars (examples: ${longWords.slice(0, 3).join(', ')})`
    );
  }

  const hasAccent = /[\u00E1\u00E9\u00ED\u00F3\u00FA\u00E2\u00EA\u00F4\u00E3\u00F5\u00E0\u00E7\u00C1\u00C9\u00CD\u00D3\u00DA\u00C2\u00CA\u00D4\u00C3\u00D5\u00C0\u00C7]/.test(text);
  const looksPortuguese = /\b(e|de|para|com|que|uma|nao|sim|experiencia|conhecimento|requisitos)\b/i.test(text);

  if (looksPortuguese && !hasAccent && text.length > 300) {
    warnings.push('NO_ACCENTS: text seems PT without accents, possible encoding issue');
  }

  const jobMarkers = /\b(experi|conhec|requisit|desenv|vaga|skill|tecnolog|framework|linguagem|backend|frontend|fullstack|api|banco de dados|java|python|javascript|react|aws|azure|gcp)\b/i;
  if (!jobMarkers.test(text)) {
    warnings.push('NO_JOB_MARKERS: no common tech-job markers found, check selector');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      length: text.length,
      words: words.length,
      longWords: longWords.length,
      longWordRatio,
      hasAccent,
    },
  };
}

function findLargestTextBlock() {
  const candidates = document.querySelectorAll('main, article, section, div');
  let best = null;
  let bestLen = 0;

  for (const el of candidates) {
    if (el === document.body) continue;
    if (el.children.length > 200) continue;

    const txt = el.textContent || '';
    const len = txt.length;

    if (len > bestLen && len > 300 && len < 50000) {
      best = el;
      bestLen = len;
    }
  }

  return best;
}

async function extractJobText(url = window.location.href) {
  const { name, cfg } = detectSite(url);
  const result = {
    site: name,
    url,
    text: '',
    source: null,
    validation: null,
    tried: [],
  };

  if (cfg?.apiFallback) {
    try {
      const apiText = await cfg.apiFallback(url);
      if (apiText) {
        const norm = normalizeText(apiText);
        const val = validateJobText(norm);
        result.tried.push({ method: 'api', ok: val.ok });
        if (val.ok) {
          result.text = norm;
          result.source = 'api';
          result.validation = val;
          return result;
        }
      }
    } catch {
      result.tried.push({ method: 'api', ok: false, error: 'api_failed' });
    }
  }

  if (cfg?.selectors) {
    for (const sel of cfg.selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;

      const txt = normalizeText(extractTextFromNode(el));
      const val = validateJobText(txt);
      result.tried.push({ method: `selector:${sel}`, ok: val.ok, length: txt.length });

      if (val.ok) {
        result.text = txt;
        result.source = `selector:${sel}`;
        result.validation = val;
        return result;
      }
    }
  }

  const largestBlock = findLargestTextBlock();
  if (largestBlock) {
    const txt = normalizeText(extractTextFromNode(largestBlock));
    const val = validateJobText(txt);
    result.tried.push({ method: 'largest_block', ok: val.ok, length: txt.length });

    if (val.ok) {
      result.text = txt;
      result.source = 'largest_block';
      result.validation = val;
      return result;
    }
  }

  result.validation = { ok: false, errors: ['NO_VALID_EXTRACTION'], warnings: [] };
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractJobText,
    extractTextFromNode,
    normalizeText,
    validateJobText,
    htmlToCleanText,
    detectSite,
    SITE_CONFIGS,
  };
}

if (typeof window !== 'undefined') {
  window.__JobExtractor = {
    extractJobText,
    extractTextFromNode,
    normalizeText,
    validateJobText,
    htmlToCleanText,
    detectSite,
  };
}
