'use strict';

/**
 * Workaholic - Follow-up Message Builder
 *
 * Gera mensagem de acompanhamento para uma candidatura. Template-based
 * por enquanto (deterministic, offline). Hook deixado para troca por LLM
 * sem mudar a interface publica (decisao validada: "reusar prompt builder
 * com modo 'followup'" — quando LLM module existir, plugar aqui).
 *
 * API:
 *   buildFollowupMessage({ application, mode })
 *     application: record do applications.js
 *     mode: 'gentle' (default), 'direct', 'final'
 *   -> string PT-BR (1 paragrafo)
 *
 * Idioma: PT-BR fixo nesta versao. Adaptar via i18n quando popup ja faz EN.
 */

const FOLLOWUP_MODES = Object.freeze(['gentle', 'direct', 'final']);

const TEMPLATES_PT = {
  gentle: {
    freelancer:
      'Ola, tudo bem? Faz {dias} dias que enviei minha proposta para "{titulo}" e queria garantir que ela ficou visivel no seu painel. Estou disponivel para alinhar escopo e prazo nesta semana se fizer sentido. Posso responder qualquer duvida sobre minha experiencia direto neste chat.',
    recruiter:
      'Ola, tudo bem? Faz {dias} dias que me candidatei para "{titulo}" e gostaria de saber se a vaga ainda esta em processo seletivo. Estou disponivel para uma conversa rapida nesta semana caso facam sentido proximos passos.',
  },
  direct: {
    freelancer:
      'Ola. Reforcando minha proposta para "{titulo}" enviada ha {dias} dias. Posso comecar essa semana e entrego um plano inicial em 24h se aprovado. Aviso se ainda esta avaliando ou se a vaga ja foi preenchida?',
    recruiter:
      'Ola. Acompanhando minha candidatura para "{titulo}" enviada ha {dias} dias. Estou disponivel para entrevista nesta semana. Pode me indicar em que etapa o processo se encontra?',
  },
  final: {
    freelancer:
      'Ola. Faz {dias} dias que enviei minha proposta para "{titulo}" sem retorno. Vou arquivar este projeto do meu lado mas continuo disponivel se o escopo voltar a fazer sentido. Sucesso na contratacao.',
    recruiter:
      'Ola. Faz {dias} dias da minha candidatura para "{titulo}" sem retorno. Caso o processo tenha avancado para outros candidatos, agradeco a consideracao. Sigo aberto a oportunidades futuras.',
  },
};

const RECRUITER_PLATFORMS = new Set([
  'gupy', 'linkedin', 'indeed', 'vagas', 'catho',
]);

function _isRecruiterPlatform(plataforma) {
  if (!plataforma) return false;
  const k = String(plataforma).trim().toLowerCase();
  for (const r of RECRUITER_PLATFORMS) {
    if (k.includes(r)) return true;
  }
  return false;
}

function _daysSince(isoDate) {
  if (!isoDate) return 0;
  const sent = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(sent.getTime())) return 0;
  const ms = Date.now() - sent.getTime();
  return Math.max(1, Math.floor(ms / 86_400_000));
}

function _fill(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_m, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/**
 * Constroi a mensagem de follow-up.
 * @param {object} args
 * @param {object} args.application  - record do applications.js
 * @param {string} [args.mode]       - 'gentle' (default), 'direct', 'final'
 * @returns {string}
 */
function buildFollowupMessage({ application, mode = 'gentle' } = {}) {
  if (!application) throw new Error('buildFollowupMessage: application obrigatorio.');
  if (!FOLLOWUP_MODES.includes(mode)) mode = 'gentle';

  const variant = _isRecruiterPlatform(application.plataforma) ? 'recruiter' : 'freelancer';
  const tpl     = TEMPLATES_PT[mode][variant];

  const dias = _daysSince(application.data_envio);
  return _fill(tpl, {
    titulo: application.titulo || 'a vaga',
    dias,
  });
}

/**
 * Hook reservado para troca por LLM no futuro. Mesma interface.
 * Quando shared/llm-client.js existir, este wrapper delega.
 *
 * Por enquanto, retorna o template determinstico.
 */
async function buildFollowupMessageSmart(args) {
  return buildFollowupMessage(args);
}

const _exports = {
  FOLLOWUP_MODES,
  buildFollowupMessage,
  buildFollowupMessageSmart,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
}
if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, _exports);
}
