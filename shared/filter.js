'use strict';

/**
 * Synonym map: every alias in the array normalises to the key.
 * Both profile skills and job skills are resolved before comparison.
 */
const SYNONYMS = {
  react:      ['react', 'reactjs', 'react.js'],
  node:       ['node', 'nodejs', 'node.js'],
  vue:        ['vue', 'vuejs', 'vue.js'],
  angular:    ['angular', 'angularjs'],
  typescript: ['typescript', 'ts'],
  javascript: ['javascript', 'js', 'ecmascript'],
  python:     ['python', 'python3', 'py'],
  postgres:   ['postgres', 'postgresql', 'pg'],
  mongo:      ['mongo', 'mongodb'],
  docker:     ['docker', 'dockerfile', 'container', 'containers'],
  java:       ['java', 'jvm'],
  spring:     ['spring', 'spring boot', 'springboot', 'spring mvc', 'spring cloud'],
  sql:        ['sql', 'mysql', 'mariadb', 't-sql', 'pl/sql'],
  aws:        ['aws', 'amazon web services', 'ec2', 'lambda', 'rds', 's3'],
  gcp:        ['gcp', 'google cloud', 'gke'],
  azure:      ['azure', 'microsoft azure', 'aks'],
  kubernetes: ['kubernetes', 'k8s', 'helm'],
  git:        ['git', 'github', 'gitlab', 'bitbucket'],
  linux:      ['linux', 'ubuntu', 'centos', 'debian', 'redhat'],
  rest:       ['rest', 'restful', 'rest api', 'api rest', 'rest apis', 'web apis', 'apis rest'],
  graphql:    ['graphql', 'apollo'],
  nextjs:     ['next.js', 'nextjs', 'next'],
  nestjs:     ['nest.js', 'nestjs', 'nest'],
  nuxtjs:     ['nuxt.js', 'nuxtjs', 'nuxt'],
  express:    ['express', 'express.js', 'expressjs'],
  fastify:    ['fastify'],
  fastapi:    ['fastapi'],
  django:     ['django'],
  flask:      ['flask'],
  redis:      ['redis'],
  kafka:      ['kafka', 'kafka streams'],
  rabbitmq:   ['rabbitmq', 'rabbit mq', 'amqp'],
  jenkins:    ['jenkins'],
  cicd:       ['ci/cd', 'ci cd', 'continuous integration', 'continuous delivery', 'github actions', 'gitlab ci', 'circleci'],
  devops:     ['devops', 'sre', 'devsecops', 'gitops'],
  html:       ['html', 'html5'],
  css:        ['css', 'css3', 'sass', 'scss', 'less', 'stylus', 'tailwind', 'tailwind css'],
  bootstrap:  ['bootstrap'],
  materialui: ['material ui', 'mui', 'material-ui'],
  php:        ['php', 'laravel', 'symfony', 'codeigniter'],
  dotnet:     ['.net', 'dotnet', 'asp.net', 'c#', 'csharp', '.net core', 'asp.net core'],
  golang:     ['go', 'golang'],
  rust:       ['rust', 'rustlang'],
  ruby:       ['ruby', 'rails', 'ruby on rails', 'ror'],
  swift:      ['swift', 'swiftui'],
  kotlin:     ['kotlin'],
  flutter:    ['flutter', 'dart'],
  reactnative: ['react native', 'react-native', 'rn'],
  android:    ['android', 'android studio', 'jetpack compose'],
  ios:        ['ios', 'xcode', 'uikit'],
  unity:      ['unity', 'unity3d'],
  tensorflow: ['tensorflow', 'tf'],
  pytorch:    ['pytorch'],
  sklearn:    ['scikit-learn', 'sklearn'],
  pandas:     ['pandas', 'numpy'],
  powerbi:    ['power bi', 'powerbi'],
  tableau:    ['tableau'],
  figma:      ['figma'],
  photoshop:  ['photoshop', 'illustrator', 'adobe xd', 'adobe illustrator', 'adobe photoshop'],
  wordpress:  ['wordpress', 'wp', 'elementor'],
  shopify:    ['shopify'],
  salesforce: ['salesforce', 'crm salesforce'],
  jira:       ['jira', 'confluence'],
  selenium:   ['selenium', 'cypress', 'playwright', 'puppeteer'],
  jest:       ['jest', 'mocha', 'jasmine', 'vitest', 'chai'],
  terraform:  ['terraform', 'ansible', 'puppet', 'pulumi'],
  nginx:      ['nginx', 'apache', 'tomcat'],
  elasticsearch: ['elasticsearch', 'elastic', 'opensearch'],
  socketio:   ['socket.io', 'websocket', 'websockets', 'sockets'],
  fullstack:  ['full stack', 'fullstack', 'full-stack', 'desenvolvedor full stack', 'desenvolvedor fullstack'],
  frontend:   ['frontend', 'front-end', 'front end', 'desenvolvedor frontend', 'desenvolvedor front-end', 'dev frontend'],
  backend:    ['backend', 'back-end', 'back end', 'desenvolvedor backend', 'desenvolvedor back-end', 'dev backend'],
  mobile:     ['mobile', 'desenvolvimento mobile', 'desenvolvedor mobile'],
  webdev:     ['web development', 'desenvolvimento web', 'desenvolvedor web', 'web developer'],
  agile:      ['agile', 'agil', 'scrum', 'kanban', 'metodologia agil', 'metodologias ageis'],
  microservices: ['microservices', 'microsservicos', 'microservicos', 'micro services'],
  oauth:      ['oauth', 'oauth2', 'jwt', 'sso', 'openid connect'],
  redux:      ['redux', 'mobx', 'zustand'],
  prisma:     ['prisma', 'sequelize', 'typeorm', 'drizzle'],
  webpack:    ['webpack', 'vite', 'rollup', 'parcel', 'esbuild'],
  firebase:   ['firebase', 'firestore', 'supabase'],
  ddd:        ['ddd', 'domain driven design', 'clean architecture', 'hexagonal', 'arquitetura limpa'],
  solid:      ['solid', 'design patterns', 'tdd', 'bdd'],
};

