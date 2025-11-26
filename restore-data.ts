import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Iniciando restauração de dados...');

    // Limpar banco
    try {
        await prisma.comment.deleteMany();
        await prisma.followUpRequest.deleteMany();
        await prisma.order.deleteMany();
        await prisma.user.deleteMany();
        try {
            // @ts-ignore
            await prisma.settings.deleteMany();
        } catch (e) {
            console.log('⚠️ Não foi possível limpar Settings');
        }
    } catch (error) {
        console.error('Erro ao limpar banco:', error);
    }

    console.log('🧹 Banco limpo');

    // Criar usuários padrão
    const vendedor = await prisma.user.create({
        data: {
            name: 'Vendedor Padrão',
            email: 'vendas@demo.com',
            role: 'VENDAS'
        }
    });

    const pcp = await prisma.user.create({
        data: {
            name: 'PCP Padrão',
            email: 'pcp@demo.com',
            role: 'PCP'
        }
    });

    // Criar Settings padrão
    try {
        // @ts-ignore
        await prisma.settings.create({
            data: {
                pcpName: 'Pedro PCP',
                pcpEmail: 'pedro.pcp@exemplo.com'
            }
        });
    } catch (e) {
        console.log('⚠️ Não foi possível criar Settings');
    }

    const filePath = path.join(process.cwd(), '..', 'Follow UP - Solicitações PCP.csv');

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Arquivo não encontrado: ${filePath}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Parse CSV handling multiline quotes
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

    console.log(`Total de linhas processadas: ${lines.length}`);

    // Encontrar a linha de cabeçalho
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

    // Mapear índices
    const idx = {
        pv: header.indexOf('PV'),
        cliente: header.indexOf('Cliente'),
        vendedor: header.indexOf('Vend.'),
        solicitante: header.indexOf('Solicitante'),
        solicitado: header.indexOf('Solicitado'),
        dtSol: header.indexOf('Dt. Sol.'),
        dtResp: header.indexOf('Dt. Resp.'),
        dtPed: header.indexOf('Data Ped.'),
        previsao: header.indexOf('Previsão'),
        obs: header.indexOf('Observação'),
        faturado: header.indexOf('Faturado')
    };

    console.log('📍 Índices mapeados:', idx);

    let ordersCount = 0;
    let requestsCount = 0;

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(';');

        // Ignorar linhas vazias ou inválidas
        if (!cols[idx.pv] || cols[idx.pv].trim() === '') continue;

        const pvCode = cols[idx.pv].trim();
        // Se pvCode parecer uma data (contém /), algo está errado, pular
        if (pvCode.includes('/')) {
            console.warn(`⚠️ Linha ${i} ignorada: PV inválido (${pvCode})`);
            continue;
        }

        const clientName = cols[idx.cliente]?.trim() || 'Cliente Desconhecido';
        const salespersonName = cols[idx.vendedor]?.trim() || 'Vendedor Desconhecido';

        const parseDate = (dateStr: string) => {
            if (!dateStr || dateStr.trim() === '') return null;
            try {
                const parts = dateStr.trim().split('/');
                if (parts.length === 3) {
                    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                }
                return null;
            } catch (e) {
                return null;
            }
        };

        const orderDate = parseDate(cols[idx.dtPed]) || new Date();
        const requestDate = parseDate(cols[idx.dtSol]) || new Date();
        const responseDate = parseDate(cols[idx.dtResp]);
        const forecastDate = parseDate(cols[idx.previsao]);

        // Remover aspas extras do campo de observação se houver
        let notes = cols[idx.obs]?.trim() || '';
        if (notes.startsWith('"') && notes.endsWith('"')) {
            notes = notes.slice(1, -1);
        }

        // Strict check for invoiced status
        const faturadoValue = cols[idx.faturado]?.trim();
        const invoiced = faturadoValue?.toLowerCase() === 'sim';

        // Invoice date seems to be the next column after Faturado
        const invoicedDate = invoiced ? parseDate(cols[idx.faturado + 1]) : null;

        let status = 'PENDENTE';
        if (invoiced) status = 'CONCLUIDO';
        else if (forecastDate && forecastDate < new Date()) status = 'ATRASADO';
        else if (responseDate) status = 'RESPONDIDO';

        let order = await prisma.order.findUnique({
            where: { pvCode }
        });

        if (!order) {
            order = await prisma.order.create({
                data: {
                    pvCode,
                    clientName,
                    salesperson: salespersonName,
                    orderDate,
                    status,
                    invoiced,
                    invoicedDate
                }
            });
            ordersCount++;
        }

        await prisma.followUpRequest.create({
            data: {
                orderId: order.id,
                requesterId: vendedor.id,
                requestedDept: cols[idx.solicitado] || 'PCP',
                requestDate,
                responseDate,
                forecastDate,
                notes,
            }
        });
        requestsCount++;
    }

    console.log(`✅ Restauração concluída!`);
    console.log(`📦 Pedidos: ${ordersCount}`);
    console.log(`📨 Solicitações: ${requestsCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
