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

describe('filterJobs — score 50', () => {
  test('job with half the profile skills returns score 50', () => {
    // Profile has 4 skills, job matches 2 → 50%
    const jobs = [makeJob({ skills: ['react', 'typescript'] })];
    const profile = makeProfile({ skills: ['react', 'typescript', 'node', 'docker'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(50);
  });
});

describe('filterJobs — score below 40', () => {
  test('job with score < 40 is discarded', () => {
    // Profile has 3 skills, job matches 1 → ~33%
    const jobs = [makeJob({ skills: ['react'] })];
    const profile = makeProfile({ skills: ['react', 'typescript', 'node'] });
    const result = filterJobs(jobs, profile);
    expect(result).toHaveLength(0);
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