const MIN_MATCH_SCORE = 12;
const MIN_MATCHED_SKILLS = 1;

function normalizeForTextMatch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function minScoreForProfileSize(size) {
  if (size >= 10) return 5;
  if (size >= 6) return 8;
  return MIN_MATCH_SCORE;
}

function minMatchedSkillsForProfileSize(size) {
  if (size >= 15) return 2;
  if (size >= 8) return 1;
  return 1;
}

function countMatches(jobOrSkills, profileSkills) {
  if (!profileSkills || profileSkills.length === 0) return 0;

  const profileSet = canonicalSet(profileSkills);
  const jobSkills = Array.isArray(jobOrSkills) ? jobOrSkills : jobOrSkills?.skills;
  const jobSet = canonicalSet(jobSkills);
  const fallbackText = Array.isArray(jobOrSkills)
    ? ''
    : `${jobOrSkills?.title || ''} ${jobOrSkills?.description || ''}`;

  let matches = 0;
  for (const skill of profileSet) {
    if (jobSet.has(skill) || textMentionsSkill(fallbackText, skill)) {
      matches++;
    }
  }

  return matches;
}

// Reverse lookup: alias → canonical form
const ALIAS_TO_CANONICAL = {};
for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL[normalizeForTextMatch(alias).trim()] = canonical;
  }
}

/**
 * Resolves a skill string to its canonical form.
 * Falls back to the lowercased+ASCII input when no synonym is found.
 * @param {string} skill
 * @returns {string}
 */
function canonicalize(skill) {
  const lower = normalizeForTextMatch(skill).trim();
  return ALIAS_TO_CANONICAL[lower] ?? lower;
}

/**
 * Resolves an array of skills to their canonical forms (deduped).
 * @param {string[]} skills
 * @returns {Set<string>}
 */
