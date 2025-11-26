'use server'

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function importData(formData: FormData) {
    try {
        const file = formData.get('file') as File
        if (!file) {
            return { success: false, error: "Nenhum arquivo enviado" }
        }

        const buffer = await file.arrayBuffer()
        const decoder = new TextDecoder('utf-8')
        let text = decoder.decode(buffer)

        // Helper to parse CSV lines handling quotes
        const parseLines = (inputLines: string[]) => {
            const parsed: string[] = []
            let curr = ''
            for (const rawLine of inputLines) {
                if (curr) {
                    curr += '\n' + rawLine
                } else {
                    curr = rawLine
                }
                const quotes = (curr.match(/"/g) || []).length
                if (quotes % 2 === 0) {
                    parsed.push(curr)
                    curr = ''
                }
            }
            return parsed
        }

        let rawLines = text.split(/\r?\n|\r/)
        let lines = parseLines(rawLines)

        // Find header
        const findHeader = (ls: string[]) => {
            for (let i = 0; i < ls.length; i++) {
                if (ls[i].includes('PV') && ls[i].includes('Cliente')) {
                    return i
                }
            }
            return -1
        }

        let headerLineIndex = findHeader(lines)

        // If not found, try ISO-8859-1
        if (headerLineIndex === -1) {
            console.log("Header not found with UTF-8, trying ISO-8859-1")
            const latin1Decoder = new TextDecoder('iso-8859-1')
            text = latin1Decoder.decode(buffer)
            rawLines = text.split(/\r?\n|\r/)
            lines = parseLines(rawLines)
            headerLineIndex = findHeader(lines)
        }

        if (headerLineIndex === -1) {
            const snippet = lines.slice(0, 5).join('\n')
            console.error("CSV Header not found. First 5 lines:", snippet)
            return {
                success: false,
                error: `Cabeçalho não encontrado no CSV (Procurando por 'PV' e 'Cliente'). Verifique se o arquivo está correto. Primeiras linhas lidas: \n${snippet}`
            }
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
