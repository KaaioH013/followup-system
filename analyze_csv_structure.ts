import fs from 'fs';
import path from 'path';

async function main() {
    const filePath = path.join(process.cwd(), '..', 'Follow UP - Solicitações PCP.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    // Handle different line endings
    const lines = fileContent.split(/\r?\n|\r/);

    console.log(`Total lines: ${lines.length}`);

    const headerLineIndex = 4;
    const header = lines[headerLineIndex].split(';');
    const idxPV = header.indexOf('PV');
    console.log(`Header PV index: ${idxPV}`);

    let badLines = 0;

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(';');

        if (cols.length < 5) continue;

        const pv = cols[idxPV];

        // Se PV tem barra, é data (provavelmente)
        if (pv && pv.includes('/')) {
            badLines++;
            if (badLines <= 3) {
                console.error(`--- BAD LINE ${i + 1} ---`);
                console.error(`PV Value: ${pv}`);
                console.error(`Line start: ${line.substring(0, 100)}`);
                console.error(`Cols count: ${cols.length}`);
                console.error('-----------------------');
            }
        }
    }
    console.log(`Total bad lines: ${badLines}`);
}

main();
