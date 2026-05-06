'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseFreelancer } = require('../parsers/freelancer.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'freelancer.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseFreelancer', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseFreelancer(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseFreelancer(fixtureHtml);
    expect(jobs[0].title).toBe('Full Stack Developer Needed');
  });

  test('returns skills as an array', () => {
    const jobs = parseFreelancer(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toEqual(['React', 'Node.js', 'PostgreSQL']);
  });

  test('parses budget when present', () => {
    const jobs = parseFreelancer(fixtureHtml);
    expect(jobs[0].budget).toEqual({ min: 250, max: 750, currency: 'USD' });
  });

  test('returns budget as null when absent', () => {
    const jobs = parseFreelancer(fixtureHtml);
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parseFreelancer(fixtureHtml);
    expect(jobs[0].url).toBe('https://www.freelancer.com/projects/1/full-stack-developer-needed');
    expect(jobs[2].url).toBe('https://www.freelancer.com/projects/3/data-analyst');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseFreelancer('')).not.toThrow();
    expect(parseFreelancer('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<div class="JobSearchCard-item"><h2><a>Broken';
    expect(() => parseFreelancer(malformed)).not.toThrow();
  });

  test('extracts second job title', () => {
    const jobs = parseFreelancer(fixtureHtml);
    expect(jobs[1].title).toBe('Mobile App with Flutter');
  });
});
