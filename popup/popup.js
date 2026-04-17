'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEYS = {
  PROFILE:       'profile',
  JOBS:          'jobs',
  LAST_FETCH:    'lastFetch',
  HEALTH_PREFIX: 'health_',
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
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

function syncGet(keys) {
  return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
}

function syncSet(data) {
  return new Promise((resolve) => chrome.storage.sync.set(data, resolve));
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
  const result = await localGet([KEYS.JOBS, KEYS.LAST_FETCH]);
  const jobs      = result[KEYS.JOBS]       ?? [];
  const lastFetch = result[KEYS.LAST_FETCH] ?? null;

  const timeAgo = formatTimeAgo(lastFetch);
  document.getElementById('last-fetch').textContent =
    timeAgo ? `Última busca: ${timeAgo}` : 'Nenhuma busca realizada';

  await renderHealthWarnings();
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

function defaultProfile() {
  return {
    skills: [], area: 'development', minBudget: null, currency: 'BRL',
    languages: ['pt', 'en'], blacklist: [],
    sites: Object.fromEntries(SITES.map((s) => [s, true])),
    fetchInterval: 1,
  };
}

async function loadProfileTab() {
  const result  = await syncGet(KEYS.PROFILE);
  const profile = result[KEYS.PROFILE] ?? defaultProfile();

  profileSkills    = [...(profile.skills    ?? [])];
  profileBlacklist = [...(profile.blacklist ?? [])];

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
  renderTags('skills-tags', profileSkills, removeSkill);
}

function removeBlacklistWord(word) {
  profileBlacklist = profileBlacklist.filter((w) => w !== word);
  renderTags('blacklist-tags', profileBlacklist, removeBlacklistWord);
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
  const minBudgetRaw = document.getElementById('profile-min-budget').value;
  const profile = {
    skills:       profileSkills,
    area:         document.getElementById('profile-area').value,
    minBudget:    minBudgetRaw ? parseFloat(minBudgetRaw) : null,
    currency:     document.getElementById('profile-currency').value,
    languages:    ['pt', 'en'],
    blacklist:    profileBlacklist,
    sites:        Object.fromEntries(
      SITES.map((s) => [s, document.getElementById(`site-${s}`).checked])
    ),
    fetchInterval: parseInt(document.getElementById('profile-interval').value, 10),
  };

  await syncSet({ [KEYS.PROFILE]: profile });

  const btn = document.getElementById('save-profile-btn');
  const original = btn.textContent;
  btn.textContent = 'Perfil salvo!';
  btn.classList.add('btn--success');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('btn--success');
  }, 2000);
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
  fetchBtn.addEventListener('click', () => {
    fetchBtn.disabled    = true;
    fetchBtn.textContent = 'Buscando…';
    chrome.runtime.sendMessage({ type: 'FETCH_NOW' }, () => {
      fetchBtn.disabled    = false;
      fetchBtn.textContent = 'Buscar agora';
      setTimeout(loadJobsTab, 800);
    });
  });

  // Add skill
  const skillInput = document.getElementById('skill-input');
  document.getElementById('add-skill-btn').addEventListener('click', () => {
    const v = skillInput.value.trim().toLowerCase();
    if (v && !profileSkills.includes(v)) {
      profileSkills.push(v);
      renderTags('skills-tags', profileSkills, removeSkill);
    }
    skillInput.value = '';
    skillInput.focus();
  });
  skillInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-skill-btn').click();
  });

  // Add blacklist word
  const blacklistInput = document.getElementById('blacklist-input');
  document.getElementById('add-blacklist-btn').addEventListener('click', () => {
    const v = blacklistInput.value.trim().toLowerCase();
    if (v && !profileBlacklist.includes(v)) {
      profileBlacklist.push(v);
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
  loadJobsTab();
});
