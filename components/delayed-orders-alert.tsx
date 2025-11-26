"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface DelayedOrder {
    id: string;
    pvCode: string;
    clientName: string;
    salesperson: string;
    requests: {
        forecastDate: Date | null;
    }[];
}

export function DelayedOrdersAlert({ orders }: { orders: DelayedOrder[] }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (orders.length > 0) {
            setOpen(true);
        }
    }, [orders]);

    if (orders.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        Pedidos Atrasados ({orders.length})
                    </DialogTitle>
                    <DialogDescription>
                        Os seguintes pedidos estão com a previsão de entrega vencida e ainda não foram faturados.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const forecast = order.requests[0]?.forecastDate;
                            return (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                                >
                                    <div className="space-y-1">
                                        <div className="font-medium flex items-center gap-2">
                                            <span>PV: {order.pvCode}</span>
                                            <span className="text-muted-foreground text-sm font-normal">
                                                - {order.clientName}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Vendedor: {order.salesperson}
                                        </div>
                                        {forecast && (
                                            <div className="text-sm text-red-600 font-medium">
                                                Previsão: {format(new Date(forecast), "dd/MM/yyyy")}
                                            </div>
                                        )}
                                    </div>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/orders/${order.id}`}>
                                            Ver Detalhes
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 pt-2 flex justify-end border-t bg-background">
                    <Button variant="secondary" onClick={() => setOpen(false)}>
                        Fechar e Resolver Depois
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
