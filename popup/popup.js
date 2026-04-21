'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEYS = {
  PROFILE:          'profile',
  PROFILE_LOCAL:    'profile_local_cache',
  JOBS:             'jobs',
  LAST_FETCH:       'lastFetch',
  LAST_DIAGNOSTICS: 'lastFetchDiagnostics',
  HEALTH_PREFIX:    'health_',
};

const SITES = ['upwork', 'workana', 'freelas99', 'linkedin', 'indeed', 'gupy'];

const SITE_LABELS = {
  upwork:    'Upwork',
  workana:   'Workana',
  freelas99: '99Freelas',
  linkedin:  'LinkedIn',
  indeed:    'Indeed',
  gupy:      'Gupy',
};

// ---------------------------------------------------------------------------
// chrome.storage helpers
// ---------------------------------------------------------------------------

function localGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function localSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function syncGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });
}

function syncSet(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

async function saveProfileWithFallback(profile) {
  await localSet({ [KEYS.PROFILE_LOCAL]: profile });
  try {
    await syncSet({ [KEYS.PROFILE]: profile });
  } catch {
    // Keep local profile; background also falls back to local cache.
  }
}

async function getProfileWithFallback() {
  try {
    const syncResult = await syncGet(KEYS.PROFILE);
    if (syncResult[KEYS.PROFILE]) return syncResult[KEYS.PROFILE];
  } catch {
    // Fall through to local cache.
  }

  const localResult = await localGet(KEYS.PROFILE_LOCAL);
  return localResult[KEYS.PROFILE_LOCAL] ?? null;
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

function formatTimeAgo(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'agora mesmo';
  if (mins < 60)  return `há ${mins} minuto${mins > 1 ? 's' : ''}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `há ${hrs} hora${hrs > 1 ? 's' : ''}`;
  const days = Math.floor(hrs / 24);
  return `há ${days} dia${days > 1 ? 's' : ''}`;
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatBudget(budget) {
  if (!budget) return null;
  const sym = budget.currency === 'BRL' ? 'R$' : '$';
  const fmt = (n) => n.toLocaleString('pt-BR');
  return budget.min === budget.max
    ? `${sym} ${fmt(budget.min)}`
    : `${sym} ${fmt(budget.min)} – ${fmt(budget.max)}`;
}

function scoreClass(score) {
  if (score >= 80) return 'score-high';
  if (score >= 60) return 'score-mid';
  return 'score-low';
}

function normalizeSkills(skills) {
  const out = [];
  const seen = new Set();

  for (const raw of (skills || [])) {
    const value = String(raw || '').trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }

  return out;
}

function normalizeResumeSkillToken(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const RESUME_IMPORT_STOPWORDS = new Set([
  'bem', 'profissional', 'objetivo', 'resumo', 'experiencia', 'experiencia',
  'desenvolvimento', 'desenvolvedor', 'full', 'stack', 'fullstack', 'backend', 'frontend',
  'sistemas', 'aplicacoes', 'integracao', 'implementacao', 'otimizacao', 'processos',
  'trabalho', 'tempo', 'dados', 'banco', 'seguranca', 'tecnologias', 'modernas',
  'bruno', 'dykstra', 'brunodykstra', 'brasil', 'teresina', 'linkedin', 'github',
  'gmail', 'linkedin.com', 'github.com', 'gmail.com', 'software', 'engineer', 'developer',
  'atuar', 'contribuindo', 'escalaveis', 'performance', 'habilidades', 'tecnicas',
  'idiomas', 'portugues', 'ingles', 'alemao', 'nativo', 'intermediario', 'avancado',
  'informacoes', 'adicionais', 'remoto', 'hibrido', 'presencial', 'formacao', 'academica',
  'certificacoes', 'freelancer', 'atual', 'solucoes', 'projetos', 'relevantes',
]);

const RESUME_IMPORT_SKILL_HINTS = [
  'node.js', 'nodejs', 'typescript', 'javascript', 'react', 'react native',
  'next.js', 'nestjs', 'spring', 'spring boot', 'java', 'python', 'postgresql',
  'mysql', 'mongodb', 'sql', 'jwt', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
  'github actions', 'ci/cd', 'devops', 'vercel', 'railway', 'power bi', 'dax',
  'pandas', 'junit', 'mockito', 'vitest', 'html5', 'css3', 'html', 'css',
  'etl', 'api rest', 'rest api',
];

const RESUME_IMPORT_SKILL_CATALOG = (() => {
  const set = new Set();
  const synonyms = window.SYNONYMS || {};

  for (const [canonical, aliases] of Object.entries(synonyms)) {
    set.add(normalizeResumeSkillToken(canonical));
    for (const alias of aliases || []) {
      set.add(normalizeResumeSkillToken(alias));
    }
  }

  for (const hint of RESUME_IMPORT_SKILL_HINTS) {
    set.add(normalizeResumeSkillToken(hint));
  }

  return set;
})();

const RESUME_IMPORT_PHRASES = Array.from(RESUME_IMPORT_SKILL_CATALOG)
  .filter((term) => term && (term.includes(' ') || /[+#./-]/.test(term)))
  .sort((a, b) => b.length - a.length);

function isResumeSkillCandidate(raw) {
  const token = normalizeResumeSkillToken(raw)
    .replace(/^[^a-z0-9+#./-]+|[^a-z0-9+#./-]+$/gi, '');

  if (!token || token.length < 2 || token.length > 40) return false;
  if (RESUME_IMPORT_STOPWORDS.has(token)) return false;

  if (/[@]/.test(token)) return false;
  if (/^(https?:\/\/|www\.)/i.test(token)) return false;
  if (/\.com\b/i.test(token)) return false;
  if (/^\+?\d+$/.test(token)) return false;

  const canonical = canonicalSkill(token);
  return RESUME_IMPORT_SKILL_CATALOG.has(token) || RESUME_IMPORT_SKILL_CATALOG.has(canonical);
}

function extractSkillsFromResumeText(text) {
  if (!text) return [];

  const normalizedText = normalizeResumeSkillToken(text);
  const found = new Set();

  for (const phrase of RESUME_IMPORT_PHRASES) {
    const pattern = new RegExp(`(^|[^a-z0-9+#./-])${escapeRegExp(phrase)}([^a-z0-9+#./-]|$)`, 'i');
    if (pattern.test(normalizedText)) {
      found.add(canonicalSkill(phrase));
    }
  }

  const atsKeywords = window.ATS?.extractKeywords
    ? window.ATS.extractKeywords(text).slice(0, 300)
    : [];

  const regexTokens = normalizedText.match(/[a-z0-9+#./-]{2,40}/g) || [];
  for (const candidate of [...atsKeywords, ...regexTokens]) {
    if (!isResumeSkillCandidate(candidate)) continue;
    found.add(canonicalSkill(candidate));
  }

  return normalizeSkills(Array.from(found));
}

function calcUnifiedMatchScore(job, profileSkills) {
  const skills = normalizeSkills(profileSkills || []);
  if (!skills.length || typeof window.countMatches !== 'function') return 0;

  const matches = window.countMatches(job, skills);
  const canonicalSkillCount = window.countMatches(skills, skills);
  if (!canonicalSkillCount) return 0;

  return Math.round((matches / canonicalSkillCount) * 100);
}

const ALIAS_TO_CANONICAL_SKILL = (() => {
  const map = {};
  const synonyms = window.SYNONYMS || {};
  for (const [canonical, aliases] of Object.entries(synonyms)) {
    map[String(canonical).toLowerCase()] = String(canonical).toLowerCase();
    for (const alias of aliases || []) {
      map[String(alias).toLowerCase()] = String(canonical).toLowerCase();
    }
  }
  return map;
})();

const REQUIRED_SKILLS_CACHE = new Map();
const REQUIRED_TEXT_CACHE = new Map();
const DETAIL_TAB_TIMEOUT_MS = 20000;
const GENERIC_SKILL_NOISE = new Set([
  'desenvolvedor', 'desenvolvedora', 'pessoa', 'vaga', 'posicao', 'posição',
  'remoto', 'presencial', 'hibrido', 'híbrido', 'efetivo', 'informado',
  'salario', 'salário', 'beneficios', 'benefícios', 'pcd', 'clt', 'pj',
]);

function canonicalSkill(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return ALIAS_TO_CANONICAL_SKILL[normalized] ?? normalized;
}

function isLikelySkillLabel(label) {
  const raw = String(label || '').trim();
  if (!raw) return false;

  const normalized = normalizeForSkillSearch(raw);
  if (!normalized) return false;
  if (GENERIC_SKILL_NOISE.has(normalized)) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 5) return false;

  // Discard likely concatenated garbage tokens (e.g. informadoremotoefetivotambe)
  if (words.length === 1 && normalized.length > 18 && !/[.+#\/-]/.test(normalized)) {
    return false;
  }

  // Keep common tech patterns: aws, s3, sql, python, node.js, c#, c++, etc.
  if (/^[a-z0-9.+#\/-]{2,32}$/i.test(normalized)) return true;

  // Keep short multi-word technical phrases
  if (words.length >= 2 && words.length <= 5 && normalized.length <= 42) return true;

  return false;
}

function uniqueSkillList(values) {
  const out = [];
  const seen = new Set();
  for (const raw of values || []) {
    const label = String(raw || '').trim();
    if (!isLikelySkillLabel(label)) continue;
    const key = canonicalSkill(label);
    if (!label || !key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function normalizeForSkillSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

function extractSectionSkills(description) {
  const text = normalizeForSkillSearch(description);
  if (!text) return [];

  const headingPattern = /(?:requisitos?(?:\s*e\s*qualificac(?:ao|oes))?|qualificac(?:ao|oes)|diferenciais?|desejaveis?)/i;
  const nextHeadingPattern = /(?:atividades|responsabilidades|beneficios|sobre\s*a\s*vaga|etapas|informacoes|o\s*que\s*esperamos|local\s*de\s*trabalho|$)/i;
  const re = new RegExp(
    `${headingPattern.source}[\\s:.-]*([\\s\\S]*?)(?=${headingPattern.source}|${nextHeadingPattern.source})`,
    'gi'
  );

  const chunks = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const body = String(m[1] || '').trim();
    if (body) chunks.push(body);
  }

  if (!chunks.length) return [];

  const separators = /[\n\r•·;|]|\s-\s|\s–\s|\s—\s|\u2022/g;
  const candidates = [];

  for (const chunk of chunks) {
    const parts = chunk
      .split(separators)
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (part.length < 2 || part.length > 64) continue;
      candidates.push(part);
    }
  }

  return uniqueSkillList(candidates);
}

function extractGenericRequiredSkills(text) {
  const source = normalizeForSkillSearch(text);
  if (!source) return [];

  const candidates = [];

  if (window.ATS?.extractKeywords) {
    candidates.push(...window.ATS.extractKeywords(source).slice(0, 30));
  }

  const parts = source
    .split(/[\n\r,;|•·]/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part.length >= 2 && part.length <= 32);

  candidates.push(...parts);

  return uniqueSkillList(candidates).slice(0, 20);
}

function readableTextFromHtml(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html || ''), 'text/html');

    doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove());

    const text = doc.body?.innerText || doc.documentElement?.innerText || '';
    return text
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return '';
  }
}

function createHiddenTab(url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tab);
    });
  });
}

function removeTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.remove(tabId, () => resolve());
  });
}

function waitTabComplete(tabId, timeoutMs = DETAIL_TAB_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error('Timeout ao carregar pagina da vaga'));
    }, timeoutMs);

    function onUpdated(updatedTabId, info) {
      if (updatedTabId !== tabId) return;
      if (info.status !== 'complete') return;

      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

function extractRequirementsFromDom(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ['shared/job-extractor.js'],
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        chrome.scripting.executeScript(
          {
            target: { tabId },
            func: async () => {
              if (!window.__JobExtractor?.extractJobText) return '';

              const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

              function fallbackRawExtraction() {
                const rootCandidates = [
                  '[data-testid="job-description"]',
                  '[data-testid="job-details"]',
                  'main section',
                  'article',
                  'main',
                ];

                for (const selector of rootCandidates) {
                  const el = document.querySelector(selector);
                  if (!el) continue;
                  const txt = window.__JobExtractor.normalizeText(
                    window.__JobExtractor.extractTextFromNode(el)
                  );
                  if (txt && txt.length > 120) return txt;
                }

                const bodyText = window.__JobExtractor.normalizeText(
                  window.__JobExtractor.extractTextFromNode(document.body)
                );
                return bodyText.length > 120 ? bodyText : '';
              }

              try {
                let best = '';

                // Gupy and LinkedIn pages often render description asynchronously.
                for (let i = 0; i < 8; i++) {
                  const extraction = await window.__JobExtractor.extractJobText(window.location.href);
                  const text = extraction?.text || '';
                  if (text.length > best.length) best = text;
                  if (text.length > 400) return text;
                  await sleep(700);
                }

                const raw = fallbackRawExtraction();
                if (raw.length > best.length) best = raw;

                return best;
              } catch {
                return '';
              }
            },
          },
          (results) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(results?.[0]?.result || '');
          }
        );
      }
    );
  });
}

