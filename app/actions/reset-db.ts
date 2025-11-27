'use server'

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function resetDatabase() {
    try {
        // Delete in order of dependency
        await prisma.followUpRequest.deleteMany({})
        await prisma.order.deleteMany({})

        revalidatePath('/')
        return { success: true, message: "Banco de dados limpo com sucesso!" }
    } catch (error: any) {
        console.error("Erro ao limpar banco:", error)
        return { success: false, error: "Erro ao limpar banco de dados." }
    }
}
