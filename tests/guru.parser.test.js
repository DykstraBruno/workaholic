'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseGuru } = require('../parsers/guru.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'guru.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseGuru', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseGuru(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseGuru(fixtureHtml);
    expect(jobs[0].title).toBe('React Developer for SaaS Platform');
  });

  test('returns skills as an array', () => {
    const jobs = parseGuru(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toEqual(['React', 'Redux']);
  });

  test('parses budget when present', () => {
    const jobs = parseGuru(fixtureHtml);
    expect(jobs[0].budget).not.toBeNull();
    expect(jobs[0].budget.currency).toBe('USD');
  });

  test('returns budget as null when absent', () => {
    const jobs = parseGuru(fixtureHtml);
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parseGuru(fixtureHtml);
    expect(jobs[0].url).toBe('https://www.guru.com/jobs/react-developer-for-saas/1');
    expect(jobs[2].url).toBe('https://www.guru.com/jobs/mobile-app-developer/3');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseGuru('')).not.toThrow();
    expect(parseGuru('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<div class="record_block"><h2><a href="/jobs/broken/1">Broken';
    expect(() => parseGuru(malformed)).not.toThrow();
  });

  test('extracts second job title', () => {
    const jobs = parseGuru(fixtureHtml);
    expect(jobs[1].title).toBe('Python Data Engineer');
  });
});
