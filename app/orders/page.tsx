import { prisma } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown, ArrowLeft, Search, PlusCircle, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOrder } from "@/app/actions";
import { ExportButton } from "@/components/export-button";
import { OverdueButton } from "@/components/overdue-button";
import { getSettings } from "@/app/actions/settings";

export const dynamic = 'force-dynamic';

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; status?: string; salesperson?: string; sortBy?: string; sortOrder?: string }>;
}) {
    const params = await searchParams;
    const query = params.q || "";
    const status = params.status || "ALL";
    const salesperson = params.salesperson || "ALL";
    const sortBy = params.sortBy || "orderDate";
    const sortOrder = params.sortOrder || "desc";
    const page = Number(params.page) || 1;
    const pageSize = 20;

    const where: any = {};

    if (query) {
        where.OR = [
            { pvCode: { contains: query } },
            { clientName: { contains: query } },
            { salesperson: { contains: query } },
        ];
    }

    if (status !== "ALL") {
        where.status = status;
    }

    if (salesperson !== "ALL") {
        where.salesperson = salesperson;
    }

    const totalCount = await prisma.order.count({ where });
    const totalPages = Math.ceil(totalCount / pageSize);

    // Build orderBy based on sortBy parameter
    let orderBy: any = { orderDate: 'desc' };

    if (sortBy === 'pvCode' || sortBy === 'clientName' || sortBy === 'salesperson' || sortBy === 'orderDate' || sortBy === 'status') {
        orderBy = { [sortBy]: sortOrder };
    }

    let orders = await prisma.order.findMany({
        where,
        take: sortBy === 'timeInSystem' || sortBy === 'requestTime' || sortBy === 'requestCount' ? undefined : pageSize,
        skip: sortBy === 'timeInSystem' || sortBy === 'requestTime' || sortBy === 'requestCount' ? undefined : (page - 1) * pageSize,
        orderBy,
        include: {
            requests: {
                orderBy: { requestDate: 'asc' }
            }
        },
    });

    // Sort by calculated fields if needed
    if (sortBy === 'timeInSystem') {
        orders = orders.sort((a, b) => {
            const timeA = differenceInDays(new Date(), new Date(a.orderDate));
            const timeB = differenceInDays(new Date(), new Date(b.orderDate));
            return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
    } else if (sortBy === 'requestTime') {
        orders = orders.sort((a, b) => {
            const lastRequestA = a.requests[a.requests.length - 1];
            const lastRequestB = b.requests[b.requests.length - 1];

            if (!lastRequestA && !lastRequestB) return 0;
            if (!lastRequestA) return 1;
            if (!lastRequestB) return -1;

            const timeA = lastRequestA.responseDate
                ? differenceInDays(new Date(lastRequestA.responseDate), new Date(lastRequestA.requestDate))
                : differenceInDays(new Date(), new Date(lastRequestA.requestDate));
            const timeB = lastRequestB.responseDate
                ? differenceInDays(new Date(lastRequestB.responseDate), new Date(lastRequestB.requestDate))
                : differenceInDays(new Date(), new Date(lastRequestB.requestDate));

            return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
    } else if (sortBy === 'requestCount') {
        orders = orders.sort((a, b) => {
            return sortOrder === 'asc' ? a.requests.length - b.requests.length : b.requests.length - a.requests.length;
        });
    }

    // Apply pagination for calculated field sorts
    if (sortBy === 'timeInSystem' || sortBy === 'requestTime' || sortBy === 'requestCount') {
        orders = orders.slice((page - 1) * pageSize, page * pageSize);
    }

    // Fetch unique salespeople for filter using groupBy
    const salespeopleGroups = await prisma.order.groupBy({
        by: ['salesperson'],
        orderBy: { salesperson: 'asc' },
    });

    const salespeople = salespeopleGroups.map((g: { salesperson: string }) => g.salesperson);

    async function searchAction(formData: FormData) {
        "use server";
        const q = formData.get("q");
        const s = formData.get("status");
        const sp = formData.get("salesperson");
        redirect(`/orders?q=${q}&status=${s}&salesperson=${sp}`);
    }

    const globalSettings = await getSettings();

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6 shadow-sm">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="font-semibold">Pedidos</h1>
            </header>

            <main className="flex-1 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">Pedidos</h1>
                        <Button asChild variant="ghost" size="icon">
                            <Link href="/settings" title="Configurações">
                                <Settings className="h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <ExportButton />
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <PlusCircle className="h-4 w-4" />
                                    Novo Pedido
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Novo Pedido</DialogTitle>
                                </DialogHeader>
                                <form action={createOrder} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pv">Código PV</Label>
                                        <Input id="pv" name="pvCode" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="client">Cliente</Label>
                                        <Input id="client" name="clientName" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="salesperson">Vendedor</Label>
                                        <Input id="salesperson" name="salesperson" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Data do Pedido</Label>
                                        <Input id="date" name="orderDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                                    </div>
                                    <Button type="submit" className="w-full">Criar Pedido</Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="mb-6">
                    <form action={searchAction} className="flex w-full items-center space-x-2">
                        <Input type="text" name="q" placeholder="Buscar PV, Cliente ou Vendedor..." defaultValue={query} className="max-w-sm" />

                        <Select name="status" defaultValue={status}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Status</SelectItem>
                                <SelectItem value="PENDENTE">Pendentes</SelectItem>
                                <SelectItem value="RESPONDIDO">Respondidos</SelectItem>
                                <SelectItem value="ATRASADO">Atrasados</SelectItem>
                                <SelectItem value="CONCLUIDO">Concluídos</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select name="salesperson" defaultValue={salesperson}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Vendedor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Vendedores</SelectItem>
                                {salespeople.map((sp: string) => (
                                    <SelectItem key={sp} value={sp}>
                                        {sp}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button type="submit">
                            <Search className="h-4 w-4" />
                        </Button>
                    </form>
                </div>

                <div className="rounded-md border bg-white dark:bg-black">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <Link
                                        href={`/orders?q=${query}&status=${status}&salesperson=${salesperson}&sortBy=pvCode&sortOrder=${sortBy === 'pvCode' && sortOrder === 'asc' ? 'desc' : 'asc'}`}
                                        className="flex items-center gap-1 hover:underline"
                                    >
                                        PV
                                        {sortBy === 'pvCode' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                        {sortBy !== 'pvCode' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                    </Link>
                                </TableHead>
                                <TableHead>
                                    <Link
                                        href={`/orders?q=${query}&status=${status}&salesperson=${salesperson}&sortBy=clientName&sortOrder=${sortBy === 'clientName' && sortOrder === 'asc' ? 'desc' : 'asc'}`}
                                        className="flex items-center gap-1 hover:underline"
                                    >
                                        Cliente
                                        {sortBy === 'clientName' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                        {sortBy !== 'clientName' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                    </Link>
                                </TableHead>
                                <TableHead>
                                    <Link
                                        href={`/orders?q=${query}&status=${status}&salesperson=${salesperson}&sortBy=salesperson&sortOrder=${sortBy === 'salesperson' && sortOrder === 'asc' ? 'desc' : 'asc'}`}
                                        className="flex items-center gap-1 hover:underline"
                                    >
                                        Vendedor
                                        {sortBy === 'salesperson' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                        {sortBy !== 'salesperson' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                    </Link>
                                </TableHead>
                                <TableHead>
                                    <Link
                                        href={`/orders?q=${query}&status=${status}&salesperson=${salesperson}&sortBy=orderDate&sortOrder=${sortBy === 'orderDate' && sortOrder === 'asc' ? 'desc' : 'asc'}`}
                                        className="flex items-center gap-1 hover:underline"
                                    >
                                        Data Pedido
                                        {sortBy === 'orderDate' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                        {sortBy !== 'orderDate' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                    </Link>
                                </TableHead>
                                <TableHead>
                                    <Link
                                        href={`/orders?q=${query}&status=${status}&salesperson=${salesperson}&sortBy=status&sortOrder=${sortBy === 'status' && sortOrder === 'asc' ? 'desc' : 'asc'}`}
                                        className="flex items-center gap-1 hover:underline"
                                    >
                                        Status
                                        {sortBy === 'status' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                        {sortBy !== 'status' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                    </Link>
                                </TableHead>
                                <TableHead>Previsão</TableHead>
                                <TableHead>
                                    <Link
                                        href={`/orders?q=${query}&status=${status}&salesperson=${salesperson}&sortBy=timeInSystem&sortOrder=${sortBy === 'timeInSystem' && sortOrder === 'asc' ? 'desc' : 'asc'}`}
                                        className="flex items-center gap-1 hover:underline"
                                    >
                                        Tempo no Sistema
                                        {sortBy === 'timeInSystem' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                        {sortBy !== 'timeInSystem' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                    </Link>
                                </TableHead>
                                <TableHead>
                                    <Link
                                        href={`/orders?q=${query}&status=${status}&salesperson=${salesperson}&sortBy=requestTime&sortOrder=${sortBy === 'requestTime' && sortOrder === 'asc' ? 'desc' : 'asc'}`}
                                        className="flex items-center gap-1 hover:underline"
                                    >
                                        Tempo Solicitação
                                        {sortBy === 'requestTime' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                        {sortBy !== 'requestTime' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                    </Link>
                                </TableHead>
                                <TableHead>
                                    <Link
                                        href={`/orders?q=${query}&status=${status}&salesperson=${salesperson}&sortBy=requestCount&sortOrder=${sortBy === 'requestCount' && sortOrder === 'asc' ? 'desc' : 'asc'}`}
                                        className="flex items-center gap-1 hover:underline"
                                    >
                                        Solicitações
                                        {sortBy === 'requestCount' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                        {sortBy !== 'requestCount' && <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                    </Link>
                                </TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order: any) => {
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
                                            {lastRequest?.forecastDate ? format(lastRequest.forecastDate, 'dd/MM/yyyy') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {differenceInDays(new Date(), new Date(order.orderDate))} dias
                                        </TableCell>
                                        <TableCell>
                                            {lastRequest ? (
                                                lastRequest.responseDate
                                                    ? `${differenceInDays(new Date(lastRequest.responseDate), new Date(lastRequest.requestDate))} dias`
                                                    : `${differenceInDays(new Date(), new Date(lastRequest.requestDate))} dias (pendente)`
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {order.requests.length > 0 ? order.requests.length : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {(() => {
                                                    const lastForecastRequest = [...order.requests].reverse().find((r: any) => r.forecastDate);
                                                    const isOverdue = lastForecastRequest?.forecastDate && differenceInDays(new Date(), new Date(lastForecastRequest.forecastDate)) > 0;
                                                    const isRecentRequest = lastRequest && differenceInDays(new Date(), new Date(lastRequest.requestDate)) < 1;

                                                    if (isOverdue && !isRecentRequest && !order.invoiced && order.status !== 'CONCLUIDO') {
                                                        return (
                                                            <OverdueButton
                                                                orderId={order.id}
                                                                pvCode={order.pvCode}
                                                                clientName={order.clientName}
                                                                pcpEmail={lastRequest?.pcpEmail || globalSettings?.pcpEmail || undefined}
                                                                daysOverdue={differenceInDays(new Date(), new Date(lastForecastRequest.forecastDate))}
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`/orders/${order.id}`}>Detalhes</Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">
                                        Nenhum pedido encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        asChild
                    >
                        <Link href={`/orders?page=${page - 1}&q=${query}&status=${status}&salesperson=${salesperson}&sortBy=${sortBy}&sortOrder=${sortOrder}`}>
                            Anterior
                        </Link>
                    </Button>
                    <div className="text-sm font-medium">
                        Página {page} de {totalPages || 1}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        asChild
                    >
                        <Link href={`/orders?page=${page + 1}&q=${query}&status=${status}&salesperson=${salesperson}&sortBy=${sortBy}&sortOrder=${sortOrder}`}>
                            Próxima
                        </Link>
                    </Button>
                </div>
            </main>
        </div>
    );
}
