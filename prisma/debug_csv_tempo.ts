import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

async function main() {
    const csvPath = path.resolve('..', 'Follow UP - Solicitações PCP.csv');
    const fileContent = fs.readFileSync(csvPath, { encoding: 'latin1' });
    const lines = fileContent.split('\n');
    const cleanContent = lines.slice(4).join('\n');

    const records = parse(cleanContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ';',
        relax_column_count: true,
        trim: true,
    }) as any[];

    let totalTempo = 0;
    let count = 0;

    for (const record of records) {
        const tempoStr = record['Tempo'];
        if (tempoStr) {
            const days = parseInt(tempoStr.replace(' dia(s)', '').trim());
            if (!isNaN(days)) {
                totalTempo += days;
                count++;

                if (count <= 5 || days > 300) {
                    console.log(`PV ${record['PV']}: Order ${record['Data Ped.']}, Req ${record['Dt. Sol.']}, Resp ${record['Dt. Resp.']}, Tempo ${days}`);
                }
            }
        }
    }

    const avg = count > 0 ? totalTempo / count : 0;
    console.log(`CSV Records with Tempo: ${count}`);
    console.log(`Total Tempo: ${totalTempo}`);
    console.log(`Average Tempo from CSV: ${avg.toFixed(2)} days`);
}

main();
