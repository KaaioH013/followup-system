import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { format, differenceInDays } from "date-fns";
import { ArrowLeft, Calendar, User, MessageSquare, PlusCircle, CheckCircle2, Clock, AlertCircle, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import { createFollowUpRequest, addResponse, updateOrderStatus, updateOrderDetails, deleteOrder } from "@/app/actions";
import { notFound } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const dynamic = 'force-dynamic';

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            requests: {
                orderBy: { requestDate: 'desc' },
                include: {
                    requester: true,
                    comments: {
                        include: { author: true },
                        orderBy: { createdAt: 'asc' }
                    }
                }
            }
        }
    });

    if (!order) {
        notFound();
    }

    // Fetch users for the requester dropdown
    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6 shadow-sm">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/orders">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="font-semibold">Pedido {order.pvCode}</h1>
                <div className="ml-auto flex items-center gap-2">
                    {/* Edit Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Editar Pedido</DialogTitle>
                            </DialogHeader>
                            <form action={updateOrderDetails} className="space-y-4 mt-4">
                                <input type="hidden" name="orderId" value={order.id} />
                                <div className="space-y-2">
                                    <Label htmlFor="pvCode">Código PV</Label>
                                    <Input id="pvCode" name="pvCode" defaultValue={order.pvCode} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="clientName">Cliente</Label>
                                    <Input id="clientName" name="clientName" defaultValue={order.clientName} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="salesperson">Vendedor</Label>
                                    <Input id="salesperson" name="salesperson" defaultValue={order.salesperson} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="orderDate">Data do Pedido</Label>
                                    <Input id="orderDate" name="orderDate" type="date" defaultValue={format(order.orderDate, 'yyyy-MM-dd')} required />
                                </div>
                                <Button type="submit" className="w-full">Salvar Alterações</Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Excluir Pedido</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 text-muted-foreground">
                                Tem certeza que deseja excluir o pedido <strong>{order.pvCode}</strong>? Esta ação não pode ser desfeita e removerá todo o histórico.
                            </div>
                            <form action={deleteOrder}>
                                <input type="hidden" name="orderId" value={order.id} />
                                <Button type="submit" variant="destructive" className="w-full">Confirmar Exclusão</Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <div className="w-px h-6 bg-border mx-2" />

                    <form action={updateOrderStatus} className="flex items-center gap-2">
                        <input type="hidden" name="orderId" value={order.id} />

                        <Select name="status" defaultValue={order.status}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PENDENTE">Pendente</SelectItem>
                                <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button type="submit" variant="outline" size="sm">
                            Atualizar
                        </Button>
                    </form>
                </div>
            </header>

            <main className="flex-1 p-6 md:p-8 grid gap-6 md:grid-cols-3">
                {/* Left Column: Order Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Dados do Pedido</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-muted-foreground">Cliente</Label>
                                <div className="font-medium">{order.clientName}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Vendedor</Label>
                                <div className="font-medium">{order.salesperson}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Data de Emissão</Label>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(order.orderDate, 'dd/MM/yyyy')}</span>
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <Label className="text-muted-foreground">Status Faturamento</Label>
                                <div className="mt-1">
                                    {order.invoiced ? (
                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Faturado</Badge>
                                    ) : (
                                        <Badge variant="outline">Não Faturado</Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {!order.invoiced && order.status !== 'CONCLUIDO' && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="w-full gap-2">
                                    <PlusCircle className="h-4 w-4" />
                                    Nova Cobrança / Solicitação
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nova Solicitação de Follow-up</DialogTitle>
                                </DialogHeader>
                                <form action={createFollowUpRequest} className="space-y-4 mt-4">
                                    <input type="hidden" name="orderId" value={order.id} />
                                    <div className="space-y-2">
                                        <Label htmlFor="requester">Solicitante</Label>
                                        <Select name="requesterId" defaultValue={users.length > 0 ? users[0].id : undefined}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione quem está solicitando" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map((user: any) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.name} ({user.role})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dept">Departamento Solicitado</Label>
                                        <Input id="dept" name="requestedDept" defaultValue="PCP" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="pcpName">Nome do PCP</Label>
                                            <Input id="pcpName" name="pcpName" placeholder="Ex: João Silva" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pcpEmail">Email do PCP</Label>
                                            <Input id="pcpEmail" name="pcpEmail" type="email" placeholder="pcp@empresa.com" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Observação / Cobrança (Opcional)</Label>
                                        <Textarea id="notes" name="notes" placeholder="Descreva a solicitação..." />
                                    </div>
                                    <Button type="submit" className="w-full">Enviar Solicitação</Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Right Column: Timeline */}
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold">Histórico de Follow-up</h2>

                    <ScrollArea className="h-[calc(100vh-200px)] pr-4">
                        <div className="space-y-6">
                            {order.requests.map((req: any) => (
                                <Card key={req.id} className={`relative ${!req.responseDate ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-green-500'}`}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-semibold">{req.requester.name}</span>
                                                <span className="text-muted-foreground text-sm">solicitou ao</span>
                                                <Badge variant="outline">{req.requestedDept}</Badge>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {format(req.requestDate, 'dd/MM/yyyy HH:mm')}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="bg-muted/50 p-3 rounded-md text-sm">
                                            {req.notes || "Sem observações."}
                                        </div>

                                        {/* Comments / Responses */}
                                        {req.comments.length > 0 && (
                                            <div className="pl-4 border-l-2 border-muted space-y-3 mt-4">
                                                {req.comments.map((comment: any) => (
                                                    <div key={comment.id} className="text-sm">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold text-xs">{comment.author.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{format(comment.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                                                        </div>
                                                        <p>{comment.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Response Status */}
                                        {req.responseDate ? (
                                            <div className="flex flex-col gap-2 mt-2">
                                                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Respondido em {format(req.responseDate, 'dd/MM/yyyy')}
                                                </div>

                                                {req.forecastDate && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">Previsão: {format(req.forecastDate, 'dd/MM/yyyy')}</span>
                                                        {new Date(req.forecastDate) < new Date() && !order.invoiced && (
                                                            <Badge variant="destructive" className="ml-2 text-xs">Atrasado</Badge>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Clock className="h-4 w-4" />
                                                    <span>Tempo de resposta: {differenceInDays(new Date(req.responseDate), new Date(req.requestDate))} dias</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 pt-4 border-t">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="gap-2">
                                                            <MessageSquare className="h-4 w-4" />
                                                            Responder / Informar Previsão
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Responder Solicitação</DialogTitle>
                                                        </DialogHeader>
                                                        <form action={addResponse} className="space-y-4 mt-4">
                                                            <input type="hidden" name="requestId" value={req.id} />
                                                            <input type="hidden" name="orderId" value={order.id} />
                                                            <div className="space-y-2">
                                                                <Label htmlFor="response">Resposta</Label>
                                                                <Textarea id="response" name="responseText" placeholder="Digite a resposta..." required />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="forecast">Nova Previsão (Opcional)</Label>
                                                                <Input id="forecast" name="forecastDate" type="date" />
                                                            </div>
                                                            <Button type="submit" className="w-full">Registrar Resposta</Button>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}

                            {order.requests.length === 0 && (
                                <div className="text-center text-muted-foreground py-10">
                                    Nenhuma solicitação registrada para este pedido.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </main>
        </div>
    );
}
