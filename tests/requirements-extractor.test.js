'use strict';

const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.Node = dom.window.Node;
global.DOMParser = dom.window.DOMParser;

global.SYNONYMS = {
  node: ['node', 'nodejs', 'node.js'],
  typescript: ['typescript', 'ts'],
  javascript: ['javascript', 'js'],
  python: ['python'],
  mongo: ['mongo', 'mongodb'],
  docker: ['docker'],
};

require('../shared/requirements-extractor');

describe('requirements extractor noise filtering', () => {
  test('does not promote plain prose tokens to skills', () => {
    const description = `
      Desenvolvedor Full Stack Sênior (gupy)
      informado Remoto Efetivo também PcD
      Sobre a posição: Estamos em busca de uma pessoa com perfil hands-on.
      Requisitos e qualificações:
      Experiência sólida com JavaScript e TypeScript.
      Domínio em Next.js, React.
      Conhecimento em Node.js e NestJS.
      Conhecimento em bancos SQL e NoSQL.
      Infraestrutura AWS (Lambda, Amazon S3, API Gateway, Aurora RDS), Docker e Kubernetes.
      Diferenciais:
      Cursor, Codex, Claude Code.
    `;

    const result = globalThis.RequirementsExtractor.analyze({
      descricao_vaga: description,
      skills_perfil: ['javascript', 'typescript', 'node.js', 'aws'],
      site_origem: 'gupy',
    });

    const requiredSkills = result.requisitos_obrigatorios.map((item) => item.skill.toLowerCase());

    expect(requiredSkills).toContain('javascript');
    expect(requiredSkills).toContain('typescript');
    expect(requiredSkills).toContain('node.js');
    expect(requiredSkills).toContain('aws');
    expect(requiredSkills).toContain('docker');
    expect(requiredSkills).toContain('kubernetes');

    expect(requiredSkills).not.toContain('desenvolvedor');
    expect(requiredSkills).not.toContain('senior');
    expect(requiredSkills).not.toContain('remoto');
    expect(requiredSkills).not.toContain('efetivo');
    expect(requiredSkills).not.toContain('pcd');
    expect(requiredSkills).not.toContain('informadoremotoefetivotambem');

    expect(result.matches.percentual_match_obrigatorio).toBeGreaterThan(0);
  });

  test('filters LI labels and keeps CI/CD as single technical skill', () => {
    const description = `
      #LI-REMOTE #LI-MB1
      Requisitos e qualificações:
      Experiência com React Native, TypeScript e CI/CD.
      Conhecimento em API REST e Jest.
    `;

    const result = globalThis.RequirementsExtractor.analyze({
      descricao_vaga: description,
      skills_perfil: ['react native', 'typescript', 'ci/cd', 'jest'],
      site_origem: 'indeed',
    });

    const requiredSkills = result.requisitos_obrigatorios.map((item) => item.skill.toLowerCase());

    expect(requiredSkills).toContain('react');
    expect(requiredSkills).toContain('typescript');
    expect(requiredSkills).toContain('ci/cd');
    expect(requiredSkills).toContain('jest');

    expect(requiredSkills).not.toContain('#li-remote');
    expect(requiredSkills).not.toContain('#li-mb1');
    expect(requiredSkills).not.toContain('ci');
    expect(requiredSkills).not.toContain('cd');
  });

  test('ignores recruitment flow labels joined with numbers', () => {
    const description = `
      Etapas do processo seletivo:
      bem, Gestor4Entrevista, Cadastro1Cadastro, RH2Entrevista, o5Contrata, DDD
      Requisitos e qualificações:
      Experiência com Node.js, TypeScript e PostgreSQL.
    `;

    const result = globalThis.RequirementsExtractor.analyze({
      descricao_vaga: description,
      skills_perfil: ['node.js', 'typescript'],
      site_origem: 'gupy',
    });

    const requiredSkills = result.requisitos_obrigatorios.map((item) => item.skill.toLowerCase());

    expect(requiredSkills).toContain('node.js');
    expect(requiredSkills).toContain('typescript');
    expect(requiredSkills).toContain('postgresql');

    expect(requiredSkills).not.toContain('bem');
    expect(requiredSkills).not.toContain('gestor4entrevista');
    expect(requiredSkills).not.toContain('cadastro1cadastro');
    expect(requiredSkills).not.toContain('rh2entrevista');
    expect(requiredSkills).not.toContain('o5contrata');
    expect(requiredSkills).not.toContain('ddd');
  });
});
