'use strict';

/**
 * Workaholic - Applications CRUD
 *
 * Camada de dados para o painel Kanban / CRM local.
 *
 * Split de storage (decisao validada):
 *   storage.local  -> applications_local: { [id]: full record }
 *                     todos os campos. Sem limite pratico.
 *   storage.sync   -> applications_sync:  { [id]: { status, plataforma, data_followup, updated_at } }
 *                     so projecao leve. Permite Kanban refletir status entre devices.
 *                     Limite ~1200 ids antes de estourar 100KB.
 *
 * Status enumerados (exato, sem acentos):
 *   Candidatado, Em Analise, Entrevista, Teste Tecnico,
 *   Proposta, Aprovado, Rejeitado, Arquivado
 *
 * Sem dependencia direta de storage.js. Modulo auto-contido.
 */

const STATUSES = Object.freeze([
  'Candidatado',
  'Em Analise',
  'Entrevista',
  'Teste Tecnico',
  'Proposta',
  'Aprovado',
  'Rejeitado',
  'Arquivado',
]);

const STATUS_SET = new Set(STATUSES);
const STATUS_ACTIVE = new Set([
  'Candidatado', 'Em Analise', 'Entrevista', 'Teste Tecnico', 'Proposta',
]);

const KEY_LOCAL = 'applications_local';
const KEY_SYNC  = 'applications_sync';

// Sync soft-cap. Mantemos so N ativos no sync para nao estourar 100KB.
const SYNC_MAX_ACTIVE = 500;

// ---------------------------------------------------------------------------
// Browser API detect (mesmo pattern de storage.js)
// ---------------------------------------------------------------------------

let _browserApi;
if (typeof browser !== 'undefined' && browser) {
  _browserApi = browser;
} else if (typeof chrome !== 'undefined' && chrome) {
  _browserApi = chrome;
} else {
  throw new Error('applications.js: No browser API available.');
}

const _localGet  = (k) => _browserApi.storage.local.get(k);
const _localSet  = (d) => _browserApi.storage.local.set(d);
const _syncGet   = (k) => _browserApi.storage.sync.get(k);
const _syncSet   = (d) => _browserApi.storage.sync.set(d);

// ---------------------------------------------------------------------------
// Internos
// ---------------------------------------------------------------------------

async function _readLocalMap() {
  const r = await _localGet(KEY_LOCAL);
  return r[KEY_LOCAL] && typeof r[KEY_LOCAL] === 'object' ? r[KEY_LOCAL] : {};
}

async function _writeLocalMap(map) {
  await _localSet({ [KEY_LOCAL]: map });
}

async function _readSyncMap() {
  try {
    const r = await _syncGet(KEY_SYNC);
    return r[KEY_SYNC] && typeof r[KEY_SYNC] === 'object' ? r[KEY_SYNC] : {};
  } catch {
    return {};
  }
}

async function _writeSyncMap(map) {
  try {
    await _syncSet({ [KEY_SYNC]: map });
  } catch {
    // storage.sync indisponivel ou quota estourada -> ignorar.
    // local continua sendo source of truth.
  }
}

function _projection(rec) {
  return {
    status:        rec.status,
    plataforma:    rec.plataforma,
    data_followup: rec.data_followup,
    updated_at:    rec.updated_at,
  };
}

function _enforceSyncCap(syncMap) {
  const ids = Object.keys(syncMap);
  if (ids.length <= SYNC_MAX_ACTIVE) return syncMap;

  // Mantem os SYNC_MAX_ACTIVE com updated_at mais recente,
  // priorizando ativos sobre finalizados.
  const sorted = ids
    .map((id) => ({ id, ...syncMap[id] }))
    .sort((a, b) => {
      const aActive = STATUS_ACTIVE.has(a.status) ? 1 : 0;
      const bActive = STATUS_ACTIVE.has(b.status) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return (b.updated_at || '').localeCompare(a.updated_at || '');
    })
    .slice(0, SYNC_MAX_ACTIVE);

  const out = {};
  for (const { id, ...rest } of sorted) out[id] = rest;
  return out;
}

