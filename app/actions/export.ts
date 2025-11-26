"use server";

import { prisma } from "@/lib/db";
import * as XLSX from 'xlsx';
import { differenceInDays, format } from "date-fns";

export async function exportToExcel() {
    // Fetch all orders with requests
    const orders = await prisma.order.findMany({
        include: {
            requests: {
                orderBy: { requestDate: 'asc' }
            }
        },
        orderBy: { orderDate: 'desc' }
    });

    // Transform data for Excel
    const excelData = orders.map((order: any) => {
        const lastRequest = order.requests[order.requests.length - 1];
        const firstRequest = order.requests[0];

        // Calculate time in system
        const timeInSystem = differenceInDays(new Date(), new Date(order.orderDate));

        // Calculate request time
        let requestTime = '-';
        if (lastRequest) {
            if (lastRequest.responseDate) {
                requestTime = `${differenceInDays(new Date(lastRequest.responseDate), new Date(lastRequest.requestDate))} dias`;
            } else {
                requestTime = `${differenceInDays(new Date(), new Date(lastRequest.requestDate))} dias (pendente)`;
            }
        }

        return {
            'PV': order.pvCode,
            'Cliente': order.clientName,
            'Vendedor': order.salesperson,
            'Data Pedido': format(new Date(order.orderDate), 'dd/MM/yyyy'),
            'Status': order.status,
            'Previsão': lastRequest?.forecastDate ? format(new Date(lastRequest.forecastDate), 'dd/MM/yyyy') : '-',
            'Tempo no Sistema (dias)': timeInSystem,
            'Tempo Solicitação': requestTime,
            'Nº Solicitações': order.requests.length,
            'Faturado': order.invoiced ? 'Sim' : 'Não',
            'Data Faturamento': order.invoicedDate ? format(new Date(order.invoicedDate), 'dd/MM/yyyy') : '-',
            'Primeira Solicitação': firstRequest ? format(new Date(firstRequest.requestDate), 'dd/MM/yyyy') : '-',
            'Última Solicitação': lastRequest ? format(new Date(lastRequest.requestDate), 'dd/MM/yyyy') : '-',
            'Última Observação': lastRequest?.notes || '-'
        };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
        { wch: 10 },  // PV
        { wch: 35 },  // Cliente
        { wch: 15 },  // Vendedor
        { wch: 12 },  // Data Pedido
        { wch: 12 },  // Status
        { wch: 12 },  // Previsão
        { wch: 20 },  // Tempo no Sistema
        { wch: 20 },  // Tempo Solicitação
        { wch: 15 },  // Nº Solicitações
        { wch: 10 },  // Faturado
        { wch: 15 },  // Data Faturamento
        { wch: 18 },  // Primeira Solicitação
        { wch: 18 },  // Última Solicitação
        { wch: 40 },  // Última Observação
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Convert to base64 for download
    return {
        data: Buffer.from(excelBuffer).toString('base64'),
        filename: `pedidos_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`
    };
}
