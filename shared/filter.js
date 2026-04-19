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
};

const MIN_MATCH_SCORE = 30;
const MIN_MATCHED_SKILLS = 3;

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
 * Score = (skills in common / total profile skills) * 100
 * Returns 0 when the profile has no skills.
 * Falls back to title/description text matching when structured skills are sparse.
 * @param {Object|string[]} jobOrSkills
 * @param {string[]} profileSkills
 * @returns {number}
 */
function calcScore(jobOrSkills, profileSkills) {
  if (!profileSkills || profileSkills.length === 0) return 0;
  const profileSet = canonicalSet(profileSkills);
  const matches = countMatches(jobOrSkills, profileSkills);
  return (matches / profileSet.size) * 100;
}

/**
 * Filters and ranks an array of normalised job objects against a user profile.
 *
 * Filtering order:
 *   1. Discard jobs from sites disabled in the profile
 *   2. Discard jobs whose title contains a blacklisted word
 *   3. Discard jobs where budget.max < profile.minBudget (when both defined)
 *   4. Calculate score: (matching skills / total profile skills) * 100
 *   5. Discard jobs with score < MIN_MATCH_SCORE (currently 30)
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

    // 4 & 5. Score / absolute matches — discard if both are below threshold.
    const matches = countMatches(job, profileSkills);
    const score = calcScore(job, profileSkills);
    if (matches < minMatches && score < minScore) continue;

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
