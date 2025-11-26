import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DelayedOrdersAlert } from "@/components/delayed-orders-alert";
import { PendingResponseAlert } from "@/components/pending-response-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Clock, FileText, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getStats() {
  const totalOrders = await prisma.order.count();
  const pendingRequests = await prisma.followUpRequest.count({
    where: { responseDate: null },
  });

  const allRequests = await prisma.followUpRequest.findMany({
    select: { requestDate: true, responseDate: true },
  });

  let totalResponseTime = 0;
  const now = new Date();

  allRequests.forEach((req: { requestDate: Date; responseDate: Date | null }) => {
    const endDate = req.responseDate ? new Date(req.responseDate) : now;
    const startDate = new Date(req.requestDate);
    totalResponseTime += differenceInDays(endDate, startDate);
  });

  const avgResponseTime = allRequests.length > 0
    ? (totalResponseTime / allRequests.length).toFixed(1)
    : 0;

  const invoicedOrders = await prisma.order.count({
    where: { invoiced: true }
  });

  // Calculate average lead time (order date to invoiced date or current date)
  const activeOrders = await prisma.order.findMany({
    where: {
      invoiced: false
    },
    select: { orderDate: true }
  });

  const invoicedOrdersWithDates = await prisma.order.findMany({
    where: {
      invoiced: true,
      invoicedDate: { not: null }
    },
    select: { orderDate: true, invoicedDate: true }
  });

  let totalLeadTime = 0;

  // Add time for active (non-invoiced) orders
  activeOrders.forEach((order: { orderDate: Date }) => {
    totalLeadTime += differenceInDays(now, new Date(order.orderDate));
  });

  // Add time for invoiced orders
  invoicedOrdersWithDates.forEach((order: { orderDate: Date; invoicedDate: Date | null }) => {
    if (order.invoicedDate) {
      totalLeadTime += differenceInDays(new Date(order.invoicedDate), new Date(order.orderDate));
    }
  });

  const totalOrdersForLeadTime = activeOrders.length + invoicedOrdersWithDates.length;
  const avgLeadTime = totalOrdersForLeadTime > 0
    ? (totalLeadTime / totalOrdersForLeadTime).toFixed(1)
    : 0;

  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      requests: {
        orderBy: { requestDate: 'asc' }
      }
    },
  });

  return { totalOrders, pendingRequests, avgResponseTime, avgLeadTime, invoicedOrders, recentOrders };
}

import { updateDelayedOrders } from "./actions";

export default async function Dashboard() {
  // Trigger status update for delayed orders
  await updateDelayedOrders();

  const { totalOrders, pendingRequests, avgResponseTime, avgLeadTime, invoicedOrders, recentOrders } = await getStats();

  // Fetch delayed orders for alert
  const delayedOrders = await prisma.order.findMany({
    where: { status: 'ATRASADO' },
    include: {
      requests: {
        orderBy: { requestDate: 'desc' },
        take: 1
      }
    },
    orderBy: { orderDate: 'desc' }
  });

  // Fetch pending requests older than 3 days (exclude invoiced orders)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const oldPendingRequests = await prisma.followUpRequest.findMany({
    where: {
      responseDate: null,
      requestDate: { lt: threeDaysAgo },
      order: {
        invoiced: false
      }
    },
    include: {
      order: {
        select: { id: true, pvCode: true, clientName: true }
      },
      requester: {
        select: { name: true }
      }
    },
    orderBy: { requestDate: 'asc' }
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <DelayedOrdersAlert orders={delayedOrders} />
      <PendingResponseAlert requests={oldPendingRequests} />
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6 shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <FileText className="h-6 w-6" />
          <span>Follow-up PCP</span>
        </div>
        <nav className="flex gap-4 ml-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            Dashboard
          </Link>
          <Link href="/orders" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Pedidos
          </Link>
          <Link href="/settings" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Configurações
          </Link>
        </nav>
      </header>

      <main className="flex-1 p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">Pedidos importados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Aguardando resposta do PCP</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgResponseTime} dias</div>
              <p className="text-xs text-muted-foreground">Média histórica (inclui pendentes)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio de Faturamento</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgLeadTime} dias</div>
              <p className="text-xs text-muted-foreground">Da entrada ao faturamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoicedOrders}</div>
              <p className="text-xs text-muted-foreground">Faturados</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight">Pedidos Recentes</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/orders">
                Ver todos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PV</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Data Pedido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Solicitação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order: any) => {
                  const lastRequest = order.requests[order.requests.length - 1];
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.pvCode}</TableCell>
                      <TableCell>{order.clientName}</TableCell>
                      <TableCell>{order.salesperson}</TableCell>
                      <TableCell>{format(order.orderDate, 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'PENDENTE' ? 'destructive' : order.status === 'RESPONDIDO' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lastRequest ? format(lastRequest.requestDate, 'dd/MM/yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
