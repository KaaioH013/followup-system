'use server';

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createFollowUpRequest(formData: FormData) {
    const orderId = formData.get("orderId") as string;
    const notes = formData.get("notes") as string;
    const requestedDept = formData.get("requestedDept") as string || "PCP";
    const requesterId = formData.get("requesterId") as string;
    const pcpEmail = formData.get("pcpEmail") as string;
    const pcpName = formData.get("pcpName") as string;

    // Use provided requesterId or fallback to default
    let requester;
    if (requesterId) {
        requester = await prisma.user.findUnique({ where: { id: requesterId } });
    }

    if (!requester) {
        requester = await prisma.user.findFirst({ where: { role: 'VENDAS' } })
            || await prisma.user.create({ data: { name: 'Vendedor Padrão', email: 'vendas@demo.com', role: 'VENDAS' } });
    }

    await prisma.followUpRequest.create({
        data: {
            orderId,
            requesterId: requester.id,
            requestedDept,
            pcpEmail: pcpEmail || null,
            pcpName: pcpName || null,
            requestDate: new Date(),
            notes,
        },
    });

    // Update order status to PENDING if it was something else
    await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PENDENTE' },
    });

    revalidatePath(`/orders/${orderId}`);
}

export async function addResponse(formData: FormData) {
    const requestId = formData.get("requestId") as string;
    const orderId = formData.get("orderId") as string;
    const responseText = formData.get("responseText") as string;
    const forecastDateStr = formData.get("forecastDate") as string;

    const forecastDate = forecastDateStr ? new Date(forecastDateStr) : null;

    // Update the request with response
    await prisma.followUpRequest.update({
        where: { id: requestId },
        data: {
            responseDate: new Date(),
            forecastDate,
        },
    });

    // Add a comment with the response details
    const responder = await prisma.user.findFirst({ where: { role: 'PCP' } })
        || await prisma.user.create({ data: { name: 'PCP Padrão', email: 'pcp@demo.com', role: 'PCP' } });

    await prisma.comment.create({
        data: {
            requestId,
            authorId: responder.id,
            content: `Resposta: ${responseText}. ${forecastDate ? `Previsão: ${forecastDate.toLocaleDateString('pt-BR')}` : ''}`,
        },
    });

    // Update order status
    await prisma.order.update({
        where: { id: orderId },
        data: { status: 'RESPONDIDO' },
    });


    revalidatePath(`/orders/${orderId}`);
}

export async function updateOrderStatus(formData: FormData) {
    const orderId = formData.get("orderId") as string;
    const status = formData.get("status") as string;

    const data: any = { status };

    if (status === 'CONCLUIDO') {
        data.invoiced = true;
        data.invoicedDate = new Date();
    } else if (status === 'PENDENTE' || status === 'RESPONDIDO') {
        data.invoiced = false;
        data.invoicedDate = null;
    }

    await prisma.order.update({
        where: { id: orderId },
        data,
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/orders`);
    revalidatePath(`/`);
}

export async function createOrder(formData: FormData) {
    const pvCode = formData.get("pvCode") as string;
    const clientName = formData.get("clientName") as string;
    const salespersonName = formData.get("salesperson") as string;
    const orderDateStr = formData.get("orderDate") as string;

    if (!pvCode || !clientName) return;

    const orderDate = orderDateStr ? new Date(orderDateStr) : new Date();

    const newOrder = await prisma.order.create({
        data: {
            pvCode,
            clientName,
            salesperson: salespersonName || "N/A",
            orderDate,
            status: "PENDENTE",
        },
    });

    redirect(`/orders/${newOrder.id}`);
}

export async function updateDelayedOrders() {
    const now = new Date();

    // Find orders that are NOT invoiced and NOT already marked as ATRASADO
    // but have a forecast date in the past.
    const activeOrders = await prisma.order.findMany({
        where: {
            invoiced: false,
            status: { notIn: ['ATRASADO', 'CONCLUIDO'] }
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

            if (forecast < now) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'ATRASADO' }
                });
                updatedCount++;
            }
        }
    }

    if (updatedCount > 0) {
        revalidatePath("/");
        revalidatePath("/orders");
    }

    return updatedCount;
}

export async function updateOrderDetails(formData: FormData) {
    const orderId = formData.get("orderId") as string;
    const pvCode = formData.get("pvCode") as string;
    const clientName = formData.get("clientName") as string;
    const salesperson = formData.get("salesperson") as string;
    const orderDateStr = formData.get("orderDate") as string;

    const orderDate = orderDateStr ? new Date(orderDateStr) : undefined;

    await prisma.order.update({
        where: { id: orderId },
        data: {
            pvCode,
            clientName,
            salesperson,
            orderDate
        }
    });

    revalidatePath(`/orders/${orderId}`);
    revalidatePath(`/orders`);
}

export async function deleteOrder(formData: FormData) {
    const orderId = formData.get("orderId") as string;

    // Manually delete related records to avoid foreign key constraint errors
    // 1. Find all requests for this order
    const requests = await prisma.followUpRequest.findMany({
        where: { orderId },
        select: { id: true }
    });

    const requestIds = requests.map((r: { id: string }) => r.id);

    // 2. Delete all comments associated with these requests
    if (requestIds.length > 0) {
        await prisma.comment.deleteMany({
            where: { requestId: { in: requestIds } }
        });
    }

    // 3. Delete the requests
    await prisma.followUpRequest.deleteMany({
        where: { orderId }
    });

    // 4. Finally, delete the order
    await prisma.order.delete({
        where: { id: orderId }
    });

    redirect("/orders");
}
