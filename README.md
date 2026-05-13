# Workaholic

Workaholic is a cross-browser WebExtension for Firefox, Brave, Opera, Chromium, and Chrome that monitors job and freelance platforms, applies your filters locally, and notifies you only when new jobs match your profile.

https://github.com/user-attachments/assets/6e38c157-889b-4906-89df-641f58043450

---

## English

### Features

- Fetches jobs from multiple platforms.
- Applies profile-based filters: skills, keywords/role, blocked words, minimum budget, and enabled platforms.
- Calculates a match score based on job-required skills.
- Enriches low-metadata jobs by extracting skills from title and description.
- Removes duplicate jobs from the same cycle.
- Notifies only new jobs that passed filtering.
- Runs automatic background scans at the configured interval.

### Supported Platforms

- Upwork
- Workana
- 99Freelas
- LinkedIn
- Indeed (BR)
- Gupy

### Install in Chromium Browsers (Chrome, Brave, Opera, Chromium)

**For Users (Pre-built):**

1. Download the latest release from the Releases page.
2. Extract the ZIP file.
3. Open your browser extensions page:
   - Chrome/Brave/Chromium: `chrome://extensions`
   - Opera: `opera://extensions`
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select the extracted folder.


**For Developers:**

1. Clone this repository.
2. Install dependencies: `npm install`
3. Open your browser extensions page (see above).
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select the project root folder.


https://github.com/user-attachments/assets/6ad8c9de-f772-407a-8845-274b20ce00f8

### Install in Firefox (Temporary Add-on)

**For Users (Pre-built):**

1. Download the latest release from the Releases page.
2. Extract the ZIP file.
3. Open Firefox at `about:debugging`.
4. Click `This Firefox`.
5. Click `Load Temporary Add-on`.
6. Select the `.xpi` file from the extracted folder.


**For Developers:**

1. Clone this repository.
2. Install dependencies: `npm install`
3. Build Firefox package: `npm run build`
4. Open Firefox at `about:debugging`.
5. Click `This Firefox`.
6. Click `Load Temporary Add-on`.
7. Select the .xpi file from the build.


https://github.com/user-attachments/assets/9041a8aa-9a2b-4b88-93bf-4867037549de

### Firefox Signed Distribution

- `workaholic-firefox-unsigned.xpi` is only a packaged artifact. Release and Beta Firefox builds still require AMO signing before installation.
- Build unsigned packages with `npm run build`.
- Sign an unlisted Firefox package with `npm run sign:firefox`.
- Sign a listed AMO submission with `npm run sign:firefox:listed`.
- Set `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` in your shell before signing.
- Update `docs/amo-metadata.json` before the first listed submission on AMO.

### First-Time Setup

1. Click the extension icon in your browser.
2. Open the `Perfil` tab.
3. Add your skills.
4. Select your main area.
5. Set minimum budget and currency (optional).
6. Add keywords/role for more precise matching (optional).
7. Add blocked words to exclude unwanted titles (optional).
8. Enable the platforms you want to monitor.
9. Set the search frequency.
10. Click `Salvar`.

### How Matching Works

- Jobs are normalized to a single schema.
- Main score uses the job perspective:
  `(your matched skills / total skills required by the job) * 100`.
- When a job has no structured skills, the system infers skills from title and description.
- For sparse enriched jobs, a conservative score rule is applied to avoid artificial inflation.
- Final filtering uses a combination of dynamic minimum score and minimum match count.

### Filtering Flow

1. Check whether the platform is enabled.
2. Remove jobs with blocked words in the title.
3. Apply keywords/role filter (when configured).
4. Apply minimum budget filter (when job budget exists).
5. Compute matches and score.
6. Remove jobs below thresholds.
7. Deduplicate repeated results.
8. Sort by score (highest first).

### Smart Resume (Curriculo Tab)

- Imports PDF or DOCX.
- Extracts skills with controlled filtering to reduce noise.
- Uses a synonym and term catalog to reduce false positives.
- Lets you analyze a selected job and suggest resume keyword improvements.

### Screenshots

The images below are the 3 provided screenshots (Jobs, Profile, Resume). Save them to docs/screenshots/ with the filenames below to render them automatically in this README.

#### 1) Jobs tab - manual scan trigger

![Jobs tab: Search now button and last search status](docs/screenshots/01-vagas.png)

Caption: main screen for immediate scan execution.
How it works: click `Buscar agora` to fetch jobs from enabled platforms, apply filters, and refresh totals.

#### 2) Profile tab - filters configuration

![Profile tab: skills, area, budget, keywords, blocked words, and platforms](docs/screenshots/02-perfil.png)

