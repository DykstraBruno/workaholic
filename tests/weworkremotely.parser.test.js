'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseWeWorkRemotely } = require('../parsers/weworkremotely.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'weworkremotely.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseWeWorkRemotely', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseWeWorkRemotely(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseWeWorkRemotely(fixtureHtml);
    expect(jobs[0].title).toBe('Backend Engineer (Node.js)');
  });

  test('returns skills as an array', () => {
    const jobs = parseWeWorkRemotely(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toContain('Node.js');
  });

  test('always returns budget as null (WWR does not expose salary on list)', () => {
    const jobs = parseWeWorkRemotely(fixtureHtml);
    jobs.forEach((job) => expect(job.budget).toBeNull());
  });

  test('always returns absolute URLs', () => {
    const jobs = parseWeWorkRemotely(fixtureHtml);
    expect(jobs[0].url).toBe('https://weworkremotely.com/remote-jobs/1/backend-engineer-node');
    expect(jobs[2].url).toBe('https://weworkremotely.com/remote-jobs/3/devops-engineer');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseWeWorkRemotely('')).not.toThrow();
    expect(parseWeWorkRemotely('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<li class="feature"><a>Broken';
    expect(() => parseWeWorkRemotely(malformed)).not.toThrow();
  });

  test('extracts second job title', () => {
    const jobs = parseWeWorkRemotely(fixtureHtml);
    expect(jobs[1].title).toBe('Frontend React Developer');
  });
});
