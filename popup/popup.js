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
  LANG:             'lang',
  APPLIED_JOBS:     'appliedJobs',
};

const SITES = ['upwork', 'workana', 'freelas99', 'linkedin', 'indeed', 'gupy', 'freelancer', 'weworkremotely', 'peopleperhour', 'guru'];

// ---------------------------------------------------------------------------
// Internationalization
// ---------------------------------------------------------------------------

let currentLang = 'pt';

// Applied jobs — persisted Set of job URLs the user has applied to
let appliedJobs = new Set();

/* eslint-disable object-curly-newline */
const TRANSLATIONS = {
  pt: {
    tabJobs: 'Vagas', tabProfile: 'Perfil', tabResume: 'Currículo',
    fetchNow: 'Buscar agora', fetching: 'Buscando…',
    emptyState: 'Nenhuma vaga encontrada. Clique em "Buscar agora" para atualizar.',
    languageLabel: 'Idioma',
    lastFetchPrefix: (ago) => `Última busca: ${ago}`,
    scraperBroken: (site) => `⚠ Scraper do ${site} pode estar quebrado`,
    diagTitle: 'Diagnóstico da última busca',
    diagCapt: 'capturadas', diagFilter: 'após filtro',
    diagSkills: 'Skills no perfil', diagLogin: 'login', diagFail: 'falha',
    diagRaw: 'brutas', diagMatch: 'match',
    skillsLabel: 'Habilidades', skillsPlaceholder: 'ex: react, python…',
    addBtn: 'Adicionar', importFromResume: 'Importar do currículo',
    areaLabel: 'Área', areaDevelopment: 'Desenvolvimento', areaDesign: 'Design',
    areaMarketing: 'Marketing', areaWriting: 'Redação', areaData: 'Dados', areaMobile: 'Mobile',
    budgetLabel: 'Orçamento mínimo',
    keywordsLabel: 'Palavras-chave / Cargo', keywordsPlaceholder: 'ex: desenvolvedor, frontend…',
    keywordsHint: 'Usa essas palavras para buscar vagas direto nos sites. Se vazio, usa a Área como termo base.',
    blacklistLabel: 'Palavras bloqueadas', blacklistPlaceholder: 'ex: urgente, estágio…',
    blacklistHint: 'Vagas com essas palavras no título são excluídas.',
    platformsLabel: 'Plataformas', frequencyLabel: 'Frequência de busca',
    freq1min: '1 minuto', freq30min: '30 minutos', freq1h: '1 hora',
    freq3h: '3 horas', freq6h: '6 horas', freq1d: '1 vez por dia',
    saveProfile: 'Salvar', profileSaved: 'Perfil salvo!', removeTag: 'Remover',
    uploadHint: 'Arraste um PDF ou DOCX aqui,\nou clique para selecionar',
    pickFile: 'Selecionar arquivo', jobForOptimize: 'Vaga para otimizar',
    scoreBefore: 'Antes', scoreAfter: 'Depois',
    skillMatchLabel: 'Match de skills da vaga',
    missingForPerfect: 'Faltando para match perfeito',
    missingInjected: 'Palavras-chave ausentes injetadas',
    analyzeBtn: 'Analisar',
    docxNote: 'DOCX: o resultado sera exportado em PDF com layout simplificado. Para preservar layout original, use um PDF de entrada.',
    downloadBtn: 'Baixar currículo otimizado (PDF)',
    noJobFound: '— Nenhuma vaga encontrada —',
    noSkillsExtracted: 'Não foi possível extrair requisitos suficientes desta vaga para calcular o match de skills.',
    skillsMatchSummary: (matched, total, score) => `${matched} de ${total} habilidades da vaga em match (${score}%).`,
    noSkillsInResume: 'Nenhuma habilidade nova encontrada no currículo.',
    skillsImported: (added) => `${added} habilidade${added > 1 ? 's' : ''} importada${added > 1 ? 's' : ''} e salva${added > 1 ? 's' : ''} no perfil.`,
    importError: (msg) => `Erro ao importar currículo: ${msg}`,
    fetchError: (msg) => `Erro na busca: ${msg}`,
    fetchFailed: 'Falha ao executar a busca.',
    loginRequired: (label) => `Login necessário no ${label}. A página foi aberta e a busca continuará automaticamente depois que você entrar.`,
    noSkillsInProfile: 'Busca concluída. Foram capturadas vagas, mas seu perfil está sem skills. Abra a aba Perfil, adicione habilidades (ex: react, node, python) e clique em Buscar agora novamente.',
    noJobsMatched: 'Busca concluída. Nenhuma vaga combinou com os filtros atuais.',
    jobsFound: (count) => `Busca concluída. ${count} vaga${count > 1 ? 's' : ''} encontrada${count > 1 ? 's' : ''}.`,
    generateError: 'Não foi possível gerar o conteúdo otimizado do currículo.',
    downloadFail: (msg) => `Falha ao gerar currículo otimizado: ${msg}`,
    unsupportedFormat: 'Formato não suportado. Use PDF ou DOCX.',
    processingHint: 'processando…',
    processingFile: (name) => `Processando ${name}...`,
    justNow: 'agora mesmo',
    minutesAgo: (n) => `há ${n} minuto${n > 1 ? 's' : ''}`,
    hoursAgo: (n) => `há ${n} hora${n > 1 ? 's' : ''}`,
    daysAgo: (n) => `há ${n} dia${n > 1 ? 's' : ''}`,
    appliedMark: 'Marcar como candidatado',
    appliedUnmark: 'Desmarcar candidatura',
    appliedBadge: 'Candidatado',
  },
  en: {
    tabJobs: 'Jobs', tabProfile: 'Profile', tabResume: 'Resume',
    fetchNow: 'Fetch now', fetching: 'Fetching…',
    emptyState: 'No jobs found. Click "Fetch now" to refresh.',
    languageLabel: 'Language',
    lastFetchPrefix: (ago) => `Last search: ${ago}`,
    scraperBroken: (site) => `⚠ ${site} scraper may be broken`,
    diagTitle: 'Last search diagnostics',
    diagCapt: 'captured', diagFilter: 'after filter',
    diagSkills: 'Profile skills', diagLogin: 'login', diagFail: 'failed',
    diagRaw: 'raw', diagMatch: 'match',
    skillsLabel: 'Skills', skillsPlaceholder: 'e.g. react, python…',
    addBtn: 'Add', importFromResume: 'Import from resume',
    areaLabel: 'Area', areaDevelopment: 'Development', areaDesign: 'Design',
    areaMarketing: 'Marketing', areaWriting: 'Writing', areaData: 'Data', areaMobile: 'Mobile',
    budgetLabel: 'Minimum budget',
    keywordsLabel: 'Keywords / Job title', keywordsPlaceholder: 'e.g. developer, frontend…',
    keywordsHint: 'These words are used to search for jobs on each site. If empty, the Area is used as the base term.',
    blacklistLabel: 'Blocked words', blacklistPlaceholder: 'e.g. urgent, internship…',
    blacklistHint: 'Jobs with these words in the title are excluded.',
    platformsLabel: 'Platforms', frequencyLabel: 'Search frequency',
    freq1min: '1 minute', freq30min: '30 minutes', freq1h: '1 hour',
    freq3h: '3 hours', freq6h: '6 hours', freq1d: 'Once a day',
    saveProfile: 'Save', profileSaved: 'Profile saved!', removeTag: 'Remove',
    uploadHint: 'Drag a PDF or DOCX here,\nor click to select',
    pickFile: 'Select file', jobForOptimize: 'Job to optimize for',
    scoreBefore: 'Before', scoreAfter: 'After',
    skillMatchLabel: 'Job skill match',
    missingForPerfect: 'Missing for perfect match',
    missingInjected: 'Injected missing keywords',
    analyzeBtn: 'Analyze',
    docxNote: 'DOCX: the result will be exported as a simplified PDF layout. To preserve the original layout, use a PDF input.',
    downloadBtn: 'Download optimized resume (PDF)',
    noJobFound: '— No jobs found —',
    noSkillsExtracted: 'Could not extract enough requirements from this job to calculate skill match.',
    skillsMatchSummary: (matched, total, score) => `${matched} of ${total} job skills matched (${score}%).`,
    noSkillsInResume: 'No new skills found in the resume.',
    skillsImported: (added) => `${added} skill${added > 1 ? 's' : ''} imported and saved to profile.`,
    importError: (msg) => `Error importing resume: ${msg}`,
    fetchError: (msg) => `Search error: ${msg}`,
    fetchFailed: 'Failed to execute the search.',
    loginRequired: (label) => `Login required on ${label}. The page has been opened — search will continue automatically after you log in.`,
    noSkillsInProfile: 'Search complete. Jobs were found, but your profile has no skills. Open the Profile tab, add skills (e.g. react, node, python) and click Fetch now again.',
    noJobsMatched: 'Search complete. No jobs matched the current filters.',
    jobsFound: (count) => `Search complete. ${count} job${count > 1 ? 's' : ''} found.`,
    generateError: 'Could not generate the optimized resume content.',
    downloadFail: (msg) => `Failed to generate optimized resume: ${msg}`,
    unsupportedFormat: 'Unsupported format. Use PDF or DOCX.',
    processingHint: 'processing…',
    processingFile: (name) => `Processing ${name}...`,
    justNow: 'just now',
    minutesAgo: (n) => `${n} minute${n > 1 ? 's' : ''} ago`,
    hoursAgo: (n) => `${n} hour${n > 1 ? 's' : ''} ago`,
    daysAgo: (n) => `${n} day${n > 1 ? 's' : ''} ago`,
    appliedMark: 'Mark as applied',
    appliedUnmark: 'Unmark application',
    appliedBadge: 'Applied',
  },
};
/* eslint-enable object-curly-newline */

