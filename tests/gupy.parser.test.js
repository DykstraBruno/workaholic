'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseGupy } = require('../parsers/gupy.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'gupy.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseGupy', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseGupy(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseGupy(fixtureHtml);
    expect(jobs[0].title).toBe('Pessoa Desenvolvedora Frontend');
  });

  test('returns skills as an array', () => {
    const jobs = parseGupy(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toEqual(['React', 'TypeScript']);
  });

  test('parses budget when present', () => {
    const jobs = parseGupy(fixtureHtml);
    expect(jobs[0].budget).toEqual({ min: 6000, max: 9000, currency: 'BRL' });
  });

  test('returns budget as null when absent', () => {
    const jobs = parseGupy(fixtureHtml);
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parseGupy(fixtureHtml);
    expect(jobs[0].url).toBe('https://www.gupy.io/jobs/123');
    expect(jobs[2].url).toBe('https://www.gupy.io/jobs/789');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseGupy('')).not.toThrow();
    expect(parseGupy('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<article data-testid="job-card"><h2><a>Broken';
    expect(() => parseGupy(malformed)).not.toThrow();
  });

  test('selector fallback works for title extraction', () => {
    const jobs = parseGupy(fixtureHtml);
    expect(jobs[1].title).toBe('Analista de Dados Senior');
    expect(jobs[2].title).toBe('Pessoa Redatora');
  });
});
