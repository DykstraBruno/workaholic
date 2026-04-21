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

  test('extracts title and url when h3 title and full-link are separated', () => {
    const html = `
      <ul>
        <li class="base-card" data-job-id="42">
          <h3 class="base-search-card__title">Java Backend Engineer</h3>
          <a class="base-card__full-link" href="/jobs/view/42">Abrir vaga</a>
          <div class="base-search-card__snippet">Spring Boot, AWS e microservicos.</div>
        </li>
      </ul>
    `;

    const jobs = parseLinkedIn(html);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Java Backend Engineer');
    expect(jobs[0].url).toBe('https://www.linkedin.com/jobs/view/42');
    expect(jobs[0].description).toContain('Spring Boot');
  });

  test('collapses duplicated title prefix in malformed cards', () => {
    const html = `
      <ul>
        <li class="base-card" data-job-id="43">
          <a class="base-card__full-link" href="/jobs/view/43">Python Developer Python Developer with verification</a>
          <p>Remote role focused on backend services.</p>
        </li>
      </ul>
    `;

    const jobs = parseLinkedIn(html);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Python Developer');
  });
});
