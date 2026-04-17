'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseLinkedIn } = require('../parsers/linkedin.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'linkedin.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseLinkedIn', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseLinkedIn(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseLinkedIn(fixtureHtml);
    expect(jobs[0].title).toBe('Senior Frontend Engineer');
  });

  test('returns skills as an array', () => {
    const jobs = parseLinkedIn(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toEqual(['React', 'TypeScript']);
  });

  test('parses budget when present', () => {
    const jobs = parseLinkedIn(fixtureHtml);
    expect(jobs[0].budget).toEqual({ min: 4000, max: 6000, currency: 'USD' });
  });

  test('returns budget as null when absent', () => {
    const jobs = parseLinkedIn(fixtureHtml);
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parseLinkedIn(fixtureHtml);
    expect(jobs[0].url).toBe('https://www.linkedin.com/jobs/view/123');
    expect(jobs[2].url).toBe('https://www.linkedin.com/jobs/view/789');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseLinkedIn('')).not.toThrow();
    expect(parseLinkedIn('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<li class="jobs-search-results__list-item"><h3><a>Broken';
    expect(() => parseLinkedIn(malformed)).not.toThrow();
  });

  test('selector fallback works for title extraction', () => {
    const jobs = parseLinkedIn(fixtureHtml);
    expect(jobs[1].title).toBe('Data Analyst');
    expect(jobs[2].title).toBe('Product Copywriter');
  });
});
