const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Follow UP - Solicitações PCP.csv');
const outputDir = path.join(__dirname, '..');

if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
// Handle BOM
const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

const lines = cleanContent.split(/\r?\n|\r/);
const header = lines[0];
const dataLines = lines.slice(1).filter(line => line.trim() !== '');

const totalLines = dataLines.length;
const chunkSize = Math.ceil(totalLines / 4);

console.log(`Total de linhas de dados: ${totalLines}`);
console.log(`Tamanho do pedaço: ${chunkSize}`);

for (let i = 0; i < 4; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    const chunk = dataLines.slice(start, end);

    if (chunk.length === 0) continue;

    const fileContent = [header, ...chunk].join('\n');
    const fileName = `Follow_UP_Part_${i + 1}.csv`;
    const outputPath = path.join(outputDir, fileName);

    fs.writeFileSync(outputPath, fileContent, 'utf-8'); // Write as UTF-8
    console.log(`Criado: ${fileName} (${chunk.length} linhas)`);
}
