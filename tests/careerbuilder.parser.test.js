'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseCareerBuilder } = require('../parsers/careerbuilder.parser');

const fixturePath = path.join(__dirname, 'fixtures', 'careerbuilder.html');
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

beforeAll(() => {
  global.DOMParser = new JSDOM('').window.DOMParser;
});

describe('parseCareerBuilder', () => {
  test('returns the correct number of jobs', () => {
    const jobs = parseCareerBuilder(fixtureHtml);
    expect(jobs).toHaveLength(3);
  });

  test('extracts title', () => {
    const jobs = parseCareerBuilder(fixtureHtml);
    expect(jobs[0].title).toBe('Software Engineer - Remote');
  });

  test('returns skills as an empty array (site has no skill tags)', () => {
    const jobs = parseCareerBuilder(fixtureHtml);
    expect(Array.isArray(jobs[0].skills)).toBe(true);
    expect(jobs[0].skills).toHaveLength(0);
  });

  test('budget is always null (site does not expose salary in listing)', () => {
    const jobs = parseCareerBuilder(fixtureHtml);
    expect(jobs[0].budget).toBeNull();
    expect(jobs[2].budget).toBeNull();
  });

  test('always returns absolute URLs', () => {
    const jobs = parseCareerBuilder(fixtureHtml);
    expect(jobs[0].url).toBe('https://www.careerbuildercareers.com/en-US/job/software-engineer-remote/J3N5016079QG7BVB2TR');
    expect(jobs[2].url).toBe('https://www.careerbuildercareers.com/en-US/job/devops-engineer/J0P9876543ZYXWV');
  });

  test('description includes company and location', () => {
    const jobs = parseCareerBuilder(fixtureHtml);
    expect(jobs[0].description).toContain('Acme Corp');
    expect(jobs[0].description).toContain('Remote, USA');
  });

  test('extracts postedAt from date column', () => {
    const jobs = parseCareerBuilder(fixtureHtml);
    expect(jobs[0].postedAt).toBe('1 day ago');
  });

  test('does not throw on empty HTML', () => {
    expect(() => parseCareerBuilder('')).not.toThrow();
    expect(parseCareerBuilder('')).toEqual([]);
  });

  test('does not throw on malformed HTML', () => {
    const malformed = '<table><tr class="job-result"><td><a class="job-result-title" href="/en-US/job/x/1">Broken';
    expect(() => parseCareerBuilder(malformed)).not.toThrow();
  });

  test('extracts second job title', () => {
    const jobs = parseCareerBuilder(fixtureHtml);
    expect(jobs[1].title).toBe('Frontend Developer');
  });
});
