// generate-cvs.js
// Gera um currículo LaTeX para cada vaga a partir de vários arquivos JSON em uma pasta "dados-cvs".

const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'resume-template-parametrized.tex');
const dataDir = path.join(__dirname, 'dados-cvs');
const outputDir = path.join(__dirname, 'curriculos-gerados');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const template = fs.readFileSync(templatePath, 'utf8');

function fillTemplate(template, data) {
  return template
    .replace(/{{NOME}}/g, data.nome)
    .replace(/{{CIDADE}}/g, data.cidade)
    .replace(/{{ESTADO}}/g, data.estado)
    .replace(/{{EMAIL}}/g, data.email)
    .replace(/{{LINKEDIN}}/g, data.linkedin)
    .replace(/{{GITHUB}}/g, data.github)
    .replace(/{{LIDERANCA}}/g, data.lideranca)
    .replace(/{{EXPERIENCIAS}}/g, data.experiencias)
    .replace(/{{HABILIDADES_TECNICAS}}/g, data.habilidades_tecnicas)
    .replace(/{{IDIOMAS}}/g, data.idiomas)
    .replace(/{{EDUCACAO}}/g, data.educacao);
}

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const output = fillTemplate(template, data);
  const outName = `cv-${path.basename(file, '.json')}.tex`;
  fs.writeFileSync(path.join(outputDir, outName), output);
  console.log('Gerado:', outName);
});

console.log('Todos os currículos foram gerados em', outputDir);
