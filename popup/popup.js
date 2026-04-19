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
const MAX_PROFILE_SKILLS = 20;

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
    if (out.length >= MAX_PROFILE_SKILLS) break;
  }

  return out;
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

  if (tab === 'jobs') loadJobsTab();
  else loadProfileTab();
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
    empty.hidden    = false;
    return;
  }

  empty.hidden = true;
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

    if (profileSkills.length >= MAX_PROFILE_SKILLS) {
      skillInput.value = '';
      skillInput.placeholder = `Limite de ${MAX_PROFILE_SKILLS} habilidades atingido`;
      setTimeout(() => {
        skillInput.placeholder = 'ex: react, python…';
      }, 1800);
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

  // Load default tab
  ensureProfileExists().catch(() => {});
  loadProfileTab().catch(() => {});
  loadJobsTab();
});
