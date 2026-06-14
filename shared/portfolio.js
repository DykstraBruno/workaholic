'use strict';

/**
 * Workaholic - Portfolio CRUD
 *
 * Projetos do usuario para match com vagas e geracao de pitch.
 * Tudo em storage.local (raramente muda, sem necessidade de sync).
 *
 * Record:
 *   { id, nome_projeto, tags:[], link_projeto, descricao, updated_at }
 */

const KEY_PORTFOLIO = 'portfolio';

// ---------------------------------------------------------------------------
// Browser API detect
// ---------------------------------------------------------------------------

let _browserApi;
if (typeof browser !== 'undefined' && browser) {
  _browserApi = browser;
} else if (typeof chrome !== 'undefined' && chrome) {
  _browserApi = chrome;
} else {
  throw new Error('portfolio.js: No browser API available.');
}

const _localGet = (k) => _browserApi.storage.local.get(k);
const _localSet = (d) => _browserApi.storage.local.set(d);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function _readMap() {
  const r = await _localGet(KEY_PORTFOLIO);
  return r[KEY_PORTFOLIO] && typeof r[KEY_PORTFOLIO] === 'object' ? r[KEY_PORTFOLIO] : {};
}

async function _writeMap(map) {
  await _localSet({ [KEY_PORTFOLIO]: map });
}

function _newId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function _nowIso() {
  return new Date().toISOString();
}

/**
 * Aceita string CSV ou array; devolve array limpo de strings unicas.
 */
function _normalizeTags(input) {
  if (input == null) return [];
  let arr;
  if (typeof input === 'string') {
    arr = input.split(',');
  } else if (Array.isArray(input)) {
    arr = input;
  } else {
    return [];
  }
  const seen = new Set();
  const out  = [];
  for (const t of arr) {
    const v = String(t).trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

/**
 * Cria um projeto.
 * @param {object} input
 * @param {string} input.nome_projeto
 * @param {string|string[]} [input.tags]
 * @param {string} [input.link_projeto]
 * @param {string} [input.descricao]
 * @returns {Promise<object>}
 */
async function addProject(input) {
  if (!input || !input.nome_projeto) {
    throw new Error('addProject: nome_projeto obrigatorio.');
  }
  const map = await _readMap();
  const id  = _newId();
  const rec = {
    id,
    nome_projeto: input.nome_projeto,
    tags:         _normalizeTags(input.tags),
    link_projeto: input.link_projeto || '',
    descricao:    input.descricao    || '',
    updated_at:   _nowIso(),
  };
  map[id] = rec;
  await _writeMap(map);
  return rec;
}

/**
 * Atualiza campos arbitrarios.
 */
async function patchProject(id, patch) {
  const map = await _readMap();
  const cur = map[id];
  if (!cur) throw new Error(`patchProject: id ${id} nao existe.`);
  const next = {
    ...cur,
    ...patch,
    id,
    tags: patch && 'tags' in patch ? _normalizeTags(patch.tags) : cur.tags,
    updated_at: _nowIso(),
  };
  map[id] = next;
  await _writeMap(map);
  return next;
}

/**
 * Remove projeto. Retorna true se removido, false se nao existia.
 */
async function deleteProject(id) {
  const map = await _readMap();
  if (!(id in map)) return false;
  delete map[id];
  await _writeMap(map);
  return true;
}

async function getProject(id) {
  const map = await _readMap();
  return map[id] || null;
}

/**
 * Lista projetos. Ordenacao: updated_at DESC.
 * @returns {Promise<object[]>}
 */
async function listProjects() {
  const map = await _readMap();
  const rows = Object.values(map);
  rows.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  return rows;
}

async function exportProjects() {
  const map = await _readMap();
  return {
    version:     1,
    exported_at: _nowIso(),
    projects:    Object.values(map),
  };
}

async function importProjects(payload) {
  if (!payload || !Array.isArray(payload.projects)) {
    throw new Error('importProjects: payload invalido.');
  }
  const map = await _readMap();
  let imported = 0, skipped = 0;
  for (const rec of payload.projects) {
    if (!rec.id || !rec.nome_projeto) { skipped++; continue; }
    if (map[rec.id]) { skipped++; continue; }
    map[rec.id] = {
      ...rec,
      tags: _normalizeTags(rec.tags),
    };
    imported++;
  }
  await _writeMap(map);
  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const _exports = {
  addProject,
  patchProject,
  deleteProject,
  getProject,
  listProjects,
  exportProjects,
  importProjects,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
}
if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, _exports);
}