async function fetchRequirementTextFromJobUrl(jobUrl) {
  if (!jobUrl) return '';
  if (REQUIRED_TEXT_CACHE.has(jobUrl)) return REQUIRED_TEXT_CACHE.get(jobUrl);

  let domText = '';
  let hiddenTab = null;
  try {
    hiddenTab = await createHiddenTab(jobUrl);
    await waitTabComplete(hiddenTab.id);
    domText = await extractRequirementsFromDom(hiddenTab.id);
  } catch {
    // If extraction fails, return empty text and let callers fallback.
  } finally {
    if (hiddenTab?.id) {
      await removeTab(hiddenTab.id);
    }
  }

  if (domText.trim()) {
    REQUIRED_TEXT_CACHE.set(jobUrl, domText);
  }
  return domText;
}

function getRequiredSkillsForJob(job) {
  const structured = uniqueSkillList(job?.skills || []);
  if (structured.length) return structured;

  const fromSections = extractSectionSkills(job?.description || '');
  if (fromSections.length) return fromSections;

  return extractGenericRequiredSkills(`${job?.title || ''} ${job?.description || ''}`);
}

async function resolveRequiredSkillsForJob(job) {
  const fromJobPayload = getRequiredSkillsForJob(job);
  if (fromJobPayload.length >= 5) return fromJobPayload;

  const textFromPage = await fetchRequirementTextFromJobUrl(job?.url || '');
  const fromPage = uniqueSkillList([
    ...extractSectionSkills(textFromPage),
    ...extractGenericRequiredSkills(textFromPage),
  ]);
  const merged = uniqueSkillList([...fromPage, ...fromJobPayload]);
  REQUIRED_SKILLS_CACHE.set(job?.url || '', merged);
  return merged;
}

async function resolveRequirementAnalysis(job, profileSkills) {
  const baseDescription = `${job?.title || ''}\n${job?.description || ''}`.trim();
  const pageDescription = await fetchRequirementTextFromJobUrl(job?.url || '');
  const fullDescription = [baseDescription, pageDescription].filter(Boolean).join('\n\n');

  if (window.RequirementsExtractor?.analyze) {
    const analysis = window.RequirementsExtractor.analyze({
      descricao_vaga: fullDescription,
      skills_perfil: profileSkills,
      site_origem: job?.site || '',
    });

    const req = analysis?.requisitos_obrigatorios || [];
    const matches = analysis?.matches || {};
    const obrigOk = Array.isArray(matches.obrigatorios_atendidos)
      ? matches.obrigatorios_atendidos
      : [];
    const obrigMiss = Array.isArray(matches.obrigatorios_faltantes)
      ? matches.obrigatorios_faltantes
      : [];

    return {
      requiredGap: {
        total: req.length,
        matchedCount: obrigOk.length,
        score: Number.isFinite(matches.percentual_match_obrigatorio) ? matches.percentual_match_obrigatorio : 0,
        matched: obrigOk.map((item) => typeof item === 'string' ? item : item?.skill).filter(Boolean),
        missing: obrigMiss,
      },
      analysis,
    };
  }

  const requiredSkills = await resolveRequiredSkillsForJob(job);
  return {
    requiredGap: computeRequiredSkillsGap(requiredSkills, profileSkills),
    analysis: null,
  };
}