Caption: profile panel to tune your search criteria.
How it works: define what you want to find and what should be ignored. These settings drive match scoring and job filtering.

#### 3) Resume tab - import and optimization

![Resume tab: file import and before/after analysis](docs/screenshots/03-curriculo.png)

Caption: resume import and fit analysis module.
How it works: after importing your resume, select a job to compare `Antes` and `Depois`, inspect `Match de skills da vaga`, and download an optimized version.

### Notifications

- Only new jobs that pass filtering trigger notifications.
- The extension badge shows the number of new jobs in the latest cycle.

### Troubleshooting

#### Jobs are not updating

1. Open `chrome://extensions`.
2. Click `Reload` on Workaholic.
3. Open the popup and click `Buscar agora`.

#### Background/service worker error

Reload the extension in `chrome://extensions`, `opera://extensions`, or `about:debugging#/runtime/this-firefox`. If it persists, inspect the latest background error entry for the extension.

#### Too few matched jobs

- Review your profile skills.
- Reduce strict keyword/role and blocked word constraints.
- Confirm target platforms are enabled.
- Run a manual search to validate changes.

### Privacy

- Filtering and processing run locally.
- No external backend is required for matching logic.
- Profile and job state are stored in browser extension storage.

### Development

- Run tests: `npm test`
- Coverage: `npm run test:coverage`
- Build distributables: `npm run build`
- Lint for Firefox/AMO compatibility: `npm run lint:firefox`
- Sign Firefox for self-distribution: `npm run sign:firefox`
- Main folders:
  - `background/` scheduling and orchestration
  - `popup/` extension UI
  - `parsers/` pure HTML parsers by platform
  - `scrapers/` platform content scripts
  - `shared/` normalization, filtering, and storage
  - `tests/` automated tests and fixtures

### License

MIT

---

## PT-BR

### Funcionalidades

- Busca vagas em várias plataformas.
- Aplica filtros por perfil: habilidades, palavras-chave/cargo, palavras bloqueadas, orçamento mínimo e plataformas ativas.
- Calcula score de aderência com base nas habilidades exigidas pela vaga.
- Enriquece vagas com pouco metadado extraindo habilidades de título e descrição.
- Remove duplicatas de vagas repetidas no mesmo ciclo.
- Notifica somente vagas novas que passaram no filtro.
- Executa buscas automáticas em background no intervalo configurado.

### Plataformas Suportadas

- Upwork
- Workana
- 99Freelas
- LinkedIn
- Indeed (BR)
- Gupy

### Instalação em navegadores Chromium (Chrome, Brave, Opera, Chromium)

**Para Usuários (Pré-compilado):**

1. Baixe a versão mais recente na página de Releases.
2. Extraia o arquivo ZIP.
3. Abra a página de extensões do navegador:
   - Chrome/Brave/Chromium: `chrome://extensions`
   - Opera: `opera://extensions`
4. Ative `Modo do desenvolvedor`.
5. Clique em `Carregar sem compactação`.
6. Selecione a pasta extraída.

**Para Desenvolvedores:**

1. Clone este repositório.
2. Instale dependências: `npm install`
3. Abra a página de extensões (veja acima).
4. Ative `Modo do desenvolvedor`.
5. Clique em `Carregar sem compactação`.
6. Selecione a pasta raiz do projeto.

https://github.com/user-attachments/assets/6ad8c9de-f772-407a-8845-274b20ce00f8

### Instalação no Firefox (Extensão temporária)

**Para Usuários (Pré-compilado):**

1. Baixe a versão mais recente na página de Releases.
2. Extraia o arquivo ZIP.
3. Abra o Firefox em `about:debugging`.
4. Clique em `Este Firefox`.
5. Clique em `Carregar extensão temporária`.
6. Selecione o arquivo `.xpi` .

https://github.com/user-attachments/assets/9041a8aa-9a2b-4b88-93bf-4867037549de

### Distribuição Assinada no Firefox

- `workaholic-firefox-unsigned.xpi` é apenas um pacote gerado. O Firefox Release e Beta ainda exigem assinatura pela AMO antes da instalação.
- Gere os pacotes com `npm run build`.
- Assine para distribuição própria (unlisted) com `npm run sign:firefox`.
- Assine para listagem pública na AMO com `npm run sign:firefox:listed`.
- Defina `AMO_JWT_ISSUER` e `AMO_JWT_SECRET` no shell antes de assinar.
- Atualize `docs/amo-metadata.json` antes da primeira submissão listada na AMO.

### Configuração Inicial

