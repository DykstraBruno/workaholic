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
  const lower = skill.toLowerCase().trim();
  return ALIAS_TO_CANONICAL[lower] ?? lower;
}

/**
 * Resolves an array of skills to their canonical forms (deduped).
 * @param {string[]} skills
 * @returns {Set<string>}
 */
function canonicalSet(skills) {
  return new Set((skills || []).map(canonicalize));
}

/**
 * Calculates the match score between a job and a profile.
 * Score = (skills in common / total profile skills) * 100
 * Returns 0 when the profile has no skills.
 * @param {string[]} jobSkills
 * @param {string[]} profileSkills
 * @returns {number}
 */
function calcScore(jobSkills, profileSkills) {
  if (!profileSkills || profileSkills.length === 0) return 0;

  const profileSet = canonicalSet(profileSkills);
  const jobSet = canonicalSet(jobSkills);

  let matches = 0;
  for (const skill of profileSet) {
    if (jobSet.has(skill)) matches++;
  }

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
 *   5. Discard jobs with score < 40
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
    sites = {},
  } = profile;

  // Pre-compute lowercased blacklist for fast comparison
  const blacklistLower = blacklist.map((w) => w.toLowerCase());

  const results = [];

  for (const job of jobs) {
    // 1. Site enabled in profile
    if (sites[job.site] === false) continue;

    // 2. Blacklist check against title
    const titleLower = (job.title || '').toLowerCase();
    if (blacklistLower.some((word) => titleLower.includes(word))) continue;

    // 3. Budget minimum
    if (
      minBudget != null &&
      job.budget != null &&
      job.budget.max < minBudget
    ) continue;

    // 4 & 5. Score — discard if below threshold
    const score = calcScore(job.skills, profileSkills);
    if (score < 40) continue;

    results.push({ ...job, score });
  }

  // 6. Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

module.exports = { filterJobs, SYNONYMS };