function computeRequiredSkillsGap(jobSkills, userSkills) {
  const requiredRaw = Array.isArray(jobSkills) ? jobSkills : [];
  const required = [];
  const reqSeen = new Set();

  for (const raw of requiredRaw) {
    const clean = String(raw || '').trim();
    if (!clean) continue;
    const key = canonicalSkill(clean);
    if (!key || reqSeen.has(key)) continue;
    reqSeen.add(key);
    required.push({ key, label: clean });
  }

  const userSet = new Set((userSkills || []).map(canonicalSkill).filter(Boolean));

  const matched = [];
  const missing = [];
  for (const skill of required) {
    if (userSet.has(skill.key)) matched.push(skill.label);
    else missing.push(skill.label);
  }

  const total = required.length;
  const matchedCount = matched.length;
  const score = total ? Math.round((matchedCount / total) * 100) : 0;

  return { total, matchedCount, score, matched, missing };
}

function extractRequiredSkillsFromAnalysis(analysis) {
  const req = analysis?.requisitos_obrigatorios;
  if (!Array.isArray(req)) return [];
  return uniqueSkillList(
    req
      .map((item) => (typeof item === 'string' ? item : item?.skill))
      .filter(Boolean)
  );
}

function calcResumeMatchAgainstSkills(requiredSkills, resumeBodyText) {
  const requiredRaw = Array.isArray(requiredSkills) ? requiredSkills : [];
  const required = [];
  const reqSeen = new Set();

  for (const raw of requiredRaw) {
    const label = String(raw || '').trim();
    if (!label) continue;
    const key = canonicalSkill(label);
    if (!key || reqSeen.has(key)) continue;
    reqSeen.add(key);
    required.push({ key, label });
  }

  if (!required.length) return { score: 0, matched: [], missing: [] };

  const resumeSkills = extractSkillsFromResumeText(resumeBodyText);
  const resumeSet = new Set(resumeSkills.map(canonicalSkill).filter(Boolean));

  const matched = [];
  const missing = [];
  for (const item of required) {
    if (resumeSet.has(item.key)) matched.push(item.label);
    else missing.push(item.label);
  }

  const score = Math.round((matched.length / required.length) * 100);
  return { score, matched, missing };
}

function injectKeywordsIntoResumeText(resumeBodyText, keywords) {
  const base = String(resumeBodyText || '').trimEnd();
  const inject = uniqueSkillList(keywords || []);
  if (!inject.length) return base;
  return `${base}\n\nHabilidades (ATS):\n${inject.join(' | ')}\n`;
}

function renderRequiredSkillsGap(gap) {
  const wrap = document.getElementById('skills-gap-wrap');
  const summary = document.getElementById('skills-gap-summary');
  const missingWrap = document.getElementById('skills-gap-missing-wrap');
  const missingTags = document.getElementById('skills-gap-missing-tags');

  if (!gap.total) {
    wrap.hidden = false;
    summary.textContent = 'Nao foi possivel extrair requisitos suficientes desta vaga para calcular o match de skills.';
    missingWrap.hidden = true;
    missingTags.innerHTML = '';
    return;
  }

  wrap.hidden = false;
  summary.textContent = `${gap.matchedCount} de ${gap.total} habilidades da vaga em match (${gap.score}%).`;

  if (!gap.missing.length) {
    missingWrap.hidden = true;
    missingTags.innerHTML = '';
    return;
  }

  missingWrap.hidden = false;
  missingTags.innerHTML = gap.missing
    .map((skill) => `<span class="tag tag--gap">${esc(skill)}</span>`)
    .join('');
}

function setFetchStatus(message, variant) {
  const el = document.getElementById('fetch-status');
  el.textContent = message;
  el.className = `fetch-status fetch-status--${variant}`;
  el.hidden = false;
}

function clearFetchStatus() {
  const el = document.getElementById('fetch-status');
  el.hidden = true;
  el.textContent = '';
  el.className = 'fetch-status';
}

/** Minimal HTML escaping — prevents XSS in dynamically built markup. */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  document.querySelectorAll('.tab-pane').forEach((pane) => {
    const active = pane.id === `tab-${tab}`;
    pane.classList.toggle('active', active);
    pane.hidden = !active;
  });

  if (tab === 'jobs')       loadJobsTab();
  else if (tab === 'profile') loadProfileTab();
  else if (tab === 'resume')  initResumeTab();
}

// ---------------------------------------------------------------------------
// Jobs tab
// ---------------------------------------------------------------------------

async function loadJobsTab() {
  const result = await localGet([KEYS.JOBS, KEYS.LAST_FETCH, KEYS.LAST_DIAGNOSTICS]);
  const jobs        = result[KEYS.JOBS]              ?? [];
  const lastFetch   = result[KEYS.LAST_FETCH]        ?? null;
  const diagnostics = result[KEYS.LAST_DIAGNOSTICS]  ?? null;

  const timeAgo = formatTimeAgo(lastFetch);
  document.getElementById('last-fetch').textContent =
    timeAgo ? `Última busca: ${timeAgo}` : 'Nenhuma busca realizada';

  await renderHealthWarnings();
  renderDiagnostics(diagnostics);
  renderJobs(jobs);
}

