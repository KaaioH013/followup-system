import { prisma } from "@/lib/db";

async function main() {
    console.log("Checking for delayed orders...");

    const now = new Date();

    // Find orders that are NOT invoiced and have a forecast date in the past
    // We need to check the latest request's forecast date for each order.
    // Since we can't easily do complex joins/filtering on related latest items in one query with Prisma,
    // we'll fetch candidate orders and filter in memory or use a raw query.
    // Given the dataset size (1600), fetching active orders is fine.

    const activeOrders = await prisma.order.findMany({
        where: {
            invoiced: false,
            status: { not: 'CONCLUIDO' }
        },
        include: {
            requests: {
                orderBy: { requestDate: 'desc' },
                take: 1
            }
        }
    });

    let updatedCount = 0;

    for (const order of activeOrders) {
        const lastRequest = order.requests[0];
        if (lastRequest && lastRequest.forecastDate) {
            const forecast = new Date(lastRequest.forecastDate);

            // Check if forecast is in the past (yesterday or before to be safe, or just < now)
            if (forecast < now) {
                if (order.status !== 'ATRASADO') {
                    console.log(`Marking Order ${order.pvCode} as ATRASADO (Forecast: ${forecast.toISOString().split('T')[0]})`);
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { status: 'ATRASADO' }
                    });
                    updatedCount++;
                }
            } else {
                // If it was ATRASADO but now forecast is future (e.g. updated), revert to RESPONDIDO?
                // For now, let's just handle marking as ATRASADO.
                // If the user updates the forecast in the UI, the server action should handle status updates.
            }
        }
    }

    console.log(`Updated ${updatedCount} orders to ATRASADO.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