function t(key, ...args) {
  const val = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.pt[key];
  if (typeof val === 'function') return val(...args);
  return val ?? key;
}

function applyTranslations() {
  const dict = TRANSLATIONS[currentLang];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const val = dict[key];
    if (typeof val === 'string') el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    const val = dict[key];
    if (typeof val === 'string') el.placeholder = val;
  });

  // Header lang button: show flag + code of the OTHER language
  const langBtn = document.getElementById('lang-btn');
  if (langBtn) {
    if (currentLang === 'pt') {
      langBtn.innerHTML = '<span class="lang-flag">🇺🇸</span> EN';
      langBtn.setAttribute('aria-label', 'Switch to English');
    } else {
      langBtn.innerHTML = '<span class="lang-flag">🇧🇷</span> PT';
      langBtn.setAttribute('aria-label', 'Mudar para Português');
    }
  }

  // Profile lang toggle: highlight active option
  document.querySelectorAll('.lang-toggle-opt').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });

  document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : 'en';
}

const SITE_LABELS = {
  upwork:         'Upwork',
  workana:        'Workana',
  freelas99:      '99Freelas',
  linkedin:       'LinkedIn',
  indeed:         'Indeed',
  gupy:           'Gupy',
  freelancer:     'Freelancer',
  weworkremotely: 'We Work Remotely',
  peopleperhour:  'PeoplePerHour',
  guru:           'Guru',
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

function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function saveProfileWithFallback(profile) {
  await localSet({ [KEYS.PROFILE_LOCAL]: profile });
  try {
    await syncSet({ [KEYS.PROFILE]: profile });
  } catch {
    // Sync pode falhar por limite/permissao; mantemos cache local.
  }
}

async function getProfileWithFallback() {
  try {
    const syncResult = await syncGet(KEYS.PROFILE);
    const syncProfile = syncResult?.[KEYS.PROFILE] ?? null;
    if (syncProfile) {
      await localSet({ [KEYS.PROFILE_LOCAL]: syncProfile });
      return syncProfile;
    }
  } catch {
    // Falha de sync: segue com cache local.
  }

  const localResult = await localGet(KEYS.PROFILE_LOCAL);
  return localResult?.[KEYS.PROFILE_LOCAL] ?? null;
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

function formatTimeAgo(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return t('justNow');
  if (mins < 60)  return t('minutesAgo', mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return t('hoursAgo', hrs);
  const days = Math.floor(hrs / 24);
  return t('daysAgo', days);
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

  const sectionText = extractResumeSkillsSectionText(text);
  const fromSection = extractSkillsFromTextChunk(sectionText);
  if (fromSection.length) return fromSection;

  return extractSkillsFromTextChunk(text);
}

function extractSkillsFromTextChunk(text) {
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

function splitResumeLines(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim());
}

function findResumeSkillsSection(lines) {
  const headingRe = /^(?:\d+[.)-]\s*)?(technical skills?|skills?|habilidades? t[eé]cnicas?|habilidades?|compet[eê]ncias? t[eé]cnicas?|compet[eê]ncias?|tecnologias?|tech stack|stack t[eé]cnico|conhecimentos? t[eé]cnicos?)(?:\s*[:\-–—]\s*(.*))?$/i;
  const nextSectionRe = /^(?:\d+[.)-]\s*)?(resumo|summary|perfil|sobre|experi[eê]ncia|experience|educa[cç][aã]o|education|forma[cç][aã]o|projetos?|projects?|certifica[cç][oõ]es?|certifications?|idiomas?|languages?|contato|contact|objetivo|objective|atividades|responsabilidades|publica[cç][oõ]es?|achievements?)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const match = line.match(headingRe);
    if (!match) continue;

    const inlineBody = String(match[2] || '').trim();
    let end = i + 1;
    while (end < lines.length) {
      const candidate = lines[end];
      if (candidate && nextSectionRe.test(candidate)) break;
      end++;
      if (end - i > 30) break;
    }

    return { start: i, end, inlineBody };
  }

  return null;
}