function _newId() {
  // crypto.randomUUID disponivel em SW (Chrome 92+, FF 95+)
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback simples
  return `app_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function _todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function _nowIso() {
  return new Date().toISOString();
}

function _normalizeLink(link) {
  if (!link) return '';
  return String(link).trim().toLowerCase().replace(/[#?].*$/, '').replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

/**
 * Cria uma candidatura. Dedupe automatico por (link normalizado) ou
 * fallback (plataforma+titulo+empresa) quando link ausente.
 *
 * @param {object} input
 * @param {string} input.titulo
 * @param {string} [input.empresa]       opcional — job schema do scraper nao tem
 * @param {string} input.plataforma
 * @param {string} [input.link]
 * @param {string} [input.descricao_vaga]
 * @param {string} [input.pitch_inicial]
 * @param {string} [input.data_envio]    ISO YYYY-MM-DD; default hoje
 * @param {string} [input.data_followup] ISO YYYY-MM-DD; default: calcFollowupDate
 * @param {string} [input.status]        default 'Candidatado'
 * @returns {Promise<{record: object, duplicate: boolean}>}
 */
async function addApplication(input) {
  if (!input || !input.titulo || !input.plataforma) {
    throw new Error('addApplication: titulo e plataforma sao obrigatorios.');
  }
  // empresa opcional — job schema da extensao nao tem company/client field.
  // Usuario pode preencher manualmente no painel Kanban depois.

  const status = input.status || 'Candidatado';
  if (!STATUS_SET.has(status)) {
    throw new Error(`addApplication: status invalido "${status}".`);
  }

  // Calcula follow-up via shared/followup-rules.js (deve estar em globalThis).
  const fallbackFollowup =
    typeof globalThis.calcFollowupDate === 'function'
      ? globalThis.calcFollowupDate(input.plataforma)
      : null;

  const data_envio    = input.data_envio    || _todayIso();
  const data_followup = input.data_followup || fallbackFollowup || _todayIso();

  const localMap = await _readLocalMap();

  // Dedupe
  const linkKey = _normalizeLink(input.link);
  const dupId = Object.keys(localMap).find((id) => {
    const r = localMap[id];
    if (linkKey && _normalizeLink(r.link) === linkKey) return true;
    if (!linkKey) {
      return (
        r.plataforma === input.plataforma &&
        r.titulo     === input.titulo &&
        r.empresa    === input.empresa
      );
    }
    return false;
  });

  if (dupId) {
    return { record: localMap[dupId], duplicate: true };
  }

  const id = _newId();
  const rec = {
    id,
    titulo:         input.titulo,
    empresa:        input.empresa || '',
    plataforma:     input.plataforma,
    link:           input.link || '',
    descricao_vaga: input.descricao_vaga || '',
    pitch_inicial:  input.pitch_inicial  || '',
    pitch_regenerado_em: null,
    status,
    data_envio,
    data_followup,
    notificado_em:  null,
    updated_at:     _nowIso(),
  };

  localMap[id] = rec;
  await _writeLocalMap(localMap);

  const syncMap = await _readSyncMap();
  syncMap[id] = _projection(rec);
  await _writeSyncMap(_enforceSyncCap(syncMap));

  return { record: rec, duplicate: false };
}

/**
 * Atualiza o status de uma candidatura.
 * @returns {Promise<object>} record atualizado
 */
async function updateApplicationStatus(id, novoStatus) {
  if (!STATUS_SET.has(novoStatus)) {
    throw new Error(`updateApplicationStatus: status invalido "${novoStatus}".`);
  }
  const localMap = await _readLocalMap();
  const rec = localMap[id];
  if (!rec) throw new Error(`updateApplicationStatus: id ${id} nao existe.`);

  rec.status     = novoStatus;
  rec.updated_at = _nowIso();
  localMap[id] = rec;
  await _writeLocalMap(localMap);

  const syncMap = await _readSyncMap();
  syncMap[id] = _projection(rec);
  await _writeSyncMap(_enforceSyncCap(syncMap));

  return rec;
}

/**
 * Patch arbitrario em uma candidatura (titulo, pitch, datas, etc.).
 * Nao permite trocar id. Sempre bumpa updated_at.
 * @returns {Promise<object>}
 */
async function patchApplication(id, patch) {
  const localMap = await _readLocalMap();
  const rec = localMap[id];
  if (!rec) throw new Error(`patchApplication: id ${id} nao existe.`);

  const next = { ...rec, ...patch, id, updated_at: _nowIso() };
  if (patch && patch.status && !STATUS_SET.has(patch.status)) {
    throw new Error(`patchApplication: status invalido "${patch.status}".`);
  }
  localMap[id] = next;
  await _writeLocalMap(localMap);

  const syncMap = await _readSyncMap();
  syncMap[id] = _projection(next);
  await _writeSyncMap(_enforceSyncCap(syncMap));

  return next;
}

/**
 * Substitui o pitch da candidatura. Marca o timestamp da regeneracao.
 */
async function setApplicationPitch(id, pitch) {
  return patchApplication(id, {
    pitch_inicial:        pitch,
    pitch_regenerado_em:  _nowIso(),
  });
}

/**
 * Remove uma candidatura (local + sync).
 */
async function deleteApplication(id) {
  const localMap = await _readLocalMap();
  if (!(id in localMap)) return false;
  delete localMap[id];
  await _writeLocalMap(localMap);

  const syncMap = await _readSyncMap();
  if (id in syncMap) {
    delete syncMap[id];
    await _writeSyncMap(syncMap);
  }
  return true;
}

/**
 * Busca uma candidatura por id.
 * @returns {Promise<object|null>}
 */
async function getApplication(id) {
  const localMap = await _readLocalMap();
  return localMap[id] || null;
}

/**
 * Lista candidaturas ordenadas por data_envio DESC.
 * @param {object} [opts]
 * @param {string} [opts.status] filtra por status exato
 * @returns {Promise<object[]>}
 */
async function listApplications(opts = {}) {
  const localMap = await _readLocalMap();
  let rows = Object.values(localMap);
  if (opts.status) rows = rows.filter((r) => r.status === opts.status);
  rows.sort((a, b) => (b.data_envio || '').localeCompare(a.data_envio || ''));
  return rows;
}

/**
 * Retorna todas as candidaturas com data_followup <= hoje e ainda
 * em status ativo, que NAO foram notificadas ainda.
 * @returns {Promise<object[]>}
 */
async function listDueForFollowup() {
  const today = _todayIso();
  const all = await listApplications();
  return all.filter(
    (r) =>
      STATUS_ACTIVE.has(r.status) &&
      r.data_followup &&
      r.data_followup <= today &&
      !r.notificado_em
  );
}

/**
 * Marca candidatura como ja notificada agora. Idempotente.
 */
async function markNotified(id) {
  return patchApplication(id, { notificado_em: _nowIso() });
}

/**
 * Export para backup. Retorna objeto serializavel.
 */
async function exportApplications() {
  const localMap = await _readLocalMap();
  return {
    version: 1,
    exported_at: _nowIso(),
    applications: Object.values(localMap),
  };
}

/**
 * Importa backup. Merge: nao apaga existentes. Skipa ids ja presentes.
 * @returns {Promise<{ imported: number, skipped: number }>}
 */
async function importApplications(payload) {
  if (!payload || !Array.isArray(payload.applications)) {
    throw new Error('importApplications: payload invalido.');
  }
  const localMap = await _readLocalMap();
  let imported = 0, skipped = 0;
  for (const rec of payload.applications) {
    if (!rec.id || localMap[rec.id]) { skipped++; continue; }
    if (!STATUS_SET.has(rec.status)) { skipped++; continue; }
    localMap[rec.id] = rec;
    imported++;
  }
  await _writeLocalMap(localMap);

  // Reconstroi sync map a partir do local
  const syncMap = {};
  for (const rec of Object.values(localMap)) syncMap[rec.id] = _projection(rec);
  await _writeSyncMap(_enforceSyncCap(syncMap));

  return { imported, skipped };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const _exports = {
  STATUSES,
  STATUS_ACTIVE,
  SYNC_MAX_ACTIVE,
  addApplication,
  updateApplicationStatus,
  patchApplication,
  setApplicationPitch,
  deleteApplication,
  getApplication,
  listApplications,
  listDueForFollowup,
  markNotified,
  exportApplications,
  importApplications,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
}
if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, _exports);
}
