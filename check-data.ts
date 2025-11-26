import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    const orders = await prisma.order.findMany({
        include: {
            requests: true
        }
    });

    console.log('Total de pedidos:', orders.length);

    for (const order of orders) {
        console.log(`\nPedido: ${order.pvCode}`);
        order.requests.forEach(req => {
            console.log(`- Solicitação: ${req.id}`);
            console.log(`  - PCP Email: ${req.pcpEmail}`);
            console.log(`  - PCP Nome: ${req.pcpName}`);
            console.log(`  - Forecast: ${req.forecastDate}`);
        });
    }
}

checkData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
