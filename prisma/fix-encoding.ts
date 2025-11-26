import { prisma } from "@/lib/db";

function fixEncoding(text: string | null): string | null {
    if (!text) return text;

    return text
        .replace(/Ã£/g, "ã")
        .replace(/Ã¡/g, "á")
        .replace(/Ã©/g, "é")
        .replace(/Ã­/g, "í")
        .replace(/Ã³/g, "ó")
        .replace(/Ãº/g, "ú")
        .replace(/Ã§/g, "ç")
        .replace(/Ã¢/g, "â")
        .replace(/Ãª/g, "ê")
        .replace(/Ã/g, "Á"); // Fallback
}

async function main() {
    console.log("Fixing encoding issues...");

    // Fix Users
    const users = await prisma.user.findMany({
        where: {
            name: {
                contains: "Ã",
            },
        },
    });

    for (const user of users) {
        const newName = fixEncoding(user.name);
        if (newName && newName !== user.name) {
            console.log(`Fixing User: ${user.name} -> ${newName}`);
            await prisma.user.update({
                where: { id: user.id },
                data: { name: newName },
            });
        }
    }

    // Fix Orders (salesperson and clientName)
    const orders = await prisma.order.findMany({
        where: {
            OR: [
                { salesperson: { contains: "Ã" } },
                { clientName: { contains: "Ã" } },
            ],
        },
    });

    for (const order of orders) {
        const newSalesperson = fixEncoding(order.salesperson) || order.salesperson;
        const newClientName = fixEncoding(order.clientName) || order.clientName;

        if (newSalesperson !== order.salesperson || newClientName !== order.clientName) {
            console.log(`Fixing Order ${order.pvCode}: ${order.salesperson} -> ${newSalesperson}`);
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    salesperson: newSalesperson,
                    clientName: newClientName
                },
            });
        }
    }

    // Fix FollowUpRequest notes
    const requests = await prisma.followUpRequest.findMany({
        where: {
            notes: {
                contains: "Ã",
            },
        },
    });

    for (const req of requests) {
        const fixedNotes = fixEncoding(req.notes);
        if (fixedNotes && fixedNotes !== req.notes) {
            console.log(`Fixing Request Notes ${req.id}: ${req.notes?.substring(0, 20)}... -> ${fixedNotes.substring(0, 20)}...`);
            await prisma.followUpRequest.update({
                where: { id: req.id },
                data: { notes: fixedNotes },
            });
        }
    }

    console.log("Encoding fix complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
