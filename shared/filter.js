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
  javascript: ['javascript', 'js'],
  python:     ['python', 'python3'],
  postgres:   ['postgres', 'postgresql'],
  mongo:      ['mongo', 'mongodb'],
  docker:     ['docker', 'dockerfile'],
  java:       ['java', 'jvm'],
  spring:     ['spring', 'spring boot', 'springboot'],
  sql:        ['sql', 'mysql', 'mariadb'],
  aws:        ['aws', 'amazon web services'],
  gcp:        ['gcp', 'google cloud'],
  azure:      ['azure', 'microsoft azure'],
  kubernetes: ['kubernetes', 'k8s'],
  git:        ['git', 'github', 'gitlab', 'bitbucket'],
  linux:      ['linux', 'ubuntu', 'centos'],
  rest:       ['rest', 'restful', 'rest api', 'api rest'],
  graphql:    ['graphql'],
  nextjs:     ['next.js', 'nextjs', 'next'],
  nestjs:     ['nest.js', 'nestjs', 'nest'],
  redis:      ['redis'],
  kafka:      ['kafka'],
  rabbitmq:   ['rabbitmq', 'rabbit mq'],
  jenkins:    ['jenkins'],
  cicd:       ['ci/cd', 'ci cd', 'continuous integration'],
  devops:     ['devops'],
  html:       ['html', 'html5'],
  css:        ['css', 'css3', 'sass', 'scss', 'less'],
  php:        ['php', 'laravel', 'symfony', 'codeigniter'],
  dotnet:     ['.net', 'dotnet', 'asp.net', 'c#', 'csharp'],
  golang:     ['go', 'golang'],
  rust:       ['rust', 'rustlang'],
  ruby:       ['ruby', 'rails', 'ruby on rails'],
  swift:      ['swift', 'swiftui'],
  kotlin:     ['kotlin'],
  flutter:    ['flutter', 'dart'],
  reactnative: ['react native', 'react-native'],
  android:    ['android', 'android studio'],
  ios:        ['ios', 'xcode'],
  unity:      ['unity', 'unity3d'],
  tensorflow: ['tensorflow', 'tf'],
  pytorch:    ['pytorch'],
  sklearn:    ['scikit-learn', 'sklearn'],
  pandas:     ['pandas'],
  powerbi:    ['power bi', 'powerbi'],
  tableau:    ['tableau'],
  figma:      ['figma'],
  photoshop:  ['photoshop', 'illustrator', 'adobe xd'],
  wordpress:  ['wordpress', 'wp', 'elementor'],
  shopify:    ['shopify'],
  salesforce: ['salesforce', 'crm salesforce'],
  jira:       ['jira', 'confluence'],
  selenium:   ['selenium', 'cypress', 'playwright'],
  jest:       ['jest', 'mocha', 'jasmine', 'vitest'],
  terraform:  ['terraform', 'ansible', 'puppet'],
  nginx:      ['nginx', 'apache'],
  elasticsearch: ['elasticsearch', 'elastic', 'opensearch'],
  socketio:   ['socket.io', 'websocket', 'websockets'],
  fullstack:  ['full stack', 'fullstack', 'full-stack'],
  frontend:   ['frontend', 'front-end', 'front end'],
  backend:    ['backend', 'back-end', 'back end'],
};

const MIN_MATCH_SCORE = 20;
const MIN_MATCHED_SKILLS = 1;

function normalizeForTextMatch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function minScoreForProfileSize(size) {
  if (size >= 10) return 5;
  if (size >= 6) return 15;
  return MIN_MATCH_SCORE;
}

function minMatchedSkillsForProfileSize(size) {
  if (size >= 15) return 3;
  if (size >= 8) return 2;
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
    ALIAS_TO_CANONICAL[alias] = canonical;
  }
}

/**
 * Resolves a skill string to its canonical form.
 * Falls back to the lowercased input when no synonym is found.
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
    const pattern = new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(alias)}($|[^a-z0-9+#])`, 'i');
    return pattern.test(haystack);
  });
}

/**
 * Calculates the match score between a job and a profile.
 * Score = (your matching skills / job required skills) * 100
 * This shows what % of the job's requirements you can cover.
 * When job has no structured skills, falls back to: (matches / profile skills) * 100
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

  // If job has structured skills, use job-perspective: % of job requirements covered
  if (jobSet.size > 0) {
    return (matches / jobSet.size) * 100;
  }

  // Fallback for text-based matching: % of profile skills mentioned in job
  return (matches / profileSet.size) * 100;
}

/**
 * Computes a conservative score for jobs that had no structured skills and were
 * enriched from sparse text. This avoids flat 60% scores from single mentions.
 *
 * Example: if only 1 inferred skill exists, denominator floor keeps score low.
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
 * Uses text-based keyword matching against known synonyms + common tech terms.
 * Only enrich if description is substantial (> 100 chars) to avoid false positives.
 * @param {Object} job
 * @returns {Object}
 */
