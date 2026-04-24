// generate-cv.js
// Script Node.js para gerar currículo LaTeX personalizado a partir de um JSON de dados

const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos
const templatePath = path.join(__dirname, 'resume-template-parametrized.tex');
const dataPath = path.join(__dirname, 'cv-data.json'); // Exemplo de dados
const outputPath = path.join(__dirname, 'cv-gerado.tex');

// Função para substituir placeholders do template
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

// Carrega template e dados
const template = fs.readFileSync(templatePath, 'utf8');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Gera currículo preenchido
const output = fillTemplate(template, data);
fs.writeFileSync(outputPath, output);

console.log('Currículo gerado em', outputPath);
