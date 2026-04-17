'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseIndeed } = require('../parsers/indeed.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'indeed.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseIndeed', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseIndeed(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseIndeed(fixtureHtml);
    expect(jobs[0].title).toBe('Desenvolvedor Full Stack');
  });

  test('returns skills as an array', () => {
    const jobs = parseIndeed(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toEqual(['Node.js', 'React']);
  });

  test('parses budget when present', () => {
    const jobs = parseIndeed(fixtureHtml);
    expect(jobs[0].budget).toEqual({ min: 3000, max: 5000, currency: 'BRL' });
  });

  test('returns budget as null when absent', () => {
    const jobs = parseIndeed(fixtureHtml);
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parseIndeed(fixtureHtml);
    expect(jobs[0].url).toBe('https://br.indeed.com/viewjob?jk=abc123');
    expect(jobs[2].url).toBe('https://br.indeed.com/viewjob?jk=ghi789');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseIndeed('')).not.toThrow();
    expect(parseIndeed('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<script type="application/ld+json">{"@type":"JobPosting"';
    expect(() => parseIndeed(malformed)).not.toThrow();
  });

  test('selector fallback works for title extraction', () => {
    const cssOnlyHtml = `
      <article class="job_seen_beacon">
        <h2><a href="/viewjob?jk=cssA">Backend Engineer</a></h2>
        <div class="job-snippet">Build APIs</div>
      </article>
      <article class="result">
        <div data-testid="job-title">Data Scientist</div>
        <p>ML models and experiments</p>
      </article>
      <article data-testid="jobsearch-SerpJobCard">
        <h3><a href="/viewjob?jk=cssC">UX Writer</a></h3>
        <p>Content strategy</p>
      </article>
    `;

    const jobs = parseIndeed(cssOnlyHtml);
    expect(jobs[1].title).toBe('Data Scientist');
    expect(jobs[2].title).toBe('UX Writer');
  });
});