async function renderHealthWarnings() {
  const keys   = SITES.map((s) => `${KEYS.HEALTH_PREFIX}${s}`);
  const result = await localGet(keys);

  const container = document.getElementById('health-warnings');
  container.innerHTML = '';

  for (const site of SITES) {
    const health = result[`${KEYS.HEALTH_PREFIX}${site}`];
    if (health && health.consecutiveFailures >= 3) {
      const el = document.createElement('div');
      el.className = 'health-warning';
      el.textContent = `⚠ Scraper do ${SITE_LABELS[site]} pode estar quebrado`;
      container.appendChild(el);
    }
  }
}

function renderDiagnostics(diagnostics) {
  const container = document.getElementById('fetch-diagnostics');

  if (!diagnostics || !Array.isArray(diagnostics.sites) || !diagnostics.sites.length) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }

  const summary = `${diagnostics.totals?.rawJobs ?? 0} capturadas, ${diagnostics.totals?.matchedJobs ?? 0} apos filtro. Skills no perfil: ${diagnostics.profile?.skillsCount ?? 0}.`;
  const items = diagnostics.sites.map((site) => {
    let flag = '';
    if (site.loginRequired) flag = '<span class="fetch-diagnostics-flag">login</span>';
    else if (site.failed) flag = '<span class="fetch-diagnostics-flag">falha</span>';

    return `
      <div class="fetch-diagnostics-item">
        <span class="fetch-diagnostics-site">${esc(site.label || site.site)}${flag}</span>
        <span class="fetch-diagnostics-metrics">${site.rawJobs ?? 0} brutas / ${site.matchedJobs ?? 0} match</span>
      </div>`;
  }).join('');

  container.hidden = false;
  container.innerHTML = `
    <div class="fetch-diagnostics-title">Diagnostico da ultima busca</div>
    <div class="fetch-diagnostics-summary">${esc(summary)}</div>
    <div class="fetch-diagnostics-list">${items}</div>`;
}

