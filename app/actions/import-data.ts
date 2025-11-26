'use server'

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function importData(formData: FormData) {
    try {
        const file = formData.get('file') as File
        if (!file) {
            return { success: false, error: "Nenhum arquivo enviado" }
        }

        const text = await file.text()

        // Parse CSV handling multiline quotes (Reuse logic from restore-data.ts)
        const rawLines = text.split(/\r?\n|\r/)
        const lines: string[] = []
        let currentLine = ''

        for (const rawLine of rawLines) {
            if (currentLine) {
                currentLine += '\n' + rawLine
            } else {
                currentLine = rawLine
            }

            const quotes = (currentLine.match(/"/g) || []).length
            if (quotes % 2 === 0) {
                lines.push(currentLine)
                currentLine = ''
            }
        }

        // Find header
        let headerLineIndex = -1
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('PV') && lines[i].includes('Cliente')) {
                headerLineIndex = i
                break
            }
        }

        if (headerLineIndex === -1) {
            return { success: false, error: "Cabeçalho não encontrado no CSV (Procurando por 'PV' e 'Cliente')" }
        }

        const header = lines[headerLineIndex].split(';')

        // Map indices
        const idx = {
            pv: header.indexOf('PV'),
            cliente: header.indexOf('Cliente'),
            vendedor: header.indexOf('Vend.'),
            solicitante: header.indexOf('Solicitante'),
            solicitado: header.indexOf('Solicitado'),
            dtSol: header.indexOf('Dt. Sol.'),
            dtResp: header.indexOf('Dt. Resp.'),
            dtPed: header.indexOf('Data Ped.'),
            previsao: header.indexOf('Previsão'),
            obs: header.indexOf('Observação'),
            faturado: header.indexOf('Faturado')
        }

        // Ensure default users exist
        let vendedor = await prisma.user.findFirst({ where: { role: 'VENDAS' } })
        if (!vendedor) {
            vendedor = await prisma.user.create({
                data: { name: 'Vendedor Padrão', email: 'vendas@demo.com', role: 'VENDAS' }
            })
        }

        let ordersCount = 0
        let updatedCount = 0

        for (let i = headerLineIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue

            const cols = line.split(';')

            if (!cols[idx.pv] || cols[idx.pv].trim() === '') continue

            const pvCode = cols[idx.pv].trim()
            if (pvCode.includes('/')) continue // Skip invalid PVs

            const clientName = cols[idx.cliente]?.trim() || 'Cliente Desconhecido'
            const salespersonName = cols[idx.vendedor]?.trim() || 'Vendedor Desconhecido'

            const parseDate = (dateStr: string) => {
                if (!dateStr || dateStr.trim() === '') return null
                try {
                    const parts = dateStr.trim().split('/')
                    if (parts.length === 3) {
                        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                    }
                    return null
                } catch (e) {
                    return null
                }
            }

            const orderDate = parseDate(cols[idx.dtPed]) || new Date()
            const requestDate = parseDate(cols[idx.dtSol]) || new Date()
            const responseDate = parseDate(cols[idx.dtResp])
            const forecastDate = parseDate(cols[idx.previsao])

            let notes = cols[idx.obs]?.trim() || ''
            if (notes.startsWith('"') && notes.endsWith('"')) {
                notes = notes.slice(1, -1)
            }

            const faturadoValue = cols[idx.faturado]?.trim()
            const invoiced = faturadoValue?.toLowerCase() === 'sim'
            const invoicedDate = invoiced ? parseDate(cols[idx.faturado + 1]) : null

            let status = 'PENDENTE'
            if (invoiced) status = 'CONCLUIDO'
            else if (forecastDate && forecastDate < new Date()) status = 'ATRASADO'
            else if (responseDate) status = 'RESPONDIDO'

            // Upsert Order
            const existingOrder = await prisma.order.findUnique({ where: { pvCode } })

            if (existingOrder) {
                // Update existing order
                await prisma.order.update({
                    where: { id: existingOrder.id },
                    data: {
                        clientName,
                        salesperson: salespersonName,
                        status,
                        invoiced,
                        invoicedDate
                    }
                })
                updatedCount++
            } else {
                // Create new order
                const newOrder = await prisma.order.create({
                    data: {
                        pvCode,
                        clientName,
                        salesperson: salespersonName,
                        orderDate,
                        status,
                        invoiced,
                        invoicedDate
                    }
                })

                // Create initial request for new order
                await prisma.followUpRequest.create({
                    data: {
                        orderId: newOrder.id,
                        requesterId: vendedor.id,
                        requestedDept: cols[idx.solicitado] || 'PCP',
                        requestDate,
                        responseDate,
                        forecastDate,
                        notes,
                    }
                })
                ordersCount++
            }
        }

        revalidatePath('/orders')
        return {
            success: true,
            message: `Importação concluída! ${ordersCount} novos pedidos, ${updatedCount} atualizados.`
        }

    } catch (error: any) {
        console.error('Erro na importação:', error)
        return { success: false, error: error.message || "Erro desconhecido na importação" }
    }
}
