'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseUpwork } = require('../parsers/upwork.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'upwork.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseUpwork', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseUpwork(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseUpwork(fixtureHtml);
    expect(jobs[0].title).toBe('Senior React Engineer');
  });

  test('returns skills as an array', () => {
    const jobs = parseUpwork(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toEqual(['React', 'Node.js']);
  });

  test('parses budget when present', () => {
    const jobs = parseUpwork(fixtureHtml);
    expect(jobs[0].budget).toEqual({ min: 500, max: 1200, currency: 'USD' });
  });

  test('returns budget as null when absent', () => {
    const jobs = parseUpwork(fixtureHtml);
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parseUpwork(fixtureHtml);
    expect(jobs[0].url).toBe('https://www.upwork.com/jobs/~01');
    expect(jobs[2].url).toBe('https://www.upwork.com/jobs/~03');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseUpwork('')).not.toThrow();
    expect(parseUpwork('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<section data-test="JobTile"><h2 class="job-tile-title"><a>Broken';
    expect(() => parseUpwork(malformed)).not.toThrow();
  });

  test('selector fallback works for title extraction', () => {
    const jobs = parseUpwork(fixtureHtml);
    expect(jobs[1].title).toBe('Data Analyst needed');
    expect(jobs[2].title).toBe('Landing page copywriter');
  });
});
