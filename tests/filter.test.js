'use strict';

const { filterJobs, SYNONYMS } = require('../shared/filter');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob(overrides = {}) {
  return {
    id: 'abc123',
    title: 'Frontend Developer',
    description: '',
    skills: ['react', 'typescript', 'node'],
    budget: { min: 1000, max: 3000, currency: 'USD' },
    deadline: null,
    site: 'upwork',
    url: 'https://upwork.com/jobs/1',
    postedAt: '2026-04-10T00:00:00.000Z',
    seenAt: '2026-04-16T00:00:00.000Z',
    ...overrides,
  };
}

function makeProfile(overrides = {}) {
  return {
    skills: ['react', 'typescript', 'node'],
    area: 'frontend',
    minBudget: null,
    currency: 'USD',
    languages: ['pt', 'en'],
    blacklist: [],
    sites: {
      upwork: true,
      workana: true,
      freelas99: true,
      linkedin: true,
      indeed: true,
      gupy: true,
    },
    fetchInterval: 60,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

describe('filterJobs — score 100', () => {
  test('job with all profile skills returns score 100', () => {
    const jobs = [makeJob({ skills: ['react', 'typescript', 'node'] })];
    const profile = makeProfile({ skills: ['react', 'typescript', 'node'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });
});

describe('filterJobs — score (job partial coverage)', () => {
  test('job with 50% of required skills passes and is generously scored', () => {
    // Job requires 4 skills, profile has 2 of them.
    // Generous formula picks max(jobCoverage 50, profileCoverage 100, matchRatio 67) → 100.
    const jobs = [makeJob({ skills: ['react', 'typescript', 'node', 'docker'] })];
    const profile = makeProfile({ skills: ['react', 'typescript'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThanOrEqual(50);
  });
});

describe('filterJobs — score below threshold', () => {
  test('job with very low score (0 matches) is discarded', () => {
    // Job requires Python, you have React/TS → 0/1 = 0%
    const jobs = [makeJob({ skills: ['python'] })];
    const profile = makeProfile({ skills: ['react', 'typescript'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(0);
  });

  test('job with single match across large stack is accepted via match-ratio', () => {
    // Job has 5 required skills, profile has 1 match. New formula picks
    // max(jobCoverage 20, profileCoverage 20, matchRatio 33) → 33.
    const jobs = [makeJob({ skills: ['react', 'python', 'java', 'go', 'rust'] })];
    const profile = makeProfile({ skills: ['react', 'typescript', 'node', 'docker', 'postgres'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThanOrEqual(20);
  });

  test('job with text fallback matching is accepted', () => {
    // No structured skills, but text mentions React, TypeScript
    // Profile has 5 skills, 2 matched → 40%
    const jobs = [makeJob({
      title: 'Backend role',
      description: 'Stack: React, Node.js, TypeScript.',
      skills: [],
    })];
    const profile = makeProfile({
      skills: ['react', 'node', 'typescript', 'python', 'docker'],
    });

    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThan(20);
  });
});

describe('filterJobs — minimum matched skills', () => {
  test('requires 2 matches for very large profiles (>=15 skills)', () => {
    const jobs = [makeJob({
      skills: ['react', 'python', 'java', 'go'],
      description: '',
    })];
    const profile = makeProfile({
      skills: [
        'react', 'typescript', 'node', 'docker', 'postgres', 'aws', 'redis', 'kubernetes',
        'mongo', 'vue', 'angular', 'graphql', 'kafka', 'rabbitmq', 'jenkins',
      ],
    });

    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(0);
  });

  test('keeps larger-profile jobs when minimum matched skills is reached', () => {
    const jobs = [makeJob({
      skills: ['react', 'node', 'python', 'java'],
      description: '',
    })];
    const profile = makeProfile({
      skills: ['react', 'typescript', 'node', 'docker', 'postgres', 'aws', 'redis', 'kubernetes'],
    });

    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });
});

describe('filterJobs — text fallback matching', () => {
  test('matches profile skills found in title and description when skills array is empty', () => {
    const jobs = [makeJob({
      title: 'Senior React Engineer',
      description: 'Build internal tools with Node.js for analytics teams.',
      skills: [],
    })];
    const profile = makeProfile({ skills: ['react', 'node', 'typescript'] });
    const result = filterJobs(jobs, profile);

    expect(result).toHaveLength(1);
    // Enrichment-only jobs are scored generously when profile coverage is high.
    expect(result[0].score).toBeGreaterThanOrEqual(50);
  });

  test('uses synonym matching inside description text', () => {
    const jobs = [makeJob({
      title: 'Frontend Developer',
      description: 'Work daily with ReactJS and modern TS tooling.',
      skills: [],
    })];
    const profile = makeProfile({ skills: ['react', 'typescript'] });
    const result = filterJobs(jobs, profile);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// Blacklist
// ---------------------------------------------------------------------------

describe('filterJobs — blacklist', () => {
  test('job with blacklisted word in title is discarded', () => {
    const jobs = [makeJob({ title: 'Senior React Developer (URGENT)' })];
    const profile = makeProfile({ blacklist: ['urgent'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(0);
  });

  test('blacklist check is case-insensitive', () => {
    const jobs = [makeJob({ title: 'React UNPAID internship' })];
    const profile = makeProfile({ blacklist: ['unpaid'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(0);
  });

  test('job without blacklisted words is kept', () => {
    const jobs = [makeJob({ title: 'React Developer' })];
    const profile = makeProfile({ blacklist: ['urgent', 'unpaid'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Keywords — used only as search terms sent to platforms, not as a post-filter
// ---------------------------------------------------------------------------

describe('filterJobs — keywords', () => {
  test('keywords do not filter out jobs that lack the keyword in title/description', () => {
    // The platform already filtered by keyword; the extension must not re-filter
    const jobs = [makeJob({ title: 'Desenvolvedor Full Stack Node.js + React' })];
    const profile = makeProfile({ keywords: ['frontend'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });

  test('job whose description contains a keyword is still kept', () => {
    const jobs = [makeJob({
      title: 'React role',
      description: 'Atuacao como desenvolvedor backend com Node.js.',
    })];
    const profile = makeProfile({ keywords: ['backend'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });

  test('job without keyword in title/description is still kept (platform already filtered)', () => {
    const jobs = [makeJob({ title: 'Data Analyst SQL' })];
    const profile = makeProfile({ keywords: ['frontend', 'developer'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });

  test('empty keywords list keeps all jobs (no filter applied)', () => {
    const jobs = [makeJob({ title: 'Data Analyst' }), makeJob({ title: 'React Developer' })];
    const profile = makeProfile({ keywords: [] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

describe('filterJobs — budget below minimum', () => {
  test('job with budget.max below minBudget is discarded', () => {
    const jobs = [makeJob({ budget: { min: 100, max: 400, currency: 'USD' } })];
    const profile = makeProfile({ minBudget: 500 });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(0);
  });

  test('job with budget.max equal to minBudget is kept', () => {
    const jobs = [makeJob({ budget: { min: 500, max: 500, currency: 'USD' } })];
    const profile = makeProfile({ minBudget: 500 });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });

  test('job with budget.max above minBudget is kept', () => {
    const jobs = [makeJob({ budget: { min: 1000, max: 3000, currency: 'USD' } })];
    const profile = makeProfile({ minBudget: 500 });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });
});

describe('filterJobs — no minBudget', () => {
  test('does not filter by budget when profile.minBudget is null', () => {
    const jobs = [makeJob({ budget: { min: 1, max: 10, currency: 'USD' } })];
    const profile = makeProfile({ minBudget: null });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });

  test('does not filter when job has no budget', () => {
    const jobs = [makeJob({ budget: null })];
    const profile = makeProfile({ minBudget: 1000 });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Site filter
// ---------------------------------------------------------------------------

describe('filterJobs — disabled site', () => {
  test('job from disabled site is discarded', () => {
    const jobs = [makeJob({ site: 'upwork' })];
    const profile = makeProfile({ sites: { upwork: false } });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(0);
  });

  test('job from enabled site is kept', () => {
    const jobs = [makeJob({ site: 'workana' })];
    const profile = makeProfile({
      sites: { upwork: false, workana: true, freelas99: true, linkedin: true, indeed: true, gupy: true },
    });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Synonyms
// ---------------------------------------------------------------------------

describe('filterJobs — synonyms', () => {
  test('profile "react" matches job skill "reactjs"', () => {
    const jobs = [makeJob({ skills: ['reactjs', 'typescript', 'node'] })];
    const profile = makeProfile({ skills: ['react', 'typescript', 'node'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  test('profile "node" matches job skill "node.js"', () => {
    const jobs = [makeJob({ skills: ['react', 'typescript', 'node.js'] })];
    const profile = makeProfile({ skills: ['react', 'typescript', 'node'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  test('profile "ts" matches job skill "typescript"', () => {
    const jobs = [makeJob({ skills: ['react', 'typescript', 'node'] })];
    const profile = makeProfile({ skills: ['react', 'ts', 'node'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  test('SYNONYMS is exported and contains expected entries', () => {
    expect(SYNONYMS).toHaveProperty('react');
    expect(SYNONYMS.react).toContain('reactjs');
    expect(SYNONYMS).toHaveProperty('node');
    expect(SYNONYMS.node).toContain('node.js');
  });
});

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

describe('filterJobs — ordering', () => {
  test('returns jobs sorted by score descending', () => {
    const jobs = [
      makeJob({ id: 'low',  skills: ['react', 'typescript'],         url: 'https://example.com/1' }),
      makeJob({ id: 'high', skills: ['react', 'typescript', 'node'], url: 'https://example.com/2' }),
      makeJob({ id: 'mid',  skills: ['react', 'typescript', 'vue'],  url: 'https://example.com/3',
                skills: ['react', 'node'] }),
    ];
    // Profile: react, typescript, node  (3 skills)
    // job "high" → 3/3 = 100
    // job "mid"  → 2/3 ≈ 67
    // job "low"  → 2/3 ≈ 67  (react + typescript)
    const profile = makeProfile({ skills: ['react', 'typescript', 'node'] });
    const result = filterJobs(jobs, profile);

    expect(result.length).toBeGreaterThan(0);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });
});
