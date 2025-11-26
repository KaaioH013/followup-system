import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    const count = await prisma.order.count();
    console.log(`Total orders: ${count}`);

    const orders = await prisma.order.findMany({ take: 5 });
    console.log("First 5 orders:", orders.map(o => o.pvCode));

    const order = await prisma.order.findFirst({
        where: { pvCode: "36838" },
        include: {
            requests: {
                orderBy: { requestDate: 'asc' }
            }
        }
    });

    if (!order) {
        console.log("Order 36838 not found");
    } else {
        console.log(`Order: ${order.pvCode}, Status: ${order.status}`);
        console.log("Requests:", JSON.stringify(order.requests, null, 2));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
