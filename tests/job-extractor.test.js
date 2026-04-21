'use strict';

const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.DOMParser = dom.window.DOMParser;

const {
  extractTextFromNode,
  normalizeText,
  validateJobText,
  htmlToCleanText,
} = require('../shared/job-extractor');

describe('job-extractor quick validation', () => {
  test('detects concatenated text as invalid', () => {
    const brokenText = 'DesenvolvedorAplicaniorRequisitosObrigatriosFormasuperiorcompletaandamentonciaComputaEngenhariaSoftware';
    const val = validateJobText(brokenText);

    expect(val.ok).toBe(false);
    expect(val.errors.some((e) => e.includes('WORDS_CONCATENATED'))).toBe(true);
  });

  test('extracts structured html preserving blocks and bullets', () => {
    const html = `
      <div>
        <h2>Desenvolvedor Java Pleno</h2>
        <p>Estamos buscando um dev para nosso time.</p>
        <h3>Requisitos:</h3>
        <ul>
          <li>Java 11+</li>
          <li>Spring Boot</li>
          <li>PostgreSQL</li>
        </ul>
        <h3>Diferenciais:</h3>
        <ul>
          <li>Kubernetes</li>
          <li>AWS</li>
        </ul>
      </div>
    `;

    const text = htmlToCleanText(html);
    const val = validateJobText(text);

    expect(text.includes('Desenvolvedor Java Pleno')).toBe(true);
    expect(text.includes('Requisitos')).toBe(true);
    expect(text.includes('- Java 11+')).toBe(true);
    expect(text.includes('- Spring Boot')).toBe(true);
    expect(text.includes('PlenoEstamos')).toBe(false);
    expect(val.ok).toBe(true);
  });

  test('preserves accents', () => {
    const html = '<p>Experiência em desenvolvimento de APIs. Formação em Ciência da Computação.</p>';
    const text = htmlToCleanText(html);

    expect(text.includes('Experiência')).toBe(true);
    expect(text.includes('Formação')).toBe(true);
    expect(text.includes('Ciência')).toBe(true);
    expect(text.includes('Experi ')).toBe(false);
  });

  test('flags short text as invalid', () => {
    const shortText = 'senior nao informado remoto efetivo tambem pcd';
    const val = validateJobText(shortText);

    expect(val.ok).toBe(false);
    expect(val.errors.some((e) => e.includes('TEXT_TOO_SHORT'))).toBe(true);
  });

  test('ignores script/style/nav/button', () => {
    const html = `
      <div>
        <script>var ads = loadAds();</script>
        <style>.x { color: red; }</style>
        <nav>Menu Home Sobre</nav>
        <h2>Vaga Backend</h2>
        <p>Experiência em Java e Spring Boot é obrigatória.</p>
        <button>Candidatar-se</button>
      </div>
    `;

    const text = htmlToCleanText(html);

    expect(text.includes('loadAds')).toBe(false);
    expect(text.includes('color: red')).toBe(false);
    expect(text.includes('Menu Home')).toBe(false);
    expect(text.includes('Candidatar')).toBe(false);
    expect(text.includes('Java e Spring Boot')).toBe(true);
  });

  test('normalizes whitespace', () => {
    const input = '  Java   Python\n\n\n\n  Go\t\t\tRust   ';
    const out = normalizeText(input);

    expect(out).toBe('Java Python\n\nGo Rust');
  });

  test('full gupy-like case should be valid and keep details', () => {
    const html = `
      <div data-testid="job-description">
        <h1>Desenvolvedor Full Stack Sênior</h1>
        <p>Somos uma empresa de tecnologia buscando um dev sênior.</p>
        <h2>Requisitos Obrigatórios:</h2>
        <ul>
          <li>Formação superior completa em Ciência da Computação ou áreas correlatas</li>
          <li>Experiência com Java 11+ e Spring Boot</li>
          <li>Conhecimento em React e TypeScript</li>
          <li>PostgreSQL e modelagem de dados</li>
        </ul>
        <h2>Desejáveis:</h2>
        <ul>
          <li>AWS (EC2, RDS, Lambda)</li>
          <li>Docker e Kubernetes</li>
        </ul>
      </div>
    `;

    const text = htmlToCleanText(html);
    const val = validateJobText(text);

    expect(val.ok).toBe(true);
    expect(val.stats.length).toBeGreaterThan(200);
    expect(val.stats.hasAccent).toBe(true);
    expect(text.includes('Java 11+')).toBe(true);
    expect(text.includes('Spring Boot')).toBe(true);
    expect(text.split('\n').filter((line) => line.startsWith('- ')).length).toBeGreaterThanOrEqual(6);
  });

  test('extractTextFromNode handles direct node extraction', () => {
    const container = document.createElement('div');
    container.innerHTML = '<h2>Titulo</h2><p>Paragrafo</p><ul><li>A</li><li>B</li></ul>';

    const out = normalizeText(extractTextFromNode(container));

    expect(out.includes('Titulo')).toBe(true);
    expect(out.includes('Paragrafo')).toBe(true);
    expect(out.includes('- A')).toBe(true);
    expect(out.includes('- B')).toBe(true);
  });
});
