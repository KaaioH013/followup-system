import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Iniciando limpeza do banco de dados...')

    try {
        // Delete in order of dependency (Requests depend on Orders)
        const deletedRequests = await prisma.followUpRequest.deleteMany({})
        console.log(`Removidos ${deletedRequests.count} solicitações de follow-up.`)

        const deletedOrders = await prisma.order.deleteMany({})
        console.log(`Removidos ${deletedOrders.count} pedidos.`)

        console.log('Banco de dados limpo com sucesso! (Usuários mantidos)')
    } catch (error) {
        console.error('Erro ao limpar banco:', error)
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
