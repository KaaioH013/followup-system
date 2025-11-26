import fs from 'fs';
import path from 'path';

async function main() {
    const filePath = path.join(process.cwd(), '..', 'Follow UP - Solicitações PCP.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Parse CSV handling multiline quotes (copied from restore-data.ts)
    const rawLines = fileContent.split(/\r?\n|\r/);
    const lines: string[] = [];
    let currentLine = '';

    for (const rawLine of rawLines) {
        if (currentLine) {
            currentLine += '\n' + rawLine;
        } else {
            currentLine = rawLine;
        }

        const quotes = (currentLine.match(/"/g) || []).length;
        if (quotes % 2 === 0) {
            lines.push(currentLine);
            currentLine = '';
        }
    }

    // Find header
    let headerLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('PV') && lines[i].includes('Cliente')) {
            headerLineIndex = i;
            break;
        }
    }

    if (headerLineIndex === -1) {
        console.error('❌ Cabeçalho não encontrado!');
        process.exit(1);
    }

    const header = lines[headerLineIndex].split(';');
    console.log('Header Columns:');
    header.forEach((col, idx) => console.log(`${idx}: ${col}`));

    const idxFaturado = header.indexOf('Faturado');
    console.log(`\nIndex of Faturado: ${idxFaturado}`);

    const uniqueFaturado = new Set<string>();
    const sampleRows: any[] = [];

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(';');

        if (cols[idxFaturado]) {
            uniqueFaturado.add(cols[idxFaturado].trim());
        } else {
            uniqueFaturado.add('(empty)');
        }

        if (sampleRows.length < 5) {
            sampleRows.push(cols);
        }
    }

    console.log('\nUnique values in Faturado:');
    console.log(Array.from(uniqueFaturado));

    console.log('\nSample Rows (Faturado and neighbors):');
    sampleRows.forEach((cols, i) => {
        console.log(`Row ${i}: Faturado=${cols[idxFaturado]}, NextCol=${cols[idxFaturado + 1]}`);
    });
}

main();