1. Clique no ícone da extensão no navegador.
2. Abra a aba `Perfil`.
3. Cadastre suas habilidades.
4. Selecione sua área principal.
5. Defina orçamento mínimo e moeda (opcional).
6. Adicione palavras-chave/cargo para busca mais assertiva (opcional).
7. Adicione palavras bloqueadas para excluir títulos indesejados (opcional).
8. Marque as plataformas que deseja monitorar.
9. Ajuste a frequência de busca.
10. Clique em `Salvar`.

### Como Funciona o Match

- As vagas são normalizadas para um formato único.
- O score principal usa a visão da vaga:
  `(habilidades suas que batem com a vaga / total de habilidades exigidas pela vaga) * 100`.
- Quando a vaga não traz habilidades estruturadas, o sistema tenta inferir habilidades pela descrição e título.
- Para vagas enriquecidas e esparsas, o score usa uma regra conservadora para evitar inflação artificial.
- O filtro final considera combinação de score mínimo dinâmico e quantidade mínima de matches.

### Fluxo de Filtragem

1. Valida se a plataforma está habilitada.
2. Remove vagas com palavras bloqueadas no título.
3. Aplica filtro de palavras-chave/cargo (quando configurado).
4. Aplica orçamento mínimo (quando houver valor de vaga).
5. Calcula matches e score.
6. Remove vagas abaixo dos limiares mínimos.
7. Deduplica resultados repetidos.
8. Ordena por score (maior para menor).

### Currículo Inteligente (Aba Currículo)

- Importa PDF ou DOCX.
- Extrai habilidades de forma controlada para evitar ruído.
- Usa catálogo de termos e sinônimos para reduzir falsos positivos.
- Permite analisar uma vaga e sugerir ajustes de palavras-chave para o currículo.

### Screenshots

As imagens abaixo correspondem aos 3 screenshots enviados (Vagas, Perfil e Currículo). Coloque os arquivos em docs/screenshots/ com os nomes abaixo para exibição automática no README.

#### 1) Aba Vagas - disparo manual de busca

![Aba Vagas: botao Buscar agora e status da ultima busca](docs/screenshots/01-vagas.png)

Legenda: tela principal para iniciar uma varredura imediata.
Como funciona: ao clicar em `Buscar agora`, a extensão coleta vagas nas plataformas habilitadas, aplica filtros e atualiza o total encontrado.

#### 2) Aba Perfil - configuracao dos filtros

![Aba Perfil: habilidades, área, orçamento, palavras-chave, bloqueios e plataformas](docs/screenshots/02-perfil.png)

Legenda: painel de personalização de critérios de busca.
Como funciona: você define o que deseja encontrar e o que deve ser ignorado. Esses dados alimentam o cálculo de match e o filtro das vagas.

#### 3) Aba Curriculo - importacao e otimizacao

![Aba Currículo: importação de arquivo e análise antes/depois](docs/screenshots/03-curriculo.png)

Legenda: módulo de importação de currículo e análise de aderência.
Como funciona: após importar o currículo, selecione uma vaga para comparar `Antes` e `Depois`, visualizar `Match de skills da vaga` e baixar uma versão otimizada.

### Notificações

- Apenas vagas novas e aprovadas no filtro geram notificação.
- O badge da extensão mostra a quantidade de novas vagas no último ciclo.

### Solução de Problemas

#### Não atualiza vagas

1. Abra `chrome://extensions`.
2. Clique em `Recarregar` na extensão Workaholic.
3. Volte ao popup e clique em `Buscar agora`.

#### Erro de background/service worker

Recarregue a extensão em `chrome://extensions`, `opera://extensions` ou `about:debugging#/runtime/this-firefox`. Se persistir, abra a entrada de erro/background mais recente da extensão.

#### Poucas vagas com match

- Revise suas habilidades no perfil.
- Reduza restrições em palavras-chave/cargo e palavras bloqueadas.
- Confirme se as plataformas desejadas estão ativas.
- Execute uma nova busca manual para validar o ajuste.

### Privacidade

- O filtro e o processamento são locais.
- Não há backend externo obrigatório para lógica de matching.
- Perfil e estado das vagas ficam no storage da extensão do navegador.

### Desenvolvimento

- Executar testes: `npm test`
- Cobertura de testes: `npm run test:coverage`
- Gerar pacotes: `npm run build`
- Validar compatibilidade Firefox/AMO: `npm run lint:firefox`
- Assinar pacote Firefox: `npm run sign:firefox`
- Pastas principais:
  - `background/` orquestração e agendamento
  - `popup/` interface da extensão
  - `parsers/` parsers HTML por plataforma
  - `scrapers/` content scripts por plataforma
  - `shared/` normalização, filtro e storage
  - `tests/` testes automatizados e fixtures

### Licença

MIT
