'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseFreelas99 } = require('../parsers/freelas99.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'freelas99.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseFreelas99', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseFreelas99(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseFreelas99(fixtureHtml);
    expect(jobs[0].title).toBe('Desenvolvedor React para SaaS');
  });

  test('returns skills as an array', () => {
    const jobs = parseFreelas99(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toEqual(['React', 'JavaScript']);
  });

  test('parses budget when present as BRL range', () => {
    const jobs = parseFreelas99(fixtureHtml);
    expect(jobs[0].budget).toEqual({ min: 1500, max: 3000, currency: 'BRL' });
  });

  test('returns budget as null when absent', () => {
    const jobs = parseFreelas99(fixtureHtml);
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parseFreelas99(fixtureHtml);
    expect(jobs[0].url).toBe('https://www.99freelas.com.br/projeto/123456');
    expect(jobs[2].url).toBe('https://www.99freelas.com.br/projeto/777888');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseFreelas99('')).not.toThrow();
    expect(parseFreelas99('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<article data-test="project-card"><h2><a>Broken';
    expect(() => parseFreelas99(malformed)).not.toThrow();
  });

  test('selector fallback works for title extraction', () => {
    const jobs = parseFreelas99(fixtureHtml);
    expect(jobs[1].title).toBe('Especialista em SEO tecnico');
    expect(jobs[2].title).toBe('Redator para blog de tecnologia');
  });
});
