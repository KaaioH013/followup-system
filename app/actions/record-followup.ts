"use server";

import { prisma } from "@/lib/db";
import { differenceInDays } from "date-fns";
import { revalidatePath } from "next/cache";

export async function recordOverdueFollowUp(orderId: string) {
    try {
        // Get order with latest request
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                requests: {
                    orderBy: { requestDate: 'desc' },
                    take: 1
                }
            }
        });

        if (!order) {
            return { success: false, error: "Pedido não encontrado" };
        }

        const lastRequest = order.requests[0];

        if (!lastRequest) {
            return { success: false, error: "Nenhuma solicitação encontrada" };
        }

        if (!lastRequest.forecastDate) {
            return { success: false, error: "Pedido sem previsão de entrega" };
        }

        // Check if actually overdue
        const daysOverdue = differenceInDays(new Date(), new Date(lastRequest.forecastDate));
        if (daysOverdue <= 0) {
            return { success: false, error: "Prazo ainda não venceu" };
        }

        // Resolve PCP info (fallback to global settings if needed)
        let pcpEmail = lastRequest.pcpEmail;
        let pcpName = lastRequest.pcpName;

        if (!pcpEmail) {
            const settings = await prisma.settings.findFirst();
            if (settings?.pcpEmail) {
                pcpEmail = settings.pcpEmail;
                pcpName = settings.pcpName || pcpName;
            }
        }

        // Create new request automatically
        await prisma.followUpRequest.create({
            data: {
                orderId: order.id,
                requesterId: lastRequest.requesterId,
                requestedDept: lastRequest.requestedDept,
                pcpEmail: pcpEmail, // Can be null if not found, that's fine for manual email
                pcpName: pcpName,
                requestDate: new Date(),
                notes: `Cobrança via Outlook - Prazo vencido há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}`
            }
        });

        // Update order status to ATRASADO if not already
        if (order.status !== 'ATRASADO') {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'ATRASADO' }
            });
        }

        revalidatePath('/orders');
        revalidatePath(`/orders/${orderId}`);

        return {
            success: true,
            message: `Solicitação registrada! O Outlook deve abrir em breve.`
        };

    } catch (error: any) {
        console.error('Erro ao registrar cobrança:', error);
        return { success: false, error: error.message || "Erro desconhecido" };
    }
}
