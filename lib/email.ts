import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendReminderEmailParams {
  to: string;
  pcpName: string;
  pvCode: string;
  clientName: string;
  forecastDate: string;
  daysOverdue: number;
}

export async function sendReminderEmail({
  to,
  pcpName,
  pvCode,
  clientName,
  forecastDate,
  daysOverdue
}: SendReminderEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Follow-up Comercial <onboarding@resend.dev>',
      to: [to],
      subject: `⚠️ Prazo Vencido - Pedido ${pvCode} - ${clientName}`,
      html: `
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
                <p>Olá <strong>${pcpName}</strong>,</p>
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
                  <div class="info-row">
                    <span class="info-label">📅 Prazo Original:</span>
                    <span class="info-value">${forecastDate}</span>
                  </div>
                  <div class="info-row" style="border-bottom: none;">
                    <span class="info-label">⏰ Vencido há:</span>
                    <span class="info-value" style="color: #dc2626; font-weight: bold;">${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'}</span>
                  </div>
                </div>

                <div class="alert">
                  <strong>Ação Necessária:</strong> Por favor, informe um novo prazo de entrega para este pedido.
                  <br><br>
                  📧 <strong>Responder para:</strong> Pedro no email <a href="mailto:comercial5@helibombas.com.br">comercial5@helibombas.com.br</a>
                </div>

                <p>Este é um email automático do sistema de Follow-up.</p>
                <p>Atenciosamente,<br><strong>Equipe Comercial - Helibombas</strong></p>
              </div>
              <div class="footer">
                Sistema de Follow-up Comercial<br>
                Não responda diretamente a este email automático.
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Erro ao enviar email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Erro ao enviar email:', error);
    return { success: false, error: error.message };
  }
}
