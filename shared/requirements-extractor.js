'use strict';

(function initRequirementsExtractorV3() {
  const CATEGORIES = {
    linguagem: [
      'java', 'kotlin', 'scala', 'groovy', 'swift', 'objective-c', 'c', 'c++', 'c#', 'python',
      'ruby', 'php', 'javascript', 'typescript', 'go', 'golang', 'rust', 'dart', 'elixir',
      'erlang', 'haskell', 'clojure', 'lua', 'r', 'matlab', 'julia', 'bash', 'powershell',
      'sql', 'pl/sql', 't-sql', 'cobol', 'fortran', 'solidity',
    ],
    backend_framework: [
      'spring', 'spring boot', 'spring mvc', 'spring cloud', 'spring security', 'hibernate',
      'jpa', '.net', '.net core', 'asp.net', 'asp.net core', 'django', 'flask', 'fastapi',
      'rails', 'laravel', 'express', 'express.js', 'nestjs', 'koa', 'fastify', 'gin',
      'echo', 'fiber', 'actix', 'rocket', 'phoenix',
    ],
    frontend_framework: [
      'react', 'react native', 'next.js', 'gatsby', 'remix', 'vue', 'vue.js', 'nuxt.js',
      'angular', 'angularjs', 'svelte', 'sveltekit', 'solidjs', 'ember', 'backbone',
      'jquery', 'alpine.js', 'lit', 'stencil', 'preact', 'astro', 'htmx',
    ],
    mobile_ui: [
      'swiftui', 'uikit', 'appkit', 'combine', 'rxswift', 'alamofire', 'urlsession',
      'core data', 'realm', 'jetpack compose', 'android sdk', 'flutter', 'ionic',
      'xamarin', 'maui', 'capacitor', 'cordova', 'expo', 'xcode', 'android studio',
    ],
    css_styling: [
      'css', 'css3', 'sass', 'scss', 'less', 'stylus', 'postcss', 'tailwind css',
      'bootstrap', 'material ui', 'mui', 'chakra ui', 'ant design', 'styled components',
      'emotion', 'css modules', 'bem',
    ],
    banco_dados: [
      'mysql', 'mariadb', 'postgresql', 'oracle', 'sql server', 'ms sql', 'sqlite', 'db2',
      'mongodb', 'cassandra', 'dynamodb', 'redis', 'elasticsearch', 'opensearch', 'neo4j',
      'firebase', 'firestore', 'supabase', 'snowflake', 'bigquery', 'redshift',
      'databricks', 'influxdb', 'timescaledb', 'clickhouse', 'data lake', 'data warehouse',
    ],
    cloud: [
      'aws', 'ec2', 's3', 'lambda', 'rds', 'ecs', 'eks', 'cloudformation', 'cloudwatch',
      'sqs', 'sns', 'api gateway', 'cognito', 'iam', 'route 53', 'aurora', 'azure',
      'aks', 'cosmos db', 'azure devops', 'gcp', 'google cloud', 'gke', 'pub/sub',
      'oracle cloud', 'ibm cloud', 'digitalocean', 'heroku', 'vercel', 'netlify',
      'cloudflare', 'fly.io', 'railway',
    ],
    devops_infra: [
      'docker', 'kubernetes', 'k8s', 'openshift', 'rancher', 'helm', 'terraform',
      'pulumi', 'ansible', 'jenkins', 'gitlab ci', 'github actions', 'circleci',
      'travis ci', 'bamboo', 'teamcity', 'argo cd', 'flux', 'prometheus', 'grafana',
      'datadog', 'new relic', 'splunk', 'elk', 'logstash', 'kibana', 'fluentd',
      'zabbix', 'pagerduty',
    ],
    mensageria_streaming: [
      'kafka', 'rabbitmq', 'activemq', 'google pub/sub', 'azure service bus', 'nats',
      'mqtt', 'pulsar', 'kinesis',
    ],
    api_integracao: [
      'rest', 'rest api', 'restful', 'graphql', 'grpc', 'soap', 'websockets',
      'server-sent events', 'openapi', 'swagger', 'postman', 'insomnia', 'webhooks',
      'oauth', 'oauth2', 'jwt', 'saml', 'openid connect',
    ],
    versionamento_colaboracao: [
      'git', 'github', 'gitlab', 'bitbucket', 'svn', 'jira', 'confluence', 'trello',
      'asana', 'notion',
    ],
    testes: [
      'junit', 'testng', 'mockito', 'restassured', 'cucumber', 'selenium', 'cypress',
      'playwright', 'puppeteer', 'jest', 'vitest', 'mocha', 'chai', 'jasmine', 'karma',
      'pytest', 'unittest', 'rspec', 'xctest', 'xcuitest', 'espresso', 'appium', 'k6',
      'jmeter', 'gatling', 'sonarqube', 'testes unitarios',
    ],
    arquitetura: [
      'microservices', 'microsservicos', 'serverless', 'event-driven', 'event sourcing',
      'cqrs', 'ddd', 'tdd', 'bdd', 'clean architecture', 'hexagonal architecture',
      'ports and adapters', 'onion architecture', 'mvc', 'mvp', 'mvvm', 'mvi', 'solid',
      'design patterns', 'repository pattern', 'dependency injection', 'di', 'ioc',
      'twelve-factor app', '12-factor', 'soa', 'api-first', 'saga', 'circuit breaker',
    ],
    metodologia: [
      'scrum', 'kanban', 'xp', 'lean', 'agil', 'agile', 'safe', 'waterfall', 'devops',
      'devsecops', 'gitops', 'sre',
    ],
    seguranca: [
      'owasp', 'tls', 'ssl', 'https', 'mtls', 'oauth', 'oauth2', 'jwt', 'saml', 'ldap',
      'active directory', 'sso', 'sast', 'dast', 'owasp top 10', 'iso 27001', 'lgpd',
      'gdpr', 'pci-dss',
    ],
    data_ml_ai: [
      'pandas', 'numpy', 'scipy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras',
      'hugging face', 'langchain', 'llamaindex', 'openai api', 'spark', 'pyspark',
      'hadoop', 'airflow', 'dbt', 'flink', 'beam', 'jupyter', 'mlflow', 'kubeflow',
      'sagemaker', 'vertex ai', 'llms', 'rag', 'embeddings', 'vector databases',
      'pinecone', 'weaviate', 'chroma', 'milvus',
    ],
    build_pacote: [
      'maven', 'gradle', 'ant', 'npm', 'yarn', 'pnpm', 'pip', 'poetry', 'bundler',
      'composer', 'nuget', 'cargo', 'go modules', 'webpack', 'vite', 'rollup', 'parcel',
      'esbuild', 'babel', 'swc',
    ],
    sistema_operacional_servidor: [
      'linux', 'unix', 'windows server', 'macos', 'wsl', 'nginx', 'apache', 'iis',
      'tomcat', 'jetty', 'weblogic', 'websphere', 'haproxy', 'varnish', 'cdn',
    ],
  };

  const CANONICAL = {
    node: 'Node.js',
    nodejs: 'Node.js',
    'node.js': 'Node.js',
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    'rest apis': 'REST API',
    'rest api': 'REST API',
    restful: 'REST API',
    'api rest': 'REST API',
    'web apis': 'REST API',
    k8s: 'Kubernetes',
    kubernetes: 'Kubernetes',
    dynamo: 'DynamoDB',
    dynamodb: 'DynamoDB',
    golang: 'Go',
    go: 'Go',
    git: 'Git',
    '12 factor': 'Twelve-Factor App',
    '12-factor': 'Twelve-Factor App',
    'twelve-factor app': 'Twelve-Factor App',
    'sql server': 'SQL Server',
    'ms sql': 'SQL Server',
    aws: 'AWS',
    s3: 'Amazon S3',
    'amazon s3': 'Amazon S3',
    'ci/cd': 'CI/CD',
  };

  const SOFT_SKILLS = new Set([
    'comunicacao', 'empatia', 'organizacao', 'proatividade', 'lideranca', 'resiliencia',
    'trabalho em equipe', 'mao na massa', 'mao-na-massa',
  ]);

  const NOISE_TERMS = new Set([
    'desenvolvedor', 'desenvolvedora', 'senior', 'pleno', 'junior', 'vaga', 'sobre',
    'posicao', 'posicao', 'estamos', 'busca', 'uma', 'pessoa', 'com', 'perfil',
    'hands-on', 'visao', 'arquitetura', 'experiencia', 'consolidada', 'aplicacoes',
    'modernas', 'escalaveis', 'nesta', 'voce', 'sera', 'chave', 'evolucao', 'nossa',
    'plataforma', 'atuando', 'desde', 'concepcao', 'interfaces', 'alta', 'performance',
    'estrutura', 'integrados', 'nuvem', 'desenvolver', 'evoluir', 'construir', 'manter',
    'robustas', 'participar', 'ativamente', 'solucoes', 'garantindo', 'escalabilidade',
    'eficientes', 'servicos', 'internos', 'externos', 'trabalhar', 'modelagem',
    'bancos', 'requisitos', 'qualificacoes', 'conhecimento', 'familiaridade',
    'ferramentas', 'aplicadas', 'informacoes', 'adicionais', 'ambiente', 'inovacao',
    'tecnologias', 'ponta', 'foco', 'total', 'produtividade', 'tecnica', 'remoto',
    'efetivo', 'pcd', 'informado', 'bem',
  ]);

  const SHORT_TECH_TOKENS = new Set([
    'aws', 'api', 'sql', 'nosql', 'ui', 'ux', 'ec2', 's3', 'rds', 'eks', 'ecs',
    'gcp', 'jwt', 'sso', 'sre', 'ddd', 'tdd', 'bdd', 'mvc', 'mvp', 'mvvm', 'mvi',
    'git', 'di', 'ioc',
  ]);

  const CATALOG_TERMS = (() => {
    const set = new Set();
    for (const terms of Object.values(CATEGORIES)) {
      for (const term of terms) {
        set.add(norm(term));
      }
    }
    for (const value of Object.values(CANONICAL)) {
      set.add(norm(value));
    }
    return set;
  })();

  const IGNORE_SECTION_RE = /(sobre a empresa|sobre nos|quem somos|beneficios|o que oferecemos|vantagens|cultura|nossos valores|modalidade|local de trabalho|horario|remuneracao|contratacao)/i;
  const COMPANY_CONTEXT_RE = /(somos|nossa empresa|nosso time|nosso stack|trabalhamos com|nossos clientes usam)/i;
  const LEARNING_CONTEXT_RE = /(voce vai aprender|voce tera contato com|oportunidade de)/i;
  const REQUIREMENT_MARKERS_RE = /(e necessario|necessario|obrigatorio|required|must have|deve ter|precisa|pre-?requisito|qualificacoes|requisitos?|experiencia (em|com)|conhecimento (em|de)|vivencia com|familiaridade com|proficiencia em|o que esperamos|o que buscamos|o que procuramos)/i;
  const DIFFERENTIAL_MARKERS_RE = /(diferencial|desejavel|nice to have|plus|bonus|sera um diferencial|voce se destaca|conta pontos|valorizamos)/i;
  const RESPONSIBILITIES_RE = /(responsabilidades|atividades|o que voce vai fazer|suas entregas|dia a dia)/i;
  const HIRING_FLOW_RE = /(cadastro\d*|entrevista\d*|contrata\w*|triagem|gestor\d*|rh\d*|processo seletivo|etapas? do processo)/i;

  function norm(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function canonicalSkill(raw) {
    const n = norm(raw)
      .replace(/\bapis?\b/g, 'api')
      .replace(/\bapi's\b/g, 'api')
      .replace(/\brestful\b/g, 'rest')
      .trim();

    if (CANONICAL[n]) return CANONICAL[n];

    if (typeof globalThis.SYNONYMS === 'object' && globalThis.SYNONYMS) {
      for (const [canonical, aliases] of Object.entries(globalThis.SYNONYMS)) {
        if (n === norm(canonical)) return canonical;
        for (const alias of aliases || []) {
          if (n === norm(alias)) return canonical;
        }
      }
    }

    return raw;
  }

  function categoryOf(skill) {
    const n = norm(skill);
    for (const [category, terms] of Object.entries(CATEGORIES)) {
      if (terms.some((term) => n === norm(term))) return category;
    }

    if (/\bapi\b|\bgraphql\b|\bgrpc\b|\bsoap\b|\boauth\b|\bjwt\b/i.test(n)) return 'api_integracao';
    if (/\baws\b|\bazure\b|\bgcp\b|\bcloud\b/i.test(n)) return 'cloud';
    if (/\bjava\b|\bpython\b|\bgo\b|\btypescript\b|\bjavascript\b|\bkotlin\b|\bswift\b|\bsql\b/i.test(n)) return 'linguagem';
    return 'outros';
  }

  function parseVersion(skill, context) {
    const source = `${skill} ${context || ''}`;
    const javaVersion = source.match(/\bjava\s*(\d{1,2})\b/i);
    if (javaVersion) return javaVersion[1];

    const dotnet = source.match(/\.net\s*(\d+(?:\.\d+)*)\b/i);
    if (dotnet) return dotnet[1];

    return null;
  }

  function splitAtomic(line) {
    return String(line || '')
      .replace(/[•·]/g, '\n')
      .replace(/\s+e\s+/gi, ',')
      .replace(/\s+ou\s+/gi, ',')
      .replace(/[;|]/g, ',')
      .split(/[\n,]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function keywordCandidates(chunk) {
    const c = String(chunk || '').trim();
    const out = [];

    const tokenRegex = /[A-Za-z0-9.+#-]{2,32}/g;
    const tokens = c.match(tokenRegex) || [];

    for (const token of tokens) out.push(token);

    const composed = [
      /\b(ci\/?cd)\b/gi,
      /\b(rest\s*api|graphql|grpc|soap|oauth2?|jwt|saml)\b/gi,
      /\b(spring\s*boot|clean\s*architecture|repository\s*pattern|dependency\s*injection|testes?\s+unitarios)\b/gi,
      /\b(sql\s*server|amazon\s+s3|aws\s*glue|amazon\s+athena|data\s+lake|data\s+warehouse)\b/gi,
      /\b(twelve\s*[- ]?factor\s*app|12\s*factor)\b/gi,
    ];

    for (const re of composed) {
      let m;
      while ((m = re.exec(c)) !== null) {
        out.push(m[1]);
      }
    }

    return out;
  }

  function detectSkillMentions(line) {
    const mentions = [];
    const parts = splitAtomic(line);

    if (HIRING_FLOW_RE.test(line)) {
      return mentions;
    }

    for (const part of parts) {
      for (const candidate of keywordCandidates(part)) {
        const cleanedCandidate = String(candidate || '')
          .replace(/^[^A-Za-z0-9+#]+/, '')
          .replace(/[^A-Za-z0-9+#]+$/, '')
          .trim();

        if (!cleanedCandidate) continue;

        const canonical = canonicalSkill(cleanedCandidate);
        const category = categoryOf(canonical);
        const normalized = norm(canonical);

        if (!normalized) continue;
        if (/^#/.test(cleanedCandidate)) continue;
        if (/^li-[a-z0-9-]+$/i.test(normalized)) continue;
        if (/^[a-z]{1,2}$/.test(normalized) && !SHORT_TECH_TOKENS.has(normalized)) continue;
        if (SOFT_SKILLS.has(normalized)) continue;
        if (NOISE_TERMS.has(normalized)) continue;

        const inCatalog = CATALOG_TERMS.has(normalized);
        const looksTechnicalToken =
          /[+#./]/.test(canonical) ||
          SHORT_TECH_TOKENS.has(normalized);

        if (!inCatalog && !looksTechnicalToken) continue;

        // Reject alphanumeric recruitment-flow labels such as "Gestor4Entrevista".
        if (!inCatalog && /[a-z]/i.test(cleanedCandidate) && /\d/.test(cleanedCandidate)) continue;

        if (!inCatalog && normalized.length > 20) continue;

        if (normalized.length <= 2 && !SHORT_TECH_TOKENS.has(normalized)) continue;

        mentions.push({
          skill: canonical,
          versao: parseVersion(canonical, part),
          categoria: category,
          contexto: part,
        });
      }
    }

    const dedup = [];
    const seen = new Set();
    for (const m of mentions) {
      const k = `${norm(m.skill)}::${m.versao || ''}`;
      if (seen.has(k)) continue;
      seen.add(k);
      dedup.push(m);
    }

    return dedup;
  }

  function detectFormat(description) {
    const lines = String(description || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
    let hasReq = false;
    let hasDiff = false;

    for (const line of lines) {
      if (REQUIREMENT_MARKERS_RE.test(line) || /\b(requisitos?|qualificacoes|requirements|must have)\b/i.test(line)) {
        hasReq = true;
      }
      if (DIFFERENTIAL_MARKERS_RE.test(line)) {
        hasDiff = true;
      }
    }

    if (hasReq && hasDiff) return 'A_com_diferenciais';
    if (hasReq) return 'B_so_requisitos';
    return 'C_texto_corrido';
  }

  function maybeDegree(description) {
    const m = String(description || '').match(/(ciencia da computacao|sistemas de informacao|engenharia de computacao|analise e desenvolvimento de sistemas|computer science|software engineering)/i);
    return m ? m[1] : null;
  }

  function maybeExperienceYears(description) {
    const m = String(description || '').match(/(\d+)\s*\+?\s*(anos?|years?)\s+(de\s+)?experiencia/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function detectLanguages(description) {
    const txt = norm(description);
    const out = [];
    if (/\bingles\b|\benglish\b/.test(txt)) out.push('Ingles');
    if (/\bespanhol\b|\bspanish\b/.test(txt)) out.push('Espanhol');
    return out;
  }

  function classifyLineContext(line) {
    if (IGNORE_SECTION_RE.test(line)) return 'ignore_section';
    if (COMPANY_CONTEXT_RE.test(line)) return 'company_context';
    if (LEARNING_CONTEXT_RE.test(line)) return 'learning_context';
    if (DIFFERENTIAL_MARKERS_RE.test(line)) return 'differential_marker';
    if (REQUIREMENT_MARKERS_RE.test(line)) return 'requirement_marker';
    if (RESPONSIBILITIES_RE.test(line)) return 'responsibilities_header';
    return 'neutral';
  }

  function extractRequirements(description, format) {
    const lines = String(description || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const obrig = [];
    const diff = [];
    const ignored = [];
    const alerts = [];

    let sectionMode = 'neutral';

    for (const line of lines) {
      const ctx = classifyLineContext(line);

      if (ctx === 'ignore_section') {
        sectionMode = 'ignore_section';
        continue;
      }

      if (ctx === 'differential_marker') {
        sectionMode = 'diferenciais';
        continue;
      }

      if (ctx === 'requirement_marker') {
        sectionMode = 'requisitos';
      }

      if (ctx === 'responsibilities_header') {
        sectionMode = 'responsabilidades';
        continue;
      }

      const mentions = detectSkillMentions(line);
      if (!mentions.length) continue;

      if (ctx === 'company_context') {
        for (const mention of mentions) {
          ignored.push({ termo: mention.skill, motivo: 'descreve stack da empresa, nao requisito do candidato' });
        }
        continue;
      }

      if (ctx === 'learning_context' || sectionMode === 'ignore_section') {
        for (const mention of mentions) {
          ignored.push({ termo: mention.skill, motivo: 'contexto de beneficios/aprendizado, nao requisito' });
        }
        continue;
      }

      for (const mention of mentions) {
        if (sectionMode === 'diferenciais') {
          diff.push({ ...mention, origem: 'diferenciais' });
          continue;
        }

        if (sectionMode === 'responsabilidades') {
          obrig.push({ ...mention, origem: 'responsabilidades' });
          continue;
        }

        if (sectionMode === 'requisitos' || format !== 'C_texto_corrido') {
          obrig.push({ ...mention, origem: 'requisitos' });
          continue;
        }

        if (format === 'C_texto_corrido') {
          if (REQUIREMENT_MARKERS_RE.test(line) || DIFFERENTIAL_MARKERS_RE.test(line) || /\b(preciso|busco|procuramos|must|required|need)\b/i.test(line)) {
            obrig.push({ ...mention, origem: 'inferido' });
          } else {
            ignored.push({ termo: mention.skill, motivo: 'mencao tecnica sem contexto claro de requisito' });
          }
        }
      }
    }

    if (obrig.some((i) => i.origem === 'responsabilidades')) {
      alerts.push("Skills inferidas de 'Responsabilidades' - verificar se ha secao de requisitos explicita");
    }

    if (format === 'C_texto_corrido') {
      alerts.push('Vaga em formato texto corrido - nao foi possivel distinguir obrigatorios de diferenciais');
    }

    return { obrig, diff, ignored, alerts };
  }

  function dedupSkillObjects(items) {
    const out = [];
    const seen = new Set();
    for (const item of items || []) {
      const key = `${norm(item.skill)}::${item.versao || ''}::${item.origem || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function profileSkillMeta(raw) {
    const text = String(raw || '').trim();
    const normalized = norm(text);
    const canonical = canonicalSkill(text);
    const version = parseVersion(text, text);
    return {
      raw: text,
      normalized,
      canonical: norm(canonical),
      version,
    };
  }

  function buildMatch(req, diff, profileSkills) {
    const prof = (profileSkills || []).map(profileSkillMeta);

    function findMatch(reqItem) {
      const reqCanon = norm(canonicalSkill(reqItem.skill));
      const reqVersion = reqItem.versao || null;

      for (const p of prof) {
        if (p.canonical === reqCanon) {
          if (reqVersion && p.version && reqVersion !== p.version) {
            return { hit: true, alerta: `versao diferente: perfil v${p.version}, vaga v${reqVersion}` };
          }
          return { hit: true, alerta: null };
        }
      }

      const family = reqCanon.replace(/\s*\d+(?:\.\d+)?$/, '');
      if (family && family !== reqCanon) {
        for (const p of prof) {
          const pFamily = p.canonical.replace(/\s*\d+(?:\.\d+)?$/, '');
          if (pFamily === family) {
            return { hit: true, alerta: reqVersion || p.version ? `versao diferente: perfil v${p.version || '?'} , vaga v${reqVersion || '?'}` : null };
          }
        }
      }

      return { hit: false, alerta: null };
    }

    const obrigOk = [];
    const obrigMiss = [];
    const diffOk = [];
    const diffMiss = [];

    for (const item of req) {
      const res = findMatch(item);
      if (res.hit) {
        obrigOk.push({ skill: item.skill, alerta_versao: res.alerta });
      } else {
        obrigMiss.push(item.skill);
      }
    }

    for (const item of diff) {
      const res = findMatch(item);
      if (res.hit) {
        diffOk.push(item.skill);
      } else {
        diffMiss.push(item.skill);
      }
    }

    const reqPct = req.length ? Math.round((obrigOk.length / req.length) * 100) : 0;
    const total = req.length + diff.length;
    const totalPct = total ? Math.round(((obrigOk.length + diffOk.length) / total) * 100) : reqPct;

    return {
      obrigatorios_atendidos: obrigOk,
      obrigatorios_faltantes: obrigMiss,
      diferenciais_atendidos: diffOk,
      diferenciais_faltantes: diffMiss,
      percentual_match_obrigatorio: reqPct,
      percentual_match_geral: totalPct,
    };
  }

  function analyze({ descricao_vaga, skills_perfil, site_origem }) {
    const description = String(descricao_vaga || '');
    const profileSkills = Array.isArray(skills_perfil) ? skills_perfil : [];
    void site_origem;

    const format = detectFormat(description);
    const extracted = extractRequirements(description, format);

    const req = dedupSkillObjects(extracted.obrig);
    const diff = dedupSkillObjects(extracted.diff);
    const matches = buildMatch(req, diff, profileSkills);

    const alerts = [...extracted.alerts];

    if (/\bnuvem\b|\bcloud\b/i.test(description) && !req.concat(diff).some((item) => /aws|azure|gcp|google cloud|cloud/i.test(norm(item.skill)))) {
      alerts.push('Cloud (nao especificado) detectado com ambiguidade');
    }

    return {
      formato_detectado: format,
      requisitos_obrigatorios: req,
      requisitos_diferenciais: diff,
      formacao_exigida: maybeDegree(description),
      experiencia_minima_anos: maybeExperienceYears(description),
      idiomas_exigidos: detectLanguages(description),
      matches,
      alertas: alerts,
      skills_ignoradas_com_motivo: extracted.ignored,
    };
  }

  globalThis.RequirementsExtractor = { analyze };
})();
