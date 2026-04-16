'use strict';

const { normalize } = require('../shared/normalizer');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullRaw = {
  title: 'React Developer needed',
  url: 'https://upwork.com/jobs/123',
  description: 'Build a SPA with React and TypeScript.',
  skills: ['React', 'TypeScript', 'Node.js'],
  budget: { min: 500, max: 1500, currency: 'USD' },
  deadline: '2026-05-01T00:00:00.000Z',
  postedAt: '2026-04-10T08:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Normalization with all fields present
// ---------------------------------------------------------------------------

describe('normalize — all fields present', () => {
  let job;
  beforeAll(() => {
    job = normalize(fullRaw, 'upwork');
  });

  test('returns correct site', () => {
    expect(job.site).toBe('upwork');
  });

  test('trims and preserves title', () => {
    expect(job.title).toBe('React Developer needed');
  });

  test('preserves description', () => {
    expect(job.description).toBe('Build a SPA with React and TypeScript.');
  });

  test('normalises skills to lowercase', () => {
    expect(job.skills).toEqual(['react', 'typescript', 'node.js']);
  });

  test('returns correct budget', () => {
    expect(job.budget).toEqual({ min: 500, max: 1500, currency: 'USD' });
  });

  test('returns deadline as ISO string', () => {
    expect(job.deadline).toBe('2026-05-01T00:00:00.000Z');
  });

  test('returns postedAt as ISO string', () => {
    expect(job.postedAt).toBe('2026-04-10T08:00:00.000Z');
  });

  test('returns seenAt as a valid ISO date close to now', () => {
    expect(() => new Date(job.seenAt)).not.toThrow();
    const diff = Date.now() - new Date(job.seenAt).getTime();
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(diff).toBeLessThan(5000);
  });

  test('returns a non-empty string id', () => {
    expect(typeof job.id).toBe('string');
    expect(job.id.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Normalization with null budget
// ---------------------------------------------------------------------------

describe('normalize — null budget', () => {
  test('returns null when budget is absent', () => {
    const job = normalize({ ...fullRaw, budget: undefined }, 'workana');
    expect(job.budget).toBeNull();
  });

  test('returns null when budget is explicitly null', () => {
    const job = normalize({ ...fullRaw, budget: null }, 'workana');
    expect(job.budget).toBeNull();
  });

  test('returns null when budget object has both min and max as 0', () => {
    const job = normalize({ ...fullRaw, budget: { min: 0, max: 0, currency: 'BRL' } }, 'workana');
    expect(job.budget).toBeNull();
  });

  test('accepts a bare numeric budget', () => {
    const job = normalize({ ...fullRaw, budget: 2000 }, 'indeed');
    expect(job.budget).toEqual({ min: 2000, max: 2000, currency: 'USD' });
  });
});

// ---------------------------------------------------------------------------
// Normalization with empty skills
// ---------------------------------------------------------------------------

describe('normalize — empty skills', () => {
  test('returns empty array when skills is absent', () => {
    const job = normalize({ ...fullRaw, skills: undefined }, 'linkedin');
    expect(job.skills).toEqual([]);
  });

  test('returns empty array when skills is an empty array', () => {
    const job = normalize({ ...fullRaw, skills: [] }, 'linkedin');
    expect(job.skills).toEqual([]);
  });

  test('deduplicates skills', () => {
    const job = normalize({ ...fullRaw, skills: ['React', 'react', 'REACT'] }, 'gupy');
    expect(job.skills).toEqual(['react']);
  });
});

// ---------------------------------------------------------------------------
// id consistency: same input → same id
// ---------------------------------------------------------------------------

describe('normalize — id consistency', () => {
  test('produces the same id for identical inputs', () => {
    const a = normalize(fullRaw, 'upwork');
    const b = normalize(fullRaw, 'upwork');
    expect(a.id).toBe(b.id);
  });

  test('id does not depend on seenAt (which changes each call)', () => {
    const a = normalize(fullRaw, 'upwork');
    const b = normalize(fullRaw, 'upwork');
    // seenAt may differ by milliseconds; id must still match
    expect(a.id).toBe(b.id);
    // sanity: seenAt fields are strings
    expect(typeof a.seenAt).toBe('string');
    expect(typeof b.seenAt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// id uniqueness: different inputs → different ids
// ---------------------------------------------------------------------------

describe('normalize — id uniqueness', () => {
  test('different urls produce different ids', () => {
    const a = normalize({ ...fullRaw, url: 'https://upwork.com/jobs/1' }, 'upwork');
    const b = normalize({ ...fullRaw, url: 'https://upwork.com/jobs/2' }, 'upwork');
    expect(a.id).not.toBe(b.id);
  });

  test('different titles produce different ids', () => {
    const a = normalize({ ...fullRaw, title: 'React Developer' }, 'upwork');
    const b = normalize({ ...fullRaw, title: 'Vue Developer' }, 'upwork');
    expect(a.id).not.toBe(b.id);
  });

  test('different sites produce different ids', () => {
    const a = normalize(fullRaw, 'upwork');
    const b = normalize(fullRaw, 'workana');
    expect(a.id).not.toBe(b.id);
  });
});

// ---------------------------------------------------------------------------
// Invalid site
// ---------------------------------------------------------------------------

describe('normalize — invalid site', () => {
  test('throws for an unknown site', () => {
    expect(() => normalize(fullRaw, 'unknown-site')).toThrow(/unknown site/);
  });
});
