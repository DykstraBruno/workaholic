'use strict';

/**
 * Workaholic - Follow-up Rules
 *
 * Tabela de dias para follow-up por plataforma. Dado, nao logica:
 * facilita ajustar sem mexer em CRUD.
 */

// Lowercase keys. Lookup faz lowercase tambem.
const FOLLOWUP_DAYS_BY_PLATFORM = {
  // Freelancer-style (resposta rapida esperada)
  upwork:        3,
  workana:       3,
  freelancer:    3,
  fiverr:        3,
  '99freelas':   3,
  guru:          3,
  toptal:        3,
  peopleperhour: 5,
  weworkremotely: 5,

  // Recruiter-style (ciclos mais longos)
  gupy:     7,
  linkedin: 7,
  indeed:   5,
};

const FOLLOWUP_DAYS_DEFAULT = 7;

/**
 * Quantos dias adicionar para o follow-up de uma plataforma.
 * @param {string} plataforma
 * @returns {number}
 */
function followupDaysFor(plataforma) {
  if (!plataforma) return FOLLOWUP_DAYS_DEFAULT;
  const key = String(plataforma).trim().toLowerCase();
  if (key in FOLLOWUP_DAYS_BY_PLATFORM) return FOLLOWUP_DAYS_BY_PLATFORM[key];

  // Match parcial (ex: "Upwork Talent" -> "upwork")
  for (const k of Object.keys(FOLLOWUP_DAYS_BY_PLATFORM)) {
    if (key.includes(k)) return FOLLOWUP_DAYS_BY_PLATFORM[k];
  }
  return FOLLOWUP_DAYS_DEFAULT;
}

/**
 * Data de follow-up no formato ISO YYYY-MM-DD.
 * @param {string} plataforma
 * @param {Date} [base] - default = hoje
 * @returns {string}
 */
function calcFollowupDate(plataforma, base) {
  const start = base instanceof Date ? new Date(base) : new Date();
  const days  = followupDaysFor(plataforma);
  start.setDate(start.getDate() + days);
  return start.toISOString().slice(0, 10);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FOLLOWUP_DAYS_BY_PLATFORM,
    FOLLOWUP_DAYS_DEFAULT,
    followupDaysFor,
    calcFollowupDate,
  };
}

if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, {
    FOLLOWUP_DAYS_BY_PLATFORM,
    FOLLOWUP_DAYS_DEFAULT,
    followupDaysFor,
    calcFollowupDate,
  });
}