function canonicalSet(skills) {
  return new Set((skills || []).map(canonicalize).filter(Boolean));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function aliasesFor(skill) {
  const canonical = canonicalize(skill);
  if (!canonical) return [];
  const aliases = SYNONYMS[canonical] ?? [canonical];
  return Array.from(new Set([canonical, ...aliases.map((alias) => normalizeForTextMatch(alias).trim())]));
}

function textMentionsSkill(text, skill) {
  const haystack = normalizeForTextMatch(text);
  if (!haystack) return false;

  return aliasesFor(skill).some((alias) => {
    if (!alias) return false;
    // Word-boundary regex that treats anything not in [a-z0-9+#] as boundary.
    // Allows matches before parens, dashes, slashes, quotes etc.
    const pattern = new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(alias)}($|[^a-z0-9+#])`, 'i');
    return pattern.test(haystack);
  });
}

/**
 * Calculates the match score between a job and a profile.
 * Uses the most generous of three perspectives:
 *   - jobCoverage     = matches / jobSet.size       (% of job requirements covered)
 *   - profileCoverage = matches / profileSet.size   (% of profile skills mentioned)
 *   - matchRatio      = capped at 3 matches → 100%  (rewards strong absolute signal)
 * Generous scoring prevents jobs with many requirements from being unfairly low.
 * @param {Object|string[]} jobOrSkills
 * @param {string[]} profileSkills
 * @returns {number}
 */
function calcScore(jobOrSkills, profileSkills) {
  if (!profileSkills || profileSkills.length === 0) return 0;

  const jobSkills = Array.isArray(jobOrSkills) ? jobOrSkills : jobOrSkills?.skills;
  const jobSet = canonicalSet(jobSkills);
  const profileSet = canonicalSet(profileSkills);
  const matches = countMatches(jobOrSkills, profileSkills);

  if (matches === 0) return 0;

  const jobCoverage = jobSet.size > 0 ? (matches / jobSet.size) * 100 : 0;
  const profileCoverage = profileSet.size > 0 ? (matches / profileSet.size) * 100 : 0;
  const matchRatio = Math.min(matches, 3) / 3 * 100;

  return Math.max(jobCoverage, profileCoverage, matchRatio);
}

/**
 * Computes a conservative score for jobs that had no structured skills and were
 * enriched from sparse text. Avoids flat 60% scores from single mentions.
 * @param {number} matches
 * @param {number} inferredSkillCount
 * @returns {number}
 */
function calcSparseEnrichedScore(matches, inferredSkillCount) {
  const denominator = Math.max(4, inferredSkillCount || 0);
  if (!denominator) return 0;
  return (matches / denominator) * 100;
}

/**
 * Enriches a job that has no/minimal skills by extracting from description.
 * Uses text-based keyword matching against known synonyms.
 * @param {Object} job
 * @returns {Object}
 */
function enrichJobWithDescriptionSkills(job) {
  const currentSkills = Array.isArray(job.skills) ? job.skills : [];

  if (currentSkills.length >= 2 && canonicalSet(currentSkills).size > 0) return job;

  const fullText = `${job.title || ''} ${job.description || ''}`;
  if (!fullText.trim()) return job;

  const descriptionText = normalizeForTextMatch(fullText);
  const extractedSkills = [];
  const seen = new Set();

  for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    for (const alias of [canonical, ...aliases]) {
      const normAlias = normalizeForTextMatch(alias).trim();
      if (!normAlias) continue;
      const pattern = new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(normAlias)}($|[^a-z0-9+#])`, 'i');
      if (pattern.test(descriptionText) && !seen.has(canonical)) {
        extractedSkills.push(canonical);
        seen.add(canonical);
        break;
      }
    }
  }

  if (!extractedSkills.length) return job;

  return {
    ...job,
    skills: [...currentSkills, ...extractedSkills],
  };
}

/**
 * Filters and ranks an array of normalised job objects against a user profile.
 *
 * @param {Object[]} jobs     - Array of normalised job objects
 * @param {Object}   profile  - User profile
 * @returns {Object[]}        - Filtered jobs with a `score` field, sorted by score desc
 */
function filterJobs(jobs, profile) {
  const {
    skills: profileSkills = [],
    minBudget = null,
    blacklist = [],
    sites = {},
  } = profile;

  const blacklistLower = blacklist.map((w) => normalizeForTextMatch(w).trim()).filter(Boolean);
  const profileSize = canonicalSet(profileSkills).size;
  const minScore = minScoreForProfileSize(profileSize);
  const minMatches = minMatchedSkillsForProfileSize(profileSize);
  const debug = (typeof globalThis !== 'undefined') && globalThis.__WORKAHOLIC_DEBUG === true;
  const dropLog = [];

  const results = [];

  for (const job of jobs) {
    if (sites[job.site] === false) {
      if (debug) dropLog.push({ url: job.url, reason: 'site-disabled' });
      continue;
    }

    const titleLower = normalizeForTextMatch(job.title || '');
    if (blacklistLower.some((word) => titleLower.includes(word))) {
      if (debug) dropLog.push({ url: job.url, reason: 'blacklist' });
      continue;
    }

    if (
      minBudget != null &&
      job.budget != null &&
      job.budget.max < minBudget
    ) {
      if (debug) dropLog.push({ url: job.url, reason: 'budget' });
      continue;
    }

    const originalSkillCount = (Array.isArray(job.skills) ? job.skills.length : 0);
    const enrichedJob = enrichJobWithDescriptionSkills(job);
    const enrichedSkillCount = (Array.isArray(enrichedJob.skills) ? enrichedJob.skills.length : 0);
    const wasEnriched = enrichedSkillCount > originalSkillCount;

    const matches = countMatches(enrichedJob, profileSkills);
    let score = calcScore(enrichedJob, profileSkills);

    if (wasEnriched && originalSkillCount === 0) {
      const sparse = calcSparseEnrichedScore(matches, enrichedSkillCount);
      score = Math.max(score, sparse);
    }

    if (matches < minMatches) {
      if (debug) dropLog.push({ url: job.url, reason: 'low-matches', matches, minMatches });
      continue;
    }

    const hasNoStructuredSkills = originalSkillCount === 0;
    if (!hasNoStructuredSkills && score < minScore) {
      if (debug) dropLog.push({ url: job.url, reason: 'low-score', score: Math.round(score), minScore });
      continue;
    }

    results.push({ ...job, score });
  }

  results.sort((a, b) => b.score - a.score);

  if (debug && dropLog.length) {
    // eslint-disable-next-line no-console
    console.log('[Workaholic] filter dropped:', dropLog);
  }

  return results;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    filterJobs,
    SYNONYMS,
    MIN_MATCH_SCORE,
    MIN_MATCHED_SKILLS,
    minScoreForProfileSize,
    minMatchedSkillsForProfileSize,
    countMatches,
    calcScore,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.filterJobs = filterJobs;
  globalThis.SYNONYMS = SYNONYMS;
  globalThis.MIN_MATCH_SCORE = MIN_MATCH_SCORE;
  globalThis.MIN_MATCHED_SKILLS = MIN_MATCHED_SKILLS;
  globalThis.minScoreForProfileSize = minScoreForProfileSize;
  globalThis.minMatchedSkillsForProfileSize = minMatchedSkillsForProfileSize;
  globalThis.countMatches = countMatches;
}
