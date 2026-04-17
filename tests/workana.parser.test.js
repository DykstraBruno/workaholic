'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseWorkana } = require('../parsers/workana.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'workana.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseWorkana', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseWorkana(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseWorkana(fixtureHtml);
    expect(jobs[0].title).toBe('Frontend React Specialist');
  });

  test('returns skills as an array', () => {
    const jobs = parseWorkana(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toEqual(['React', 'TypeScript']);
  });

  test('parses budget when present', () => {
    const jobs = parseWorkana(fixtureHtml);
    expect(jobs[0].budget).toEqual({ min: 400, max: 900, currency: 'USD' });
  });

  test('returns budget as null when absent', () => {
    const jobs = parseWorkana(fixtureHtml);
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parseWorkana(fixtureHtml);
    expect(jobs[0].url).toBe('https://www.workana.com/job/12345');
    expect(jobs[2].url).toBe('https://www.workana.com/job/24680');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseWorkana('')).not.toThrow();
    expect(parseWorkana('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<article data-test="project-card"><h2><a>Broken';
    expect(() => parseWorkana(malformed)).not.toThrow();
  });

  test('selector fallback works for title extraction', () => {
    const jobs = parseWorkana(fixtureHtml);
    expect(jobs[1].title).toBe('Marketing automation consultant');
    expect(jobs[2].title).toBe('Copywriter for product launch');
  });
});