function renderJobs(jobs) {
  const list  = document.getElementById('job-list');
  const empty = document.getElementById('jobs-empty');

  if (!jobs.length) {
    list.innerHTML  = '';
    list.hidden     = true;
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;
  list.hidden  = false;
  list.innerHTML = jobs.map((job) => {
    const score  = Math.round(job.score ?? 0);
    const budget = formatBudget(job.budget);
    const date   = formatDate(job.postedAt);

    return `
      <li class="job-card">
        <div class="job-card-header">
          <a href="${esc(job.url)}" class="job-title" target="_blank" rel="noopener noreferrer">${esc(job.title)}</a>
          <div class="job-badges">
            <span class="badge badge-site badge-site--${esc(job.site)}">${esc(job.site)}</span>
            <span class="badge badge-score ${scoreClass(score)}">${score}% match</span>
          </div>
        </div>
        <div class="job-card-footer">
          ${budget ? `<span class="job-budget">${esc(budget)}</span>` : ''}
          ${date   ? `<span class="job-date">${esc(date)}</span>`     : ''}
        </div>
      </li>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Profile tab — state
// ---------------------------------------------------------------------------

let profileSkills    = [];
let profileBlacklist = [];
let profileKeywords  = [];
let profileStateLoaded = false;

function defaultProfile() {
  return {
    skills: [], area: 'development', minBudget: null, currency: 'BRL',
    languages: ['pt', 'en'], blacklist: [], keywords: [],
    sites: Object.fromEntries(SITES.map((s) => [s, true])),
    fetchInterval: 1,
  };
}

async function loadProfileTab() {
  const profile = await getProfileWithFallback() ?? defaultProfile();

  profileSkills    = normalizeSkills(profile.skills ?? []);
  profileBlacklist = [...(profile.blacklist ?? [])];
  profileKeywords  = [...(profile.keywords  ?? [])];

  document.getElementById('profile-area').value       = profile.area        ?? 'development';
  document.getElementById('profile-min-budget').value = profile.minBudget   ?? '';
  document.getElementById('profile-currency').value   = profile.currency    ?? 'BRL';
  document.getElementById('profile-interval').value   = profile.fetchInterval ?? 1;

  for (const site of SITES) {
    const cb = document.getElementById(`site-${site}`);
    if (cb) cb.checked = profile.sites?.[site] !== false;
  }

  renderTags('skills-tags',    profileSkills,    removeSkill);
  renderTags('blacklist-tags', profileBlacklist, removeBlacklistWord);
  renderTags('keywords-tags',  profileKeywords,  removeKeyword);
  profileStateLoaded = true;
}

async function ensureProfileExists() {
  const existing = await getProfileWithFallback();
  if (existing) return existing;

  const profile = defaultProfile();
  await saveProfileWithFallback(profile);
  return profile;
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

function renderTags(containerId, items, onRemove) {
  const container = document.getElementById(containerId);
  container.innerHTML = items.map((item) => `
    <span class="tag">
      ${esc(item)}
      <button class="tag-remove" data-value="${esc(item)}" aria-label="Remover ${esc(item)}">×</button>
    </span>`).join('');

  container.querySelectorAll('.tag-remove').forEach((btn) => {
    btn.addEventListener('click', () => onRemove(btn.dataset.value));
  });
}

function removeSkill(skill) {
  profileSkills = profileSkills.filter((s) => s !== skill);
  profileStateLoaded = true;
  renderTags('skills-tags', profileSkills, removeSkill);
}

function removeBlacklistWord(word) {
  profileBlacklist = profileBlacklist.filter((w) => w !== word);
  profileStateLoaded = true;
  renderTags('blacklist-tags', profileBlacklist, removeBlacklistWord);
}

function removeKeyword(word) {
  profileKeywords = profileKeywords.filter((w) => w !== word);
  profileStateLoaded = true;
  renderTags('keywords-tags', profileKeywords, removeKeyword);
}

function addTag(inputId, tagsArray, renderFn, removeFn) {
  const input = document.getElementById(inputId);
  const value = input.value.trim().toLowerCase();
  if (value && !tagsArray.includes(value)) {
    tagsArray.push(value);
    renderTags(renderFn, tagsArray, removeFn);
  }
  input.value = '';
  input.focus();
}

// ---------------------------------------------------------------------------
// Save profile
// ---------------------------------------------------------------------------

async function saveProfile() {
  const existingProfile = await ensureProfileExists();
  const profile = buildProfileFromForm(existingProfile, { forceCurrentState: true });

  await saveProfileWithFallback(profile);

  const btn = document.getElementById('save-profile-btn');
  const original = btn.textContent;
  btn.textContent = 'Perfil salvo!';
  btn.classList.add('btn--success');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('btn--success');
  }, 2000);
}

function buildProfileFromForm(baseProfile = defaultProfile(), options = {}) {
  const { forceCurrentState = false } = options;
  const minBudgetRaw = document.getElementById('profile-min-budget').value;

  // If profile controls were never loaded, keep persisted values to avoid wiping user data.
  if (!profileStateLoaded && !forceCurrentState) {
    return {
      ...baseProfile,
      skills: normalizeSkills(baseProfile.skills ?? []),
      blacklist: [...(baseProfile.blacklist ?? [])],
      keywords: [...(baseProfile.keywords ?? [])],
      sites: { ...(baseProfile.sites ?? Object.fromEntries(SITES.map((s) => [s, true]))) },
    };
  }

  return {
    skills:       normalizeSkills(profileSkills),
    area:         document.getElementById('profile-area').value,
    minBudget:    minBudgetRaw ? parseFloat(minBudgetRaw) : null,
    currency:     document.getElementById('profile-currency').value,
    languages:    ['pt', 'en'],
    blacklist:    [...profileBlacklist],
    keywords:     [...profileKeywords],
    sites:        Object.fromEntries(
      SITES.map((s) => [s, document.getElementById(`site-${s}`).checked])
    ),
    fetchInterval: parseInt(document.getElementById('profile-interval').value, 10),
  };
}

// ---------------------------------------------------------------------------
// Resume / ATS tab
// ---------------------------------------------------------------------------

let resumeText = '';
let resumeOptimizedText = '';
let resumeReady = false;
let resumeOriginalFile = null;      // original File object
let resumeOriginalBytes = null;     // ArrayBuffer for PDF-lib
let resumeIsPDF = false;
let resumeMissingKeywords = [];

/**
 * Extracts plain text from a PDF file using PDF.js.
 * @param {File} file
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n');
}

/**
 * Extracts plain text from a DOCX file using mammoth.js.
 * @param {File} file
 * @returns {Promise<string>}
 */
async function extractTextFromDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Triggers download of the original PDF file unchanged.
 * @param {ArrayBuffer} originalPdfBytes
 * @param {string}      filename
 */
function downloadOriginalPDF(originalPdfBytes, filename) {
  const blob = new Blob([originalPdfBytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Triggers download of the original DOCX file unchanged.
 * @param {File}   file
 * @param {string} filename
 */
function downloadOriginalDOCX(file, filename) {
  const url = URL.createObjectURL(file);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function populateJobSelect(jobs) {
  const select = document.getElementById('ats-job-select');
  select.innerHTML = jobs.length
    ? jobs.map((j, i) => `<option value="${i}">${esc(j.title)} (${esc(j.site)})</option>`).join('')
    : '<option value="">— Nenhuma vaga encontrada —</option>';
}

function showATSScores(before, after) {
  const wrap = document.getElementById('ats-scores');
  wrap.hidden = false;

  const bEl = document.getElementById('ats-score-before');
  const aEl = document.getElementById('ats-score-after');

  bEl.textContent  = `${before.score}%`;
  aEl.textContent  = `${after.score}%`;
  bEl.className    = `ats-score-value ${before.score >= 60 ? 'ats-score-value--good' : 'ats-score-value--bad'}`;
  aEl.className    = `ats-score-value ats-score-value--after ${after.score >= 60 ? 'ats-score-value--good' : 'ats-score-value--bad'}`;
}

function showMissingTags(missing) {
  const wrap = document.getElementById('ats-missing-wrap');
  const container = document.getElementById('ats-missing-tags');

  if (!missing.length) {
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;
  container.innerHTML = missing
    .map((kw) => `<span class="tag tag--ats">${esc(kw)}</span>`)
    .join('');
}

let _resumeTabJobs = [];

async function runResumeAnalysisForSelectedJob() {
  if (!resumeReady) return;

  const select = document.getElementById('ats-job-select');
  const index = parseInt(select.value, 10);
  const job = _resumeTabJobs[index];
  if (!job) return;

  if (job.url) {
    REQUIRED_TEXT_CACHE.delete(job.url);
    REQUIRED_SKILLS_CACHE.delete(job.url);
  }

  const resumeBaseSkills = extractSkillsFromResumeText(resumeText);

  const atsResult = window.ATS.optimizeForJob(job, resumeText);
  const requirementResult = await resolveRequirementAnalysis(job, resumeBaseSkills);

  const requiredSkills = uniqueSkillList([
    ...extractRequiredSkillsFromAnalysis(requirementResult.analysis),
    ...(requirementResult.requiredGap?.total
      ? [...(requirementResult.requiredGap.matched || []), ...(requirementResult.requiredGap.missing || [])]
      : []),
  ]);

  const beforeByRequirements = calcResumeMatchAgainstSkills(requiredSkills, resumeText);
  const optimizedForRequirements = injectKeywordsIntoResumeText(resumeText, beforeByRequirements.missing);
  const afterByRequirements = calcResumeMatchAgainstSkills(requiredSkills, optimizedForRequirements);

  const requiredGap = requiredSkills.length
    ? {
        total: requiredSkills.length,
        matchedCount: beforeByRequirements.matched.length,
        score: beforeByRequirements.score,
        matched: beforeByRequirements.matched,
        missing: beforeByRequirements.missing,
      }
    : requirementResult.requiredGap;

  const beforeScore = requiredSkills.length ? beforeByRequirements.score : atsResult.before.score;
  const rawAfterScore = requiredSkills.length ? afterByRequirements.score : atsResult.after.score;
  const afterScore = Math.max(beforeScore, rawAfterScore);

  const beforePayload = requiredSkills.length ? beforeByRequirements : atsResult.before;
  const afterPayload = requiredSkills.length ? afterByRequirements : atsResult.after;

  resumeOptimizedText = requiredSkills.length ? optimizedForRequirements : atsResult.optimizedText;
  resumeMissingKeywords = (beforePayload.missing || []).slice(0, 20);

  showATSScores(
    { ...beforePayload, score: beforeScore },
    { ...afterPayload, score: afterScore }
  );
  renderRequiredSkillsGap(requiredGap);
  showMissingTags(resumeMissingKeywords);
  document.getElementById('ats-download-btn').hidden = false;

  const docxNote = document.getElementById('ats-docx-note');
  docxNote.hidden = resumeIsPDF;
}

function initResumeTab() {
  localGet(KEYS.JOBS).then((result) => {
    _resumeTabJobs = result[KEYS.JOBS] ?? [];
    populateJobSelect(_resumeTabJobs);
  });
}

async function handleResumeFile(file) {
  const hint = document.getElementById('resume-upload-hint');
  const name = document.getElementById('resume-upload-name');

  hint.hidden = true;
  name.hidden = false;
  name.textContent = `📄 ${file.name} — processando…`;

  try {
    resumeOriginalFile  = file;
    resumeOriginalBytes = await file.arrayBuffer();
    resumeIsPDF         = file.name.toLowerCase().endsWith('.pdf');

    if (resumeIsPDF) {
      if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';
      }
      resumeText = await extractTextFromPDF(file);
    } else if (file.name.toLowerCase().endsWith('.docx')) {
      resumeText = await extractTextFromDOCX(file);
    } else {
      throw new Error('Formato não suportado. Use PDF ou DOCX.');
    }

    name.textContent = `✓ ${file.name}`;
    resumeReady = true;

    document.getElementById('ats-panel').hidden = false;
    document.getElementById('ats-scores').hidden = true;
    document.getElementById('skills-gap-wrap').hidden = true;
    document.getElementById('ats-missing-wrap').hidden = true;
    document.getElementById('ats-download-btn').hidden = true;
    document.getElementById('ats-docx-note').hidden = true;
  } catch (err) {
    name.textContent = `⚠ Erro: ${err.message}`;
    resumeReady = false;
  }
}

async function importProfileSkillsFromResume(file) {
  const statusEl = document.getElementById('profile-resume-import-status');
  const inputEl = document.getElementById('profile-resume-file-input');

  statusEl.hidden = false;
  statusEl.textContent = `Processando ${file.name}...`;

  try {
    const isPDF = file.name.toLowerCase().endsWith('.pdf');
    const isDOCX = file.name.toLowerCase().endsWith('.docx');

    if (!isPDF && !isDOCX) {
      throw new Error('Formato nao suportado. Use PDF ou DOCX.');
    }

    let text = '';
    if (isPDF) {
      if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '../libs/pdf.worker.min.js';
      }
      text = await extractTextFromPDF(file);
    } else {
      text = await extractTextFromDOCX(file);
    }

    const importedSkills = extractSkillsFromResumeText(text);
    const previous = [...profileSkills];
    profileSkills = normalizeSkills([...profileSkills, ...importedSkills]);
    profileStateLoaded = true;
    renderTags('skills-tags', profileSkills, removeSkill);

    const added = profileSkills.length - previous.length;
    if (added <= 0) {
      statusEl.textContent = 'Nenhuma habilidade nova encontrada no curriculo.';
      inputEl.value = '';
      return;
    }

    const existingProfile = await ensureProfileExists();
    await saveProfileWithFallback(buildProfileFromForm(existingProfile, { forceCurrentState: true }));

    statusEl.textContent = `${added} habilidade${added > 1 ? 's' : ''} importada${added > 1 ? 's' : ''} e salva${added > 1 ? 's' : ''} no perfil.`;
  } catch (error) {
    statusEl.textContent = `Erro ao importar curriculo: ${error.message}`;
  } finally {
    inputEl.value = '';
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Fetch now
  const fetchBtn = document.getElementById('fetch-now-btn');
  fetchBtn.addEventListener('click', async () => {
    fetchBtn.disabled    = true;
    fetchBtn.textContent = 'Buscando…';

    try {
      const existingProfile = await ensureProfileExists();
      // Persist current UI state when profile has been loaded in this popup session.
      await saveProfileWithFallback(buildProfileFromForm(existingProfile));
      const profile = await getProfileWithFallback() ?? defaultProfile();
      clearFetchStatus();

      const response = await sendRuntimeMessage({ type: 'FETCH_NOW' });

      if (!response?.ok) {
        throw new Error(response?.error || 'Falha ao executar a busca.');
      }

      const jobs = response.result?.jobs ?? [];
      const auth = response.result?.auth ?? null;
      await loadJobsTab();

      if (auth?.required) {
        setFetchStatus(`Login necessario no ${auth.label}. A pagina foi aberta e a busca continuara automaticamente depois que voce entrar.`, 'warning');
        return;
      }

      if (!profile.skills?.length) {
        setFetchStatus('Busca concluida. Foram capturadas vagas, mas seu perfil esta sem skills. Abra a aba Perfil, adicione habilidades (ex: react, node, python) e clique em Buscar agora novamente.', 'warning');
        return;
      }

      if (!jobs.length) {
        setFetchStatus('Busca concluida. Nenhuma vaga combinou com os filtros atuais.', 'warning');
        return;
      }

      setFetchStatus(`Busca concluida. ${jobs.length} vaga${jobs.length > 1 ? 's' : ''} encontrada${jobs.length > 1 ? 's' : ''}.`, 'success');
    } catch (error) {
      setFetchStatus(`Erro na busca: ${error.message}`, 'error');
    } finally {
      fetchBtn.disabled    = false;
      fetchBtn.textContent = 'Buscar agora';
    }
  });

  // Add skill
  const skillInput = document.getElementById('skill-input');
  document.getElementById('add-skill-btn').addEventListener('click', () => {
    const v = skillInput.value.trim().toLowerCase();
    if (!v) {
      skillInput.focus();
      return;
    }

    if (!profileSkills.includes(v)) {
      profileSkills.push(v);
      profileSkills = normalizeSkills(profileSkills);
      profileStateLoaded = true;
      renderTags('skills-tags', profileSkills, removeSkill);
    }
    skillInput.value = '';
    skillInput.focus();
  });
  skillInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-skill-btn').click();
  });

  const profileResumeFileInput = document.getElementById('profile-resume-file-input');
  const profileResumeImportBtn = document.getElementById('profile-resume-import-btn');

  profileResumeImportBtn.addEventListener('click', () => {
    profileResumeFileInput.click();
  });

  profileResumeFileInput.addEventListener('change', () => {
    const file = profileResumeFileInput.files?.[0];
    if (!file) return;
    importProfileSkillsFromResume(file);
  });

  // Add keyword
  const keywordsInput = document.getElementById('keywords-input');
  document.getElementById('add-keywords-btn').addEventListener('click', () => {
    const v = keywordsInput.value.trim().toLowerCase();
    if (v && !profileKeywords.includes(v)) {
      profileKeywords.push(v);
      profileStateLoaded = true;
      renderTags('keywords-tags', profileKeywords, removeKeyword);
    }
    keywordsInput.value = '';
    keywordsInput.focus();
  });
  keywordsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-keywords-btn').click();
  });

  // Add blacklist word
  const blacklistInput = document.getElementById('blacklist-input');
  document.getElementById('add-blacklist-btn').addEventListener('click', () => {
    const v = blacklistInput.value.trim().toLowerCase();
    if (v && !profileBlacklist.includes(v)) {
      profileBlacklist.push(v);
      profileStateLoaded = true;
      renderTags('blacklist-tags', profileBlacklist, removeBlacklistWord);
    }
    blacklistInput.value = '';
    blacklistInput.focus();
  });
  blacklistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-blacklist-btn').click();
  });

  // Save profile
  document.getElementById('save-profile-btn').addEventListener('click', saveProfile);

  // ---- Resume tab --------------------------------------------------------

  const resumeUploadArea = document.getElementById('resume-upload-area');
  const resumeFileInput  = document.getElementById('resume-file-input');

  document.getElementById('resume-pick-btn').addEventListener('click', () => {
    resumeFileInput.click();
  });

  resumeFileInput.addEventListener('change', () => {
    if (resumeFileInput.files[0]) handleResumeFile(resumeFileInput.files[0]);
  });

  resumeUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    resumeUploadArea.classList.add('resume-upload-area--drag');
  });
  resumeUploadArea.addEventListener('dragleave', () => {
    resumeUploadArea.classList.remove('resume-upload-area--drag');
  });
  resumeUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    resumeUploadArea.classList.remove('resume-upload-area--drag');
    const file = e.dataTransfer.files[0];
    if (file) handleResumeFile(file);
  });

  document.getElementById('ats-analyze-btn').addEventListener('click', runResumeAnalysisForSelectedJob);
  document.getElementById('ats-job-select').addEventListener('change', runResumeAnalysisForSelectedJob);

  document.getElementById('ats-download-btn').addEventListener('click', async () => {
    const select   = document.getElementById('ats-job-select');
    const job      = _resumeTabJobs[parseInt(select.value, 10)];
    const baseName = job ? `curriculo-ats-${job.site}-${Date.now()}` : `curriculo-ats-${Date.now()}`;

    if (resumeIsPDF) {
      downloadOriginalPDF(resumeOriginalBytes, `${baseName}.pdf`);
    } else {
      downloadOriginalDOCX(resumeOriginalFile, `${baseName}.docx`);
    }
  });

  // Load default tab
  ensureProfileExists().catch(() => {});
  loadProfileTab().catch(() => {});
  loadJobsTab();
});
