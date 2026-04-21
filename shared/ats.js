'use strict';

// ---------------------------------------------------------------------------
// ATS (Applicant Tracking System) optimizer
// Extracts keywords from job descriptions, measures match against a resume
// text, and produces an optimized plain-text resume with missing keywords
// injected into the skills section.
// ---------------------------------------------------------------------------

// Common Portuguese/English stopwords to ignore when extracting keywords
const STOPWORDS = new Set([
  'de','da','do','das','dos','e','em','para','com','por','que','se','uma','um',
  'na','no','nas','nos','ao','à','a','o','os','as','é','são','ser','ter','pelo',
  'pela','mais','como','mas','ou','já','foi','tem','pode','nosso','nossa',
  'the','and','for','with','you','your','will','have','this','that','are','from',
  'our','not','all','can','work','team','about','also','its','their','other',
  'we','be','an','in','of','to','is','at','it','on','as','by','or','if','up',
]);

/**
 * Tokenises text into lowercase words (letters + digits, min 3 chars),
 * removes stopwords, and returns unique terms sorted by frequency.
 * @param {string} text
 * @returns {string[]}
 */
function extractKeywords(text) {
  if (!text) return [];

  const freq = {};
  const words = text
    .toLowerCase()
    .replace(/[^a-záàâãéêíóôõúüçñ\d\s+#.]/g, ' ')
    .split(/\s+/);

  for (const w of words) {
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    freq[w] = (freq[w] ?? 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

/**
 * Normalizes a keyword for comparison (lowercase, trim).
 * @param {string} kw
 * @returns {string}
 */
function normalize(kw) {
  return String(kw ?? '').toLowerCase().trim();
}

/**
 * Calculates ATS match percentage between job keywords and resume text.
 * @param {string[]} jobKeywords  — top keywords extracted from job description
 * @param {string}   resumeText  — plain text content of the resume
 * @returns {{ score: number, matched: string[], missing: string[] }}
 */
function calcMatch(jobKeywords, resumeText) {
  if (!jobKeywords.length) return { score: 0, matched: [], missing: [] };

  const resumeLower = normalize(resumeText);
  const matched = [];
  const missing = [];

  for (const kw of jobKeywords) {
    const n = normalize(kw);
    if (resumeLower.includes(n)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const score = Math.round((matched.length / jobKeywords.length) * 100);
  return { score, matched, missing };
}

/**
 * Detects the skills/competências section boundaries in plain resume text.
 * Returns the index after the section header, or -1 if not found.
 * @param {string} text
 * @returns {number}
 */
function findSkillsSectionEnd(text) {
  const patterns = [
    /\b(skills?|habilidades?|competências?|tecnologias?|conhecimentos?)\b/i,
  ];
  for (const pat of patterns) {
    const m = pat.exec(text);
    if (m) {
      // Find the end of that line
      const lineEnd = text.indexOf('\n', m.index);
      return lineEnd !== -1 ? lineEnd + 1 : m.index + m[0].length + 1;
    }
  }
  return -1;
}

/**
 * Builds an ATS-optimised plain-text resume by:
 * 1. Injecting missing keywords into the skills section.
 * 2. Keeping the rest of the text intact.
 *
 * @param {string}   resumeText     — original resume plain text
 * @param {string[]} missingKeywords — keywords to add
 * @returns {string} optimised plain-text resume
 */
function buildOptimizedResume(resumeText, missingKeywords) {
  if (!missingKeywords.length) return resumeText;

  const injection = missingKeywords.join(' | ');
  const sectionEnd = findSkillsSectionEnd(resumeText);

  if (sectionEnd !== -1) {
    return (
      resumeText.slice(0, sectionEnd) +
      injection + '\n' +
      resumeText.slice(sectionEnd)
    );
  }

  // No skills section found — append at the end
  return resumeText.trimEnd() + '\n\nHabilidades (ATS):\n' + injection + '\n';
}

/**
 * Full pipeline: given a job and a resume text, returns everything needed
 * to present results and generate the PDF.
 *
 * @param {{ title: string, description?: string, tags?: string[] }} job
 * @param {string} resumeText
 * @returns {{
 *   jobKeywords: string[],
 *   before: { score: number, matched: string[], missing: string[] },
 *   after:  { score: number, matched: string[], missing: string[] },
 *   optimizedText: string,
 * }}
 */
function optimizeForJob(job, resumeText) {
  const raw = [
    job.title ?? '',
    job.description ?? '',
    ...(job.tags ?? []),
  ].join(' ');

  const jobKeywords = extractKeywords(raw).slice(0, 40);
  const before = calcMatch(jobKeywords, resumeText);
  const optimizedText = buildOptimizedResume(resumeText, before.missing);
  const after = calcMatch(jobKeywords, optimizedText);

  return { jobKeywords, before, after, optimizedText };
}

// Exports (used by popup.js via script tag — no bundler)
window.ATS = { optimizeForJob, extractKeywords, calcMatch };
