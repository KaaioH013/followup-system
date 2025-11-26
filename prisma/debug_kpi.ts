import { prisma } from "@/lib/db";
import { differenceInDays } from "date-fns";

async function main() {
    console.log("Debugging KPI Calculation...");

    const requests = await prisma.followUpRequest.findMany({
        where: {
            responseDate: { not: null }
        },
        select: {
            id: true,
            requestDate: true,
            responseDate: true,
            order: {
                select: { pvCode: true }
            }
        }
    });

    console.log(`Found ${requests.length} responded requests.`);

    let totalDays = 0;
    let count = 0;
    const diffs = [];

    for (const req of requests) {
        if (req.responseDate && req.requestDate) {
            const diff = differenceInDays(new Date(req.responseDate), new Date(req.requestDate));
            diffs.push(diff);
            totalDays += diff;
            count++;

            if (diff > 50 || diff < 0) {
                // Log outliers
                console.log(`PV ${req.order.pvCode}: ${req.requestDate.toISOString().split('T')[0]} -> ${req.responseDate.toISOString().split('T')[0]} = ${diff} days`);
            }
        }
    }

    const avg = count > 0 ? totalDays / count : 0;
    console.log(`Calculated Average: ${avg.toFixed(2)} days`);
    console.log(`Min: ${Math.min(...diffs)}, Max: ${Math.max(...diffs)}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
