"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Mail } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { recordOverdueFollowUp } from "@/app/actions/record-followup";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface OverdueButtonProps {
    orderId: string;
    pvCode: string;
    clientName: string;
    pcpEmail?: string;
    daysOverdue: number;
}

export function OverdueButton({ orderId, pvCode, clientName, pcpEmail, daysOverdue }: OverdueButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    function downloadEml() {
        const subject = `⚠️ Prazo Vencido - Pedido ${pvCode} - ${clientName}`;
        const to = pcpEmail || "";

        const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
      .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
      .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
      .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
      .info-label { font-weight: bold; min-width: 150px; color: #6b7280; }
      .info-value { color: #111827; }
      .alert { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
      .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0;">⚠️ Prazo Vencido</h1>
      </div>
      <div class="content">
        <p>Olá,</p>
        <p>O prazo de entrega do pedido abaixo venceu e precisamos de uma atualização:</p>
        
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">📋 Pedido:</span>
            <span class="info-value">${pvCode}</span>
          </div>
          <div class="info-row">
            <span class="info-label">👤 Cliente:</span>
            <span class="info-value">${clientName}</span>
          </div>
          <div class="info-row" style="border-bottom: none;">
            <span class="info-label">⏰ Vencido há:</span>
            <span class="info-value" style="color: #dc2626; font-weight: bold;">${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}</span>
          </div>
        </div>

        <div class="alert">
          <strong>Ação Necessária:</strong> Por favor, informe um novo prazo de entrega para este pedido.
        </div>

        <p>Atenciosamente,<br><strong>Equipe Comercial - Helibombas</strong></p>
      </div>
      <div class="footer">
        Sistema de Follow-up Comercial
      </div>
    </div>
  </body>
</html>
`;

        const emlContent = `To: ${to}
Subject: ${subject}
X-Unsent: 1
Content-Type: text/html; charset="utf-8"

${htmlContent}`;

        const blob = new Blob([emlContent], { type: 'message/rfc822' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Cobranca_${pvCode}.eml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function handleSend() {
        setLoading(true);
        try {
            // Apenas registra no banco
            const result = await recordOverdueFollowUp(orderId);

            if (result.success) {
                toast.success("Solicitação registrada! Baixando email...");
                setOpen(false);

                // Baixa o arquivo .eml
                downloadEml();

                router.refresh();
            } else {
                toast.error(result.error || "Erro ao registrar cobrança");
            }
        } catch (error) {
            toast.error("Erro ao registrar cobrança");
        } finally {
            setLoading(false);
        }
    }

    if (!pcpEmail) {
        return (
            <Button variant="outline" size="sm" disabled title="Email do PCP não cadastrado">
                <Mail className="h-3 w-3" />
            </Button>
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Cobrar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cobrar via Outlook (Layout Completo)</DialogTitle>
                    <DialogDescription>
                        Esta ação irá:
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    <div className="flex items-start gap-2">
                        <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                            <p className="font-medium">Baixar arquivo de email (.eml)</p>
                            <p className="text-sm text-muted-foreground">
                                Basta abrir o arquivo baixado e clicar em Enviar no Outlook.
                                O layout será colorido e formatado.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                        <div>
                            <p className="font-medium">Registrar nova solicitação no sistema</p>
                            <p className="text-sm text-muted-foreground">
                                O status do pedido mudará para ATRASADO e ficará registrado no histórico.
                            </p>
                        </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                            Pedido: <span className="font-bold">{pvCode}</span>
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                            Cliente: {clientName}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                            Vencido há: <span className="font-bold">{daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'}</span>
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSend} disabled={loading}>
                        {loading ? "Processando..." : "Confirmar e Baixar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
