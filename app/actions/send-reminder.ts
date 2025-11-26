"use server";

import { prisma } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";
import { differenceInDays, format } from "date-fns";
import { revalidatePath } from "next/cache";

export async function sendOverdueReminder(orderId: string) {
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

        let pcpEmail = lastRequest.pcpEmail;
        let pcpName = lastRequest.pcpName;

        if (!pcpEmail) {
            const settings = await prisma.settings.findFirst();
            if (settings?.pcpEmail) {
                pcpEmail = settings.pcpEmail;
                pcpName = settings.pcpName || pcpName;
            }
        }

        if (!pcpEmail) {
            return { success: false, error: "Email do PCP não cadastrado" };
        }

        if (!lastRequest.forecastDate) {
            return { success: false, error: "Pedido sem previsão de entrega" };
        }

        // Check if actually overdue
        const daysOverdue = differenceInDays(new Date(), new Date(lastRequest.forecastDate));
        if (daysOverdue <= 0) {
            return { success: false, error: "Prazo ainda não venceu" };
        }

        // Send email
        const emailResult = await sendReminderEmail({
            to: pcpEmail,
            pcpName: pcpName || "PCP",
            pvCode: order.pvCode,
            clientName: order.clientName,
            forecastDate: format(new Date(lastRequest.forecastDate), 'dd/MM/yyyy'),
            daysOverdue
        });

        if (!emailResult.success) {
            return { success: false, error: `Erro ao enviar email: ${emailResult.error}` };
        }

        // Create new request automatically
        const newRequest = await prisma.followUpRequest.create({
            data: {
                orderId: order.id,
                requesterId: lastRequest.requesterId,
                requestedDept: lastRequest.requestedDept,
                pcpEmail: pcpEmail,
                pcpName: pcpName,
                requestDate: new Date(),
                notes: `Cobrança automática - Prazo vencido há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}`
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
            message: `Email enviado para ${lastRequest.pcpEmail} e nova solicitação criada!`
        };

    } catch (error: any) {
        console.error('Erro ao enviar lembrete:', error);
        let errorMessage = error.message || "Erro desconhecido";

        if (errorMessage.includes("only send testing emails to your own email address")) {
            errorMessage = "Modo de Teste: Você só pode enviar emails para o endereço cadastrado no Resend (seu email). Para enviar para outros, é necessário verificar o domínio.";
        }

        return { success: false, error: errorMessage };
    }
}
