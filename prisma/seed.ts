import { PrismaClient } from '@prisma/client';
import { addDays, subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpar banco
  await prisma.comment.deleteMany();
  await prisma.followUpRequest.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Banco limpo');

  // Criar usuários
  const vendedor = await prisma.user.create({
    data: {
      name: 'Carlos Vendedor',
      email: 'vendas@demo.com',
      role: 'VENDAS'
    }
  });

  const pcp = await prisma.user.create({
    data: {
      name: 'João PCP',
      email: 'pcp@demo.com',
      role: 'PCP'
    }
  });

  // 1. Pedido Atrasado (Para testar o botão de email)
  const orderAtrasado = await prisma.order.create({
    data: {
      pvCode: 'PV-9901',
      clientName: 'Indústria Metalúrgica ABC',
      salesperson: 'Carlos Vendedor',
      orderDate: subDays(new Date(), 15),
      status: 'ATRASADO',
      requests: {
        create: {
          requesterId: vendedor.id,
          requestedDept: 'PCP',
          pcpName: 'Pedro PCP',
          pcpEmail: 'pedro.pcp@exemplo.com',
          requestDate: subDays(new Date(), 10),
          forecastDate: subDays(new Date(), 2), // Venceu há 2 dias
          notes: 'Cliente cobrando urgência',
          responseDate: subDays(new Date(), 8)
        }
      }
    }
  });

  // 2. Pedido Pendente (Sem resposta)
  await prisma.order.create({
    data: {
      pvCode: 'PV-9902',
      clientName: 'Comércio de Bombas Sul',
      salesperson: 'Carlos Vendedor',
      orderDate: subDays(new Date(), 5),
      status: 'PENDENTE',
      requests: {
        create: {
          requesterId: vendedor.id,
          requestedDept: 'PCP',
          pcpName: 'Maria PCP',
          pcpEmail: 'maria.pcp@exemplo.com',
          requestDate: subDays(new Date(), 1),
          notes: 'Verificar disponibilidade de material'
        }
      }
    }
  });

  // 3. Pedido No Prazo
  await prisma.order.create({
    data: {
      pvCode: 'PV-9903',
      clientName: 'Construtora Horizonte',
      salesperson: 'Carlos Vendedor',
      orderDate: subDays(new Date(), 20),
      status: 'RESPONDIDO',
      requests: {
        create: {
          requesterId: vendedor.id,
          requestedDept: 'PCP',
          pcpName: 'João PCP',
          pcpEmail: 'joao.pcp@exemplo.com',
          requestDate: subDays(new Date(), 18),
          forecastDate: addDays(new Date(), 5), // Vence em 5 dias
          responseDate: subDays(new Date(), 17),
          notes: 'Pedido grande, prioridade normal'
        }
      }
    }
  });

  // 4. Pedido Concluído
  await prisma.order.create({
    data: {
      pvCode: 'PV-9850',
      clientName: 'Agropecuária Feliz',
      salesperson: 'Carlos Vendedor',
      orderDate: subDays(new Date(), 30),
      status: 'CONCLUIDO',
      invoiced: true,
      invoicedDate: subDays(new Date(), 5),
      requests: {
        create: {
          requesterId: vendedor.id,
          requestedDept: 'PCP',
          requestDate: subDays(new Date(), 29),
          forecastDate: subDays(new Date(), 10),
          responseDate: subDays(new Date(), 28),
          notes: 'Entregue no prazo'
        }
      }
    }
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log('📝 Pedido para teste de email: PV-9901');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
