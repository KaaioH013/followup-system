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

        // Try UTF-8 first
        const decoder = new TextDecoder('utf-8')
        let text = decoder.decode(buffer)

        // Remove BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1)
        }

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
                // Check for Old Format (PV + Cliente)
                if (ls[i].includes('PV') && ls[i].includes('Cliente')) return { index: i, type: 'OLD' }

                // Check for New Format (Número + Cliente + Nro. Nfe.)
                // Note: "Número" might appear as "Numero" or "NÃºmero" if decoding fails, but we handled decoding.
                // We look for "Cliente" and "Vendedor" as anchors.
                if ((ls[i].includes('Número') || ls[i].includes('Numero')) && ls[i].includes('Cliente')) return { index: i, type: 'NEW' }
            }
            return { index: -1, type: 'UNKNOWN' }
        }

        let { index: headerLineIndex, type: formatType } = findHeader(lines)

        // If not found, try ISO-8859-1
        if (headerLineIndex === -1) {
            console.log("Header not found with UTF-8, trying ISO-8859-1")
            const latin1Decoder = new TextDecoder('iso-8859-1')
            text = latin1Decoder.decode(buffer)
            rawLines = text.split(/\r?\n|\r/)
            lines = parseLines(rawLines)
            const res = findHeader(lines)
            headerLineIndex = res.index
            formatType = res.type
        }

        if (headerLineIndex === -1) {
            const snippet = lines.slice(0, 5).join('\n')
            console.error("CSV Header not found. First 5 lines:", snippet)
            return {
                success: false,
                error: `Cabeçalho não encontrado. Verifique se o arquivo tem as colunas 'PV'/'Número' e 'Cliente'.\nPrimeiras linhas:\n${snippet}`
            }
        }

        const header = lines[headerLineIndex].split(';')
        console.log(`Format detected: ${formatType}`)

        // Map indices based on format
        let idx: any = {}

        if (formatType === 'OLD') {
            idx = {
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
        } else {
            // NEW FORMAT
            idx = {
                pv: header.findIndex(h => h.includes('Número') || h.includes('Numero')),
                cliente: header.indexOf('Cliente'),
                vendedor: header.indexOf('Vendedor'), // Appears twice in snippet, indexOf gets first one usually
                dtPed: header.indexOf('Dt. Cadastro'),
                nfe: header.indexOf('Nro. Nfe.'),
                dtNfe: header.indexOf('Dt. Nfe.'),
                dtSaida: header.indexOf('Dt. Saída'), // or Dt. SaÃ­da
                previsao: header.indexOf('Dt. Prev. Fechamento'),
                // Optional fields that might not exist in new format
                solicitado: -1,
                dtSol: -1,
                dtResp: -1,
                obs: -1
            }

            // Fallback for encoding issues in header names
            if (idx.dtSaida === -1) idx.dtSaida = header.findIndex(h => h.includes('Saída') || h.includes('Saida'))
        }

        // Ensure default users exist
        let vendedorDefault = await prisma.user.findFirst({ where: { role: 'VENDAS' } })
        if (!vendedorDefault) {
            vendedorDefault = await prisma.user.create({
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
            if (pvCode.includes('/') || pvCode.length > 20) continue // Skip invalid PVs or weird lines

            const clientName = cols[idx.cliente]?.trim() || 'Cliente Desconhecido'
            const salespersonName = cols[idx.vendedor]?.trim() || 'Vendedor Desconhecido'

            const parseDate = (dateStr: string) => {
                if (!dateStr || dateStr.trim() === '') return null
                try {
                    // Handle "06/10/2025 00:00:00"
                    const cleanDate = dateStr.split(' ')[0]
                    const parts = cleanDate.trim().split('/')
                    if (parts.length === 3) {
                        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
                    }
                    return null
                } catch (e) {
                    return null
                }
            }

            const orderDate = parseDate(cols[idx.dtPed]) || new Date()

            // Invoicing Logic
            let invoiced = false
            let invoicedDate = null

            if (formatType === 'OLD') {
                const faturadoValue = cols[idx.faturado]?.trim()
                invoiced = faturadoValue?.toLowerCase() === 'sim'
                invoicedDate = invoiced ? parseDate(cols[idx.faturado + 1]) : null
            } else {
                // NEW FORMAT: Check Nro Nfe or Dt Saida
                const nfe = cols[idx.nfe]?.trim()
                const dtSaida = cols[idx.dtSaida]?.trim()

                if ((nfe && nfe !== '') || (dtSaida && dtSaida !== '')) {
                    invoiced = true
                    invoicedDate = parseDate(cols[idx.dtNfe]) || parseDate(dtSaida) || new Date()
                }
            }

            const forecastDate = idx.previsao !== -1 ? parseDate(cols[idx.previsao]) : null

            let status = 'PENDENTE'
            if (invoiced) status = 'CONCLUIDO'
            else if (forecastDate && forecastDate < new Date()) status = 'ATRASADO'

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

                // Only create initial request if we have data for it (Old Format) OR just generic one
                if (formatType === 'OLD') {
                    const requestDate = parseDate(cols[idx.dtSol]) || new Date()
                    const responseDate = parseDate(cols[idx.dtResp])
                    let notes = cols[idx.obs]?.trim() || ''
                    if (notes.startsWith('"') && notes.endsWith('"')) notes = notes.slice(1, -1)

                    await prisma.followUpRequest.create({
                        data: {
                            orderId: newOrder.id,
                            requesterId: vendedorDefault.id,
                            requestedDept: cols[idx.solicitado] || 'PCP',
                            requestDate,
                            responseDate,
                            forecastDate,
                            notes,
                        }
                    })
                } else {
                    // New Format: Create a default request if forecast exists
                    if (forecastDate) {
                        await prisma.followUpRequest.create({
                            data: {
                                orderId: newOrder.id,
                                requesterId: vendedorDefault.id,
                                requestedDept: 'PCP',
                                requestDate: orderDate,
                                forecastDate,
                                notes: 'Importado via Planilha Geral',
                            }
                        })
                    }
                }
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