function extractResumeSkillsSectionText(text) {
  const lines = splitResumeLines(text);
  const section = findResumeSkillsSection(lines);
  if (!section) return '';

  const out = [];
  if (section.inlineBody) out.push(section.inlineBody);

  for (let i = section.start + 1; i < section.end; i++) {
    const line = lines[i];
    if (!line) continue;
    out.push(line);
  }

  return out.join('\n').trim();
}

const ATS_DEFAULT_SKILL_CATEGORIES = [
  'Linguagens e Frameworks',
  'Dados e Analise',
  'Cloud e Infraestrutura',
  'Ferramentas e Plataformas',
  'Outras Competencias Tecnicas',
];

const ATS_ACRONYM_DISPLAY = {
  api: 'API',
  apis: 'APIs',
  ai: 'AI',
  aws: 'AWS',
  ci: 'CI',
  cd: 'CD',
  css: 'CSS',
  css3: 'CSS3',
  dax: 'DAX',
  devops: 'DevOps',
  etl: 'ETL',
  github: 'GitHub',
  gitlab: 'GitLab',
  gcp: 'GCP',
  html: 'HTML',
  html5: 'HTML5',
  http: 'HTTP',
  https: 'HTTPS',
  ia: 'IA',
  ios: 'iOS',
  jdbc: 'JDBC',
  jest: 'Jest',
  jpa: 'JPA',
  json: 'JSON',
  jwt: 'JWT',
  kubernetes: 'Kubernetes',
  llm: 'LLM',
  mongodb: 'MongoDB',
  mysql: 'MySQL',
  nestjs: 'NestJS',
  nextjs: 'Next.js',
  node: 'Node.js',
  nodejs: 'Node.js',
  nosql: 'NoSQL',
  oauth: 'OAuth',
  pandas: 'pandas',
  pdf: 'PDF',
  php: 'PHP',
  postgresql: 'PostgreSQL',
  powerbi: 'Power BI',
  powerquery: 'Power Query',
  reactjs: 'React',
  redis: 'Redis',
  rds: 'Amazon RDS',
  rest: 'REST',
  restful: 'RESTful',
  restapi: 'REST API',
  restapis: 'REST APIs',
  aurora: 'Amazon Aurora',
  lambda: 'AWS Lambda',
  s3: 'Amazon S3',
  sql: 'SQL',
  sqlite: 'SQLite',
  typescript: 'TypeScript',
  ui: 'UI',
  ux: 'UX',
  vite: 'Vite',
  vitest: 'Vitest',
  websocket: 'WebSocket',
};

