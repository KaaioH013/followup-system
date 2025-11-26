import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateRequests() {
    console.log('Verificando solicitações duplicadas...');

    const orders = await prisma.order.findMany({
        include: {
            requests: {
                orderBy: { requestDate: 'asc' }
            }
        }
    });

    let duplicatesRemoved = 0;

    for (const order of orders) {
        if (order.requests.length > 1) {
            // Group requests by date to find duplicates
            const requestsByDate = new Map<string, any[]>();

            for (const request of order.requests) {
                const dateKey = request.requestDate.toISOString().split('T')[0];
                if (!requestsByDate.has(dateKey)) {
                    requestsByDate.set(dateKey, []);
                }
                requestsByDate.get(dateKey)!.push(request);
            }

            // Remove duplicates (keep only the first one for each date)
            for (const [date, requests] of requestsByDate.entries()) {
                if (requests.length > 1) {
                    console.log(`Pedido ${order.pvCode}: ${requests.length} solicitações na mesma data (${date})`);

                    // Keep the first, delete the rest
                    for (let i = 1; i < requests.length; i++) {
                        await prisma.followUpRequest.delete({
                            where: { id: requests[i].id }
                        });
                        duplicatesRemoved++;
                        console.log(`  - Removida solicitação duplicada ID: ${requests[i].id}`);
                    }
                }
            }
        }
    }

    console.log(`\nTotal de duplicatas removidas: ${duplicatesRemoved}`);

    // Show final count
    const finalCount = await prisma.followUpRequest.count();
    console.log(`Total de solicitações restantes: ${finalCount}`);
}

removeDuplicateRequests()
    .then(() => {
        console.log('\nLimpeza concluída!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Erro:', error);
        process.exit(1);
    });
