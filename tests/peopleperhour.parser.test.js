'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parsePeoplePerHour } = require('../parsers/peopleperhour.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'peopleperhour.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parsePeoplePerHour', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parsePeoplePerHour(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parsePeoplePerHour(fixtureHtml);
    expect(jobs[0].title).toBe('WordPress Website Redesign');
  });

  test('returns skills as an array', () => {
    const jobs = parsePeoplePerHour(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toEqual(['WordPress', 'WooCommerce']);
  });

  test('parses GBP budget when present', () => {
    const jobs = parsePeoplePerHour(fixtureHtml);
    expect(jobs[0].budget).toEqual({ min: 300, max: 600, currency: 'GBP' });
  });

  test('returns budget as null when absent', () => {
    const jobs = parsePeoplePerHour(fixtureHtml);
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parsePeoplePerHour(fixtureHtml);
    expect(jobs[0].url).toBe('https://www.peopleperhour.com/job/101/wordpress-redesign');
    expect(jobs[2].url).toBe('https://www.peopleperhour.com/job/103/logo-design');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parsePeoplePerHour('')).not.toThrow();
    expect(parsePeoplePerHour('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<div data-test="job-card"><h2>Broken';
    expect(() => parsePeoplePerHour(malformed)).not.toThrow();
  });

  test('extracts second job title', () => {
    const jobs = parsePeoplePerHour(fixtureHtml);
    expect(jobs[1].title).toBe('SEO Audit and Strategy');
  });
});