function formatAtsSkillLabel(skill) {
  const canonical = canonicalSkill(skill);
  const normalized = String(canonical || skill || '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';

  const compact = normalized.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (ATS_ACRONYM_DISPLAY[compact]) return ATS_ACRONYM_DISPLAY[compact];

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const cleaned = part.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (ATS_ACRONYM_DISPLAY[cleaned]) return ATS_ACRONYM_DISPLAY[cleaned];
      if (/^[A-Z0-9+#./-]+$/.test(part)) return part;
      if (/^[a-z]+\.[a-z]+$/i.test(part)) {
        return part
          .split('.')
          .map((piece) => ATS_ACRONYM_DISPLAY[piece.toLowerCase()] || (piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase()))
          .join('.');
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function classifyAtsSkillCategory(skill) {
  const canonical = canonicalSkill(skill);
  const normalized = String(canonical || '').toLowerCase();

  if (/(sql|postgres|mysql|oracle|sqlite|mongo|redis|elastic|kafka|rabbit|warehouse|lake|bi|analytics|power bi|power query|dax|pandas|numpy|spark|airflow|dbt|etl|ml|ai|llm|tensorflow|pytorch)/.test(normalized)) {
    return 'Dados e Analise';
  }
  if (/(aws|azure|gcp|docker|kubernetes|terraform|ansible|jenkins|ci\/cd|devops|infra|linux|nginx|vercel|netlify|railway|cloud|serverless|lambda|s3|rds|cdn)/.test(normalized)) {
    return 'Cloud e Infraestrutura';
  }
  if (/(jira|confluence|figma|photoshop|illustrator|postman|insomnia|github|gitlab|bitbucket|selenium|cypress|playwright|vitest|jest|junit|mockito|pytest|storybook|wordpress|shopify|salesforce)/.test(normalized)) {
    return 'Ferramentas e Plataformas';
  }
  if (/(java|spring|node|nestjs|react|vue|angular|javascript|typescript|html|css|php|laravel|symfony|dotnet|go|golang|rust|ruby|rails|swift|kotlin|flutter|dart|android|ios|graphql|rest|api|frontend|backend|fullstack)/.test(normalized)) {
    return 'Linguagens e Frameworks';
  }

  return 'Outras Competencias Tecnicas';
}

function extractStructuredSkillCategories(sectionText) {
  const lines = splitResumeLines(sectionText).filter(Boolean);
  const categories = [];
  let current = null;

  const looksLikeCategory = (line) => {
    if (!line) return false;
    if (line.length > 48) return false;
    if (/^[A-ZÀ-Ý][A-Za-zÀ-ÿ&/\-\s]{1,47}$/.test(line) && !/[,.:;|]/.test(line)) return true;
    if (/^(backend|frontend|front-end|back-end|dados|data|cloud|infra(?:estrutura)?|devops|ferramentas?|plataformas?|testes?|design|mobile|produto|gestao|marketing|vendas|atendimento|idiomas?|certificacoes?)$/i.test(line)) return true;
    return false;
  };

  for (const line of lines) {
    if (looksLikeCategory(line)) {
      current = { name: line, skills: [] };
      categories.push(current);
      continue;
    }

    if (!current) continue;

    const lineSkills = uniqueSkillList(
      line
        .split(/[•|;,]|\s+-\s+/g)
        .map((part) => String(part || '').trim())
        .filter(Boolean)
    );
    current.skills.push(...lineSkills);
  }

  return categories.filter((category) => category.skills.length);
}

function classifyExistingCategoryName(name) {
  const normalized = normalizeResumeSkillToken(name);
  if (/(banco de dados|database|databases)/.test(normalized)) return 'Dados e Analise';
  if (/(dados|data|analytics|analise|bi)/.test(normalized)) return 'Dados e Analise';
  if (/(cloud|infra|devops|servidor|deploy|plataforma)/.test(normalized)) return 'Cloud e Infraestrutura';
  if (/(ferramenta|plataforma|tool|teste|qa|design|produto|gestao)/.test(normalized)) return 'Ferramentas e Plataformas';
  if (/(backend|frontend|front-end|back-end)/.test(normalized)) return 'Linguagens e Frameworks';
  if (/(banco)/.test(normalized)) return 'Dados e Analise';
  if (/(backend|frontend|fullstack|linguagem|framework|desenvolvimento|mobile|web)/.test(normalized)) return 'Linguagens e Frameworks';
  return 'Outras Competencias Tecnicas';
}

function normalizeResumeForAtsPdf(text, missingKeywords) {
  const marker = 'Habilidades (ATS):';
  const source = String(text || '');
  const markerIndex = source.lastIndexOf(marker);
  const baseText = markerIndex === -1 ? source.trimEnd() : source.slice(0, markerIndex).trimEnd();
  const extraSkills = sanitizeInjectedSkills(extractInjectedSkills(missingKeywords, source));

  const lines = splitResumeLines(baseText);
  const section = findResumeSkillsSection(lines);
  const existingSectionText = extractResumeSkillsSectionText(baseText);
  const existingSkills = extractSkillsFromTextChunk(existingSectionText);
  const allSkills = uniqueSkillList([...existingSkills, ...extraSkills]);

  if (!allSkills.length) return baseText;

  const existingCategories = extractStructuredSkillCategories(existingSectionText);
  const categoryOrder = existingCategories.length
    ? existingCategories.map((category) => category.name)
    : ATS_DEFAULT_SKILL_CATEGORIES;
  const grouped = Object.fromEntries(categoryOrder.map((category) => [category, []]));
  const existingCategorySkillSets = new Map();

  for (const category of existingCategories) {
    grouped[category.name] = category.skills.map(formatAtsSkillLabel);
    existingCategorySkillSets.set(
      category.name,
      new Set(category.skills.map((skill) => canonicalSkill(skill)).filter(Boolean))
    );
  }

  const seen = new Set();
  for (const skill of allSkills) {
    const canonical = canonicalSkill(skill);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);

    let targetCategory = null;
    for (const [name, skillSet] of existingCategorySkillSets.entries()) {
      if (skillSet.has(canonical)) {
        targetCategory = name;
        break;
      }
    }

    if (!targetCategory && existingCategories.length) {
      const bucket = classifyAtsSkillCategory(skill);
      targetCategory = existingCategories.find((category) => classifyExistingCategoryName(category.name) === bucket)?.name || null;
    }

    if (!targetCategory) {
      const bucket = classifyAtsSkillCategory(skill);
      targetCategory = categoryOrder.includes(bucket) ? bucket : categoryOrder[categoryOrder.length - 1];
    }

    const formatted = formatAtsSkillLabel(skill);
    if (!grouped[targetCategory].includes(formatted)) {
      grouped[targetCategory].push(formatted);
    }
  }

  const rebuiltSection = [existingCategories.length ? lines[section?.start] || 'HABILIDADES TECNICAS' : 'HABILIDADES TECNICAS'];
  for (const category of categoryOrder) {
    const skills = grouped[category];
    if (!skills.length) continue;
    if (existingCategories.length || category !== 'Outras Competencias Tecnicas') {
      rebuiltSection.push(category);
      rebuiltSection.push(skills.join(' • '));
    } else {
      rebuiltSection.push(skills.join(' • '));
    }
  }

  if (!section) {
    return `${baseText}\n\n${rebuiltSection.join('\n')}\n`;
  }

  const before = lines.slice(0, section.start).filter((line) => line !== 'Habilidades (ATS):');
  const after = lines.slice(section.end).filter((line) => line !== 'Habilidades (ATS):');
  return [...before, ...rebuiltSection, ...after].join('\n').trimEnd();
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

    chrome.tabs.get(tabId, (tab) => {
      if (settled) return;

      if (chrome.runtime.lastError) {
        settled = true;
        clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (tab?.status === 'complete') {
        settled = true;
        clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    });
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

  const lines = splitResumeLines(base);
  const section = findResumeSkillsSection(lines);

  if (section) {
    const existing = new Set(
      extractSkillsFromTextChunk(extractResumeSkillsSectionText(base)).map(canonicalSkill)
    );
    const pending = inject.filter((skill) => !existing.has(canonicalSkill(skill)));
    if (!pending.length) return base;

    lines.splice(section.end, 0, pending.join(' | '));
    return `${lines.join('\n').trimEnd()}\n`;
  }

  return `${base}\n\nHabilidades (ATS):\n${inject.join(' | ')}\n`;
}

function renderRequiredSkillsGap(gap) {
  const wrap = document.getElementById('skills-gap-wrap');
  const summary = document.getElementById('skills-gap-summary');
  const missingWrap = document.getElementById('skills-gap-missing-wrap');
  const missingTags = document.getElementById('skills-gap-missing-tags');

  if (!gap.total) {
    wrap.hidden = false;
    summary.textContent = t('noSkillsExtracted');
    missingWrap.hidden = true;
    missingTags.innerHTML = '';
    return;
  }

  wrap.hidden = false;
  summary.textContent = t('skillsMatchSummary', gap.matchedCount, gap.total, gap.score);

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
    timeAgo ? t('lastFetchPrefix', timeAgo) : t('noFetchYet');

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
      el.textContent = t('scraperBroken', SITE_LABELS[site]);
      container.appendChild(el);
    }
  }
}

const DIAG_COLLAPSED_KEY = 'workaholic_diag_collapsed';

function isDiagCollapsed() {
  try {
    const v = localStorage.getItem(DIAG_COLLAPSED_KEY);
    return v === null ? true : v === '1';
  } catch { return true; }
}

function setDiagCollapsed(collapsed) {
  try { localStorage.setItem(DIAG_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* noop */ }
}

function renderDiagnostics(diagnostics) {
  const container = document.getElementById('fetch-diagnostics');

  if (!diagnostics || !Array.isArray(diagnostics.sites) || !diagnostics.sites.length) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }

  const summary = `${diagnostics.totals?.rawJobs ?? 0} ${t('diagCapt')}, ${diagnostics.totals?.matchedJobs ?? 0} ${t('diagFilter')}. ${t('diagSkills')}: ${diagnostics.profile?.skillsCount ?? 0}.`;
  const items = diagnostics.sites.map((site) => {
    let flag = '';
    if (site.loginRequired) flag = `<span class="fetch-diagnostics-flag">${t('diagLogin')}</span>`;
    else if (site.failed) flag = `<span class="fetch-diagnostics-flag">${t('diagFail')}</span>`;

    return `
      <div class="fetch-diagnostics-item">
        <span class="fetch-diagnostics-site">${esc(site.label || site.site)}${flag}</span>
        <span class="fetch-diagnostics-metrics">${site.rawJobs ?? 0} ${t('diagRaw')} / ${site.matchedJobs ?? 0} ${t('diagMatch')}</span>
      </div>`;
  }).join('');

  const openAttr = isDiagCollapsed() ? '' : ' open';
  container.hidden = false;
  container.innerHTML = `
    <details class="fetch-diagnostics-details"${openAttr}>
      <summary class="fetch-diagnostics-summary-bar">
        <span class="fetch-diagnostics-title">${t('diagTitle')}</span>
        <span class="fetch-diagnostics-summary-inline">${esc(summary)}</span>
        <span class="fetch-diagnostics-chevron" aria-hidden="true">▾</span>
      </summary>
      <div class="fetch-diagnostics-list">${items}</div>
    </details>`;

  const details = container.querySelector('details');
  if (details) {
    details.addEventListener('toggle', () => {
      setDiagCollapsed(!details.open);
    });
  }
}

function renderJobs(jobs) {
  const list  = document.getElementById('job-list');
  const empty = document.getElementById('jobs-empty');

  if (!jobs.length) {
    list.innerHTML  = '';
    list.hidden     = true;
    if (empty) {
      empty.textContent = t('emptyState');
      empty.hidden = false;
    }
    return;
  }

  if (empty) empty.hidden = true;
  list.hidden  = false;
  list.innerHTML = jobs.map((job) => {
    const score  = Math.round(job.score ?? 0);
    const budget = formatBudget(job.budget);
    const date   = formatDate(job.postedAt);
    const desc   = (job.description || '').replace(/\s+/g, ' ').trim().slice(0, 220);

    const applied = appliedJobs.has(job.url);
    return `
      <li class="job-card${applied ? ' job-card--applied' : ''}" data-site="${esc(job.site)}" data-url="${esc(job.url)}">
        <div class="job-card-top">
          <a href="${esc(job.url)}" class="job-title" target="_blank" rel="noopener noreferrer">${esc(job.title)}</a>
        </div>
        <div class="job-badges">
          <span class="badge badge-site badge-site--${esc(job.site)}">${esc(SITE_LABELS[job.site] ?? job.site)}</span>
          <span class="badge badge-score ${scoreClass(score)}">${score}% ${t('diagMatch')}</span>
          ${applied ? `<span class="badge badge-applied">${t('appliedBadge')}</span>` : ''}
        </div>
        ${desc ? `<p class="job-desc">${esc(desc)}</p>` : ''}
        <div class="job-card-footer">
          <div class="job-meta">
            ${budget ? `<span class="job-budget">${esc(budget)}</span>` : ''}
            ${date   ? `<span class="job-date">${esc(date)}</span>`     : ''}
          </div>
          <button class="job-apply-btn${applied ? ' job-apply-btn--done' : ''}" title="${applied ? t('appliedUnmark') : t('appliedMark')}" aria-label="${applied ? t('appliedUnmark') : t('appliedMark')}" aria-pressed="${applied}">
            ${applied ? '✓' : '+'}
          </button>
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
      <button class="tag-remove" data-value="${esc(item)}" aria-label="${t('removeTag')} ${esc(item)}">×</button>
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
  btn.textContent = t('profileSaved');
  btn.classList.add('btn--success');
  setTimeout(() => {
    btn.textContent = t('saveProfile');
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

  const joinTokens = (tokens) => {
    let out = '';
    for (const token of tokens) {
      if (!token) continue;
      if (!out) {
        out = token;
        continue;
      }

      const noSpaceBefore = /^[,.;:!?)]/.test(token);
      const noSpaceAfter = /[(]$/.test(out);
      out += (noSpaceBefore || noSpaceAfter ? '' : ' ') + token;
    }
    return out;
  };

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const byLine = new Map();
    for (const item of content.items) {
      const value = String(item?.str || '').trim();
      if (!value) continue;

      const transform = item?.transform || [];
      const x = Number(transform[4] || 0);
      const y = Number(transform[5] || 0);
      const yKey = String(Math.round(y * 2) / 2);

      if (!byLine.has(yKey)) byLine.set(yKey, []);
      byLine.get(yKey).push({ x, value });
    }

    const lineKeys = Array.from(byLine.keys())
      .map((k) => Number(k))
      .sort((a, b) => b - a);

    const lines = lineKeys
      .map((key) => {
        const items = byLine.get(String(key)) || [];
        items.sort((a, b) => a.x - b.x);
        return joinTokens(items.map((entry) => entry.value));
      })
      .filter(Boolean);

    pages.push(lines.join('\n'));
  }
  return pages.join('\n\n');
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

async function downloadAtsFriendlyPDF(optimizedText, filename) {
  const pdfLib = window?.PDFLib;
  if (!pdfLib?.PDFDocument || !pdfLib?.StandardFonts) {
    throw new Error('Biblioteca de PDF nao carregada. Recarregue a extensao.');
  }

  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const pdfDoc = await PDFDocument.create();
  const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const maxWidth = pageWidth - (margin * 2);

  const lines = String(optimizedText || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, idx, arr) => line || (arr[idx - 1] && arr[idx - 1] !== ''));

  const firstLine = lines.find((line) => line) || 'Curriculo';
  const bodyLines = lines.slice(lines.indexOf(firstLine) + 1);

  const isHeading = (line) => {
    if (!line) return false;
    if (/^[A-ZÀ-Ý\s]{3,}$/.test(line)) return true;
    if (/^(resumo|summary|habilidades?|habilidades? tecnicas?|technical skills?|experiencia|experience|educacao|education|projetos?|projects?|certificacoes?|certifications?|idiomas?|languages?|contato|contact|objetivo)$/i.test(line)) return true;
    return false;
  };

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawWrapped = (text, options = {}) => {
    const { size = 11, font = normalFont, gap = 15, x = margin, width = maxWidth } = options;
    const wrapped = wrapTextForPdf(font, text || ' ', size, width);
    for (const row of wrapped) {
      if (y < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(row, { x, y, size, font, color: rgb(0, 0, 0) });
      y -= gap;
    }
    return wrapped.length;
  };

  drawWrapped(firstLine, { size: 18, font: boldFont, gap: 22 });
  y -= 4;

  for (const line of bodyLines) {
    if (!line) {
      y -= 6;
      continue;
    }

    if (isHeading(line)) {
      y -= 4;
      drawWrapped(line.toUpperCase(), { size: 12, font: boldFont, gap: 16 });
      continue;
    }

    const bullet = /^[-•]/.test(line);
    const normalized = bullet ? line.replace(/^[-•]\s*/, '') : line;
    if (bullet) {
      drawWrapped(`- ${normalized}`, { size: 11, font: normalFont, gap: 15 });
    } else {
      drawWrapped(normalized, { size: 11, font: normalFont, gap: 15 });
    }
  }

  const bytes = await pdfDoc.save();
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function wrapTextForPdf(font, text, fontSize, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function extractInjectedSkills(missingKeywords, optimizedText) {
  const marker = 'Habilidades (ATS):';
  const fromMissing = uniqueSkillList(missingKeywords || []);
  if (fromMissing.length) return fromMissing;

  const text = String(optimizedText || '').trim();
  const markerIndex = text.lastIndexOf(marker);
  if (markerIndex === -1) return [];

  const atsBlock = text.slice(markerIndex + marker.length).trim();
  return uniqueSkillList(
    atsBlock
      .split(/\||\n/)
      .map((v) => String(v || '').trim())
      .filter(Boolean)
  );
}

function sanitizeInjectedSkills(skills) {
  const synonyms = window.SYNONYMS || {};
  const knownTerms = new Set();
  for (const [canonical, aliases] of Object.entries(synonyms)) {
    knownTerms.add(normalizeResumeSkillToken(canonical));
    for (const alias of aliases || []) {
      knownTerms.add(normalizeResumeSkillToken(alias));
    }
  }

  const raw = uniqueSkillList(skills || []);

  const isClearlyInvalid = (normalized) => {
    if (!normalized) return true;
    if (/@/.test(normalized)) return true;
    if (/^(https?:\/\/|www\.)/i.test(normalized)) return true;
    if (/^[a-z0-9-]+\.(com|co|io|net|org|br|ai)(\/|$)/i.test(normalized)) return true;
    if (/^[a-z]{1,3}\.[a-z]{1,3}$/i.test(normalized)) return true;
    if (normalized.length > 60) return true;
    return false;
  };

  const cleaned = raw.filter((skill) => {
    const normalized = normalizeResumeSkillToken(skill);
    return !isClearlyInvalid(normalized);
  });

  // Rank: known technical terms first, then common stack patterns, then others.
  const rank = (value) => {
    const normalized = normalizeResumeSkillToken(value);
    if (knownTerms.has(normalized)) return 0;
    if (/[+#]|\.|\d/.test(normalized)) return 1;
    if (/^(aws|gcp|azure|docker|kubernetes|sql|react|node|java|python|php|dotnet|go|rust|flutter|android|ios)$/i.test(normalized)) return 1;
    return 2;
  };

  const strict = cleaned
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 10);

  if (strict.length) return strict;

  // Fallback: if strict sanitization removed everything, keep a lenient subset
  // (only removing clearly invalid tokens) so ATS skills are still inserted.
  return raw
    .filter((skill) => !isClearlyInvalid(normalizeResumeSkillToken(skill)))
    .slice(0, 10);
}

async function findSkillsAnchorInPdf(binaryData) {
  if (typeof pdfjsLib === 'undefined') return null;

  const headingRe = /^(?:\d+[.)-]\s*)?(skills?|technical skills?|habilidades? t[eé]cnicas?|habilidades?|compet[eê]ncias? t[eé]cnicas?|compet[eê]ncias?|tecnologias?|tech stack|stack t[eé]cnico|conhecimentos? t[eé]cnicos?)(?:\s*[:\-–—]\s*(.*))?$/i;
  const nextSectionRe = /^(?:\d+[.)-]\s*)?(resumo|summary|perfil|sobre|experi[eê]ncia|experience|educa[cç][aã]o|education|forma[cç][aã]o|projetos?|projects?|certifica[cç][oõ]es?|certifications?|idiomas?|languages?|contato|contact|objetivo|objective|atividades|responsabilidades|publica[cç][oõ]es?|achievements?)\b/i;
  const pdf = await pdfjsLib.getDocument({ data: binaryData }).promise;

  const scoreHeading = (text) => {
    const normalized = String(text || '').toLowerCase();
    let score = 0;
    if (/habilidades?\s*t[eé]cnicas?|technical\s*skills?|tech\s*stack|stack\s*t[eé]cnico/.test(normalized)) score += 100;
    if (/tecnologias?|conhecimentos?\s*t[eé]cnicos?|compet[eê]ncias?\s*t[eé]cnicas?/.test(normalized)) score += 60;
    if (/skills?|habilidades?|compet[eê]ncias?/.test(normalized)) score += 30;
    return score;
  };

  const inferSeparator = (linesText) => {
    const source = linesText.join('\n');
    if (/\u2022|•/.test(source)) return 'bullet';
    if (/\s\|\s/.test(source)) return 'pipe';
    if (/;/.test(source)) return 'semicolon';
    return 'comma';
  };

  let bestAnchor = null;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = new Map();

    for (const item of content.items) {
      const text = String(item?.str || '').trim();
      if (!text) continue;

      const transform = item?.transform || [];
      const x = Number(transform[4] || 0);
      const y = Number(transform[5] || 0);
      const h = Number(item?.height || transform[0] || 11);
      const yKey = String(Math.round(y * 2) / 2);

      if (!lines.has(yKey)) lines.set(yKey, []);
      lines.get(yKey).push({ x, y, h, text });
    }

    const sortedY = Array.from(lines.keys())
      .map((v) => Number(v))
      .sort((a, b) => b - a);

    const rows = sortedY.map((yKey) => {
      const row = lines.get(String(yKey)) || [];
      row.sort((a, b) => a.x - b.x);
      const minX = Math.min(...row.map((entry) => entry.x));
      const y = row[0]?.y ?? yKey;
      const avgHeight = row.reduce((acc, entry) => acc + (entry.h || 11), 0) / Math.max(1, row.length);
      return {
        text: row.map((entry) => entry.text).join(' ').replace(/\s+/g, ' ').trim(),
        minX: Number.isFinite(minX) ? minX : 44,
        y,
        h: Math.max(11, avgHeight),
      };
    });

    for (let i = 0; i < rows.length; i++) {
      const current = rows[i];
      if (!headingRe.test(current.text)) continue;

      let endIndex = i;
      let nextSectionY = null;
      for (let j = i + 1; j < rows.length; j++) {
        const candidate = rows[j];
        if (nextSectionRe.test(candidate.text)) {
          nextSectionY = candidate.y;
          break;
        }
        endIndex = j;
        if (j - i > 30) break;
      }

      const endRow = rows[endIndex] || current;
      const lineHeight = Math.max(13, Math.min(18, endRow.h + 3));
      const startY = endRow.y - lineHeight;
      const minY = nextSectionY != null
        ? (nextSectionY + Math.max(10, lineHeight - 2))
        : 44;

      const sectionLines = rows.slice(i + 1, endIndex + 1).map((row) => row.text).filter(Boolean);
      const anchor = {
        pageIndex: pageNumber - 1,
        x: current.minX,
        y: startY,
        lineHeight,
        minY,
        sectionLines,
        sectionSeparator: inferSeparator(sectionLines),
        headingScore: scoreHeading(current.text),
      };

      if (!bestAnchor || anchor.headingScore > bestAnchor.headingScore) {
        bestAnchor = anchor;
      }
    }
  }

  return bestAnchor;
}

function toUint8Array(data) {
  if (!data) return new Uint8Array();
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array();
}

function hasPdfHeader(bytes) {
  const source = toUint8Array(bytes);
  if (source.length < 5) return false;

  const maxOffset = Math.min(1024, source.length - 5);
  for (let i = 0; i <= maxOffset; i++) {
    if (
      source[i] === 0x25 && // %
      source[i + 1] === 0x50 && // P
      source[i + 2] === 0x44 && // D
      source[i + 3] === 0x46 && // F
      source[i + 4] === 0x2d // -
    ) {
      return true;
    }
  }
  return false;
}

async function resolvePdfBytesForEdit(preferredBytes) {
  const preferred = toUint8Array(preferredBytes);
  if (preferred.length && hasPdfHeader(preferred)) {
    return new Uint8Array(preferred);
  }

  if (resumeOriginalFile && typeof resumeOriginalFile.arrayBuffer === 'function') {
    const fresh = new Uint8Array(await resumeOriginalFile.arrayBuffer());
    if (fresh.length && hasPdfHeader(fresh)) {
      return fresh;
    }
  }

  throw new Error('Arquivo PDF invalido para edicao. Reimporte um PDF valido e tente novamente.');
}

async function downloadOptimizedPdfFromOriginal(originalPdfBytes, missingKeywords, filename) {
  const pdfLib = window?.PDFLib;
  if (!pdfLib?.PDFDocument || !pdfLib?.StandardFonts) {
    throw new Error('Biblioteca de edicao de PDF nao carregada. Recarregue a extensao.');
  }

  const { PDFDocument, StandardFonts, rgb } = pdfLib;
  const rawSkills = extractInjectedSkills(missingKeywords, resumeOptimizedText);
  const sectionText = extractResumeSkillsSectionText(resumeText);
  const existingSectionSkills = new Set(
    extractSkillsFromTextChunk(sectionText).map(canonicalSkill).filter(Boolean)
  );

  const skills = sanitizeInjectedSkills(rawSkills)
    .filter((skill) => !existingSectionSkills.has(canonicalSkill(skill)));

  if (!skills.length) {
    downloadBlob(new Blob([originalPdfBytes], { type: 'application/pdf' }), filename);
    return;
  }

  const baseBytes = await resolvePdfBytesForEdit(originalPdfBytes);

  // PDF.js may transfer ownership of the passed buffer to its worker.
  // Use an isolated copy so PDF-lib still receives intact bytes.
  const anchorBytes = new Uint8Array(baseBytes);
  const editableBytes = new Uint8Array(baseBytes);

  const anchor = await findSkillsAnchorInPdf(anchorBytes);

  let pdfDoc;
  try {
    pdfDoc = await PDFDocument.load(editableBytes);
  } catch (error) {
    const message = String(error?.message || '');
    if (!/No PDF header found/i.test(message)) {
      throw error;
    }

    // Last-resort retry with a fresh read from File in case previous buffers were detached.
    const retryBytes = await resolvePdfBytesForEdit(null);
    pdfDoc = await PDFDocument.load(retryBytes);
  }
  const pages = pdfDoc.getPages();

  const baseWidth = pages[0]?.getWidth() || 595;
  const baseHeight = pages[0]?.getHeight() || 842;
  let page = anchor?.pageIndex >= 0 && pages[anchor.pageIndex]
    ? pages[anchor.pageIndex]
    : pages[pages.length - 1] || pdfDoc.addPage([baseWidth, baseHeight]);

  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const margin = 44;
  const lineHeight = anchor?.lineHeight ? Math.max(13, Math.min(18, anchor.lineHeight)) : 15;
  const bodySize = Math.max(10, Math.min(12, lineHeight - 3));

  const ensureSpace = (needed) => {
    const minY = margin;
    if (cursorY - needed < minY) {
      page = pdfDoc.addPage([baseWidth, baseHeight]);
      cursorY = baseHeight - margin;
      cursorX = margin;
      textMaxWidth = Math.max(120, baseWidth - (margin * 2));
    }
  };

  let cursorX = anchor?.x ? Math.max(margin, anchor.x) : margin;
  let textMaxWidth = Math.max(120, baseWidth - cursorX - margin);
  let cursorY = anchor?.y ? anchor.y - lineHeight : baseHeight - margin;
  if (cursorY < margin + lineHeight) {
    cursorY = baseHeight - margin;
  }

  const buildFormattedSkillLines = () => {
    const separator = anchor?.sectionSeparator || 'comma';

    if (separator === 'bullet') {
      return skills.flatMap((skill) => wrapTextForPdf(bodyFont, `• ${skill}`, bodySize, textMaxWidth));
    }

    let inline = '';
    if (separator === 'pipe') inline = skills.join(' | ');
    else if (separator === 'semicolon') inline = skills.join('; ');
    else inline = skills.join(', ');

    return wrapTextForPdf(bodyFont, inline, bodySize, textMaxWidth);
  };

  let wrappedLines = buildFormattedSkillLines();

  if (anchor?.minY != null) {
    const availableHeight = Math.max(0, cursorY - anchor.minY);
    const neededHeight = wrappedLines.length * lineHeight;
    if (neededHeight > availableHeight) {
      page = pdfDoc.addPage([baseWidth, baseHeight]);
      cursorX = margin;
      textMaxWidth = Math.max(120, baseWidth - (margin * 2));
      cursorY = baseHeight - margin;
      wrappedLines = buildFormattedSkillLines();
    }
  }

  for (const line of wrappedLines) {
    ensureSpace(lineHeight);
    page.drawText(line, { x: cursorX, y: cursorY, size: bodySize, font: bodyFont, color: rgb(0, 0, 0) });
    cursorY -= lineHeight;
  }

  const bytes = await pdfDoc.save();
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
}

function populateJobSelect(jobs) {
  const select = document.getElementById('ats-job-select');
  select.innerHTML = jobs.length
    ? jobs.map((j, i) => `<option value="${i}">${esc(j.title)} (${esc(j.site)})</option>`).join('')
    : `<option value="">${t('noJobFound')}</option>`;
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
  name.textContent = `📄 ${file.name} — ${t('processingHint')}`;


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
      throw new Error(t('unsupportedFormat'));
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
    name.textContent = `⚠ ${err.message}`;
    resumeReady = false;
  }
}

async function importProfileSkillsFromResume(file) {
  const statusEl = document.getElementById('profile-resume-import-status');
  const inputEl = document.getElementById('profile-resume-file-input');

  statusEl.hidden = false;
  statusEl.textContent = t('processingFile', file.name);

  try {
    const isPDF = file.name.toLowerCase().endsWith('.pdf');
    const isDOCX = file.name.toLowerCase().endsWith('.docx');

    if (!isPDF && !isDOCX) {
      throw new Error(t('unsupportedFormat'));
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
      statusEl.textContent = t('noSkillsInResume');
      inputEl.value = '';
      return;
    }

    const existingProfile = await ensureProfileExists();
    await saveProfileWithFallback(buildProfileFromForm(existingProfile, { forceCurrentState: true }));

    statusEl.textContent = t('skillsImported', added);
  } catch (error) {
    statusEl.textContent = t('importError', error.message);
  } finally {
    inputEl.value = '';
  }
}

// ---------------------------------------------------------------------------
// Applied jobs — helpers
// ---------------------------------------------------------------------------

async function loadAppliedJobs() {
  const result = await localGet(KEYS.APPLIED_JOBS);
  appliedJobs = new Set(result[KEYS.APPLIED_JOBS] ?? []);
}

async function saveAppliedJobs() {
  await localSet({ [KEYS.APPLIED_JOBS]: [...appliedJobs] });
}

async function toggleApplied(url, card) {
  if (appliedJobs.has(url)) {
    appliedJobs.delete(url);
  } else {
    appliedJobs.add(url);
  }
  await saveAppliedJobs();
  const applied = appliedJobs.has(url);
  card.classList.toggle('job-card--applied', applied);
  const btn = card.querySelector('.job-apply-btn');
  if (btn) {
    btn.textContent    = applied ? '✓' : '○';
    btn.classList.toggle('job-apply-btn--done', applied);
    btn.setAttribute('aria-pressed', String(applied));
    btn.title = applied ? t('appliedUnmark') : t('appliedMark');
  }
  const badgeApplied = card.querySelector('.badge-applied');
  if (applied && !badgeApplied) {
    const badgesEl = card.querySelector('.job-badges');
    if (badgesEl) {
      const span = document.createElement('span');
      span.className   = 'badge badge-applied';
      span.textContent = t('appliedBadge');
      badgesEl.appendChild(span);
    }
  } else if (!applied && badgeApplied) {
    badgeApplied.remove();
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Load language preference, apply translations, then init tabs
  localGet(KEYS.LANG).then((result) => {
    currentLang = result[KEYS.LANG] ?? 'pt';
    applyTranslations();
    loadAppliedJobs().then(() => loadJobsTab());
    populateJobSelect(_resumeTabJobs);
  });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Open job links in a background tab; auto-mark as applied on link click.
  document.getElementById('job-list')?.addEventListener('click', (event) => {
    const card = event.target.closest('li.job-card');
    if (!card) return;

    // Toggle applied via check button
    const applyBtn = event.target.closest('.job-apply-btn');
    if (applyBtn) {
      event.preventDefault();
      toggleApplied(card.dataset.url, card);
      return;
    }

    // Open link + auto-mark as applied
    const link = event.target.closest('a.job-title');
    if (!link) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    chrome.tabs.create({ url: link.href, active: false });
    if (!appliedJobs.has(card.dataset.url)) {
      toggleApplied(card.dataset.url, card);
    }
  });

  // Fetch now
  const fetchBtn = document.getElementById('fetch-now-btn');
  fetchBtn.addEventListener('click', async () => {
    fetchBtn.disabled    = true;
    fetchBtn.textContent = t('fetching');

    try {
      const existingProfile = await ensureProfileExists();
      // Persist current UI state when profile has been loaded in this popup session.
      await saveProfileWithFallback(buildProfileFromForm(existingProfile));
      const profile = await getProfileWithFallback() ?? defaultProfile();
      clearFetchStatus();

      const response = await sendRuntimeMessage({ type: 'FETCH_NOW' });

      if (!response?.ok) {
        throw new Error(response?.error || t('fetchFailed'));
      }

      const jobs = response.result?.jobs ?? [];
      const auth = response.result?.auth ?? null;
      await loadJobsTab();

      if (auth?.required) {
        setFetchStatus(t('loginRequired', auth.label), 'warning');
        return;
      }

      if (!profile.skills?.length) {
        setFetchStatus(t('noSkillsInProfile'), 'warning');
        return;
      }

      if (!jobs.length) {
        setFetchStatus(t('noJobsMatched'), 'warning');
        return;
      }

      setFetchStatus(t('jobsFound', jobs.length), 'success');
    } catch (error) {
      setFetchStatus(t('fetchError', error.message), 'error');
    } finally {
      fetchBtn.disabled    = false;
      fetchBtn.textContent = t('fetchNow');
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

    try {
      const baseOutputText = String(resumeOptimizedText || '').trim() || String(resumeText || '').trim();
      const outputText = normalizeResumeForAtsPdf(baseOutputText, resumeMissingKeywords);
      if (!outputText) {
        throw new Error(t('generateError'));
      }

      if (resumeIsPDF && resumeOriginalBytes) {
        resumeOptimizedText = outputText;
        await downloadOptimizedPdfFromOriginal(resumeOriginalBytes, resumeMissingKeywords, `${baseName}.pdf`);
        return;
      }

      await downloadAtsFriendlyPDF(outputText, `${baseName}.pdf`);
    } catch (error) {
      console.error(error);
      window.alert(t('downloadFail', error.message));
    }
  });

  // Language toggle — header button
  document.getElementById('lang-btn').addEventListener('click', async () => {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    await localSet({ [KEYS.LANG]: currentLang });
    applyTranslations();
    await loadJobsTab();
    populateJobSelect(_resumeTabJobs);
  });

  // Language toggle — profile section buttons
  document.querySelectorAll('.lang-toggle-opt').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.lang === currentLang) return;
      currentLang = btn.dataset.lang;
      await localSet({ [KEYS.LANG]: currentLang });
      applyTranslations();
      await loadJobsTab();
      populateJobSelect(_resumeTabJobs);
    });
  });

  // Load default tab
  ensureProfileExists().catch(() => {});
  loadProfileTab().catch(() => {});
});