function enrichJobWithDescriptionSkills(job) {
  const currentSkills = Array.isArray(job.skills) ? job.skills : [];

  // Skip enrichment only when 2+ skills exist AND at least one maps to a known canonical.
  // Long-phrase JSON-LD skills (e.g. "Experiência com Node.js") don't canonicalize, so we
  // still need to enrich from description in that case.
  if (currentSkills.length >= 2 && canonicalSet(currentSkills).size > 0) return job;

  const fullText = `${job.title || ''} ${job.description || ''}`;
  // Don't enrich if description is too sparse
  if (fullText.length < 40) return job;

  const descriptionText = fullText.toLowerCase();
  const extractedSkills = [];
  const seen = new Set();

  for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    for (const alias of [canonical, ...aliases]) {
      const pattern = new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(alias)}($|[^a-z0-9+#])`, 'i');
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
 * Filtering order:
 *   1. Discard jobs from sites disabled in the profile
 *   2. Discard jobs whose title contains a blacklisted word
 *   3. Discard jobs where budget.max < profile.minBudget (when both defined)
 *   4. Calculate score: (your matching skills / job required skills) * 100
 *   5. Discard jobs with score < MIN_MATCH_SCORE (20%) or 0 skills matched
 *   6. Sort by score descending
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
    keywords = [],
    sites = {},
  } = profile;

  // Pre-compute lowercased blacklist and keywords for fast comparison
  const blacklistLower = blacklist.map((w) => normalizeForTextMatch(w).trim()).filter(Boolean);
  const keywordsLower  = keywords.map((w) => normalizeForTextMatch(w).trim()).filter(Boolean);
  const profileSize = canonicalSet(profileSkills).size;
  const minScore = minScoreForProfileSize(profileSize);
  const minMatches = Math.min(MIN_MATCHED_SKILLS, minMatchedSkillsForProfileSize(profileSize));

  const results = [];

  for (const job of jobs) {
    // 1. Site enabled in profile
    if (sites[job.site] === false) continue;

    // 2. Blacklist check against title
    const titleLower = normalizeForTextMatch(job.title || '');
    if (blacklistLower.some((word) => titleLower.includes(word))) continue;

    // 3. Keywords (positive filter) — skip if no keyword matches title/description
    const searchableText = `${job.title || ''} ${job.description || ''}`;
    const searchableLower = normalizeForTextMatch(searchableText);
    if (keywordsLower.length > 0 && !keywordsLower.some((kw) => searchableLower.includes(kw))) continue;

    // 4. Budget minimum
    if (
      minBudget != null &&
      job.budget != null &&
      job.budget.max < minBudget
    ) continue;

    // Enrich job with skills from description if structured skills are missing
    const originalSkillCount = (Array.isArray(job.skills) ? job.skills.length : 0);
    const enrichedJob = enrichJobWithDescriptionSkills(job);
    const enrichedSkillCount = (Array.isArray(enrichedJob.skills) ? enrichedJob.skills.length : 0);
    const wasEnriched = enrichedSkillCount > originalSkillCount;

    // 4 & 5. Score / absolute matches — discard if both are below threshold.
    const matches = countMatches(enrichedJob, profileSkills);
    let score = calcScore(enrichedJob, profileSkills);

    // For cards with no structured skills, use conservative score from inferred skills.
    if (wasEnriched && originalSkillCount === 0) {
      score = calcSparseEnrichedScore(matches, enrichedSkillCount);
    }

    if (matches < 1) continue;

    // For jobs without structured skills and without enrichment, keep a softer gate:
    // one real skill mention is enough to keep visibility for sparse-site cards.
    const hasOnlySparseTextSignals = originalSkillCount === 0 && !wasEnriched;
    if (!hasOnlySparseTextSignals && score < minScore) continue;

    results.push({ ...job, score });
  }

  // 6. Sort by score descending
  results.sort((a, b) => b.score - a.score);

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
