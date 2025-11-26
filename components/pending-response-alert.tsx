"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { differenceInDays, format } from "date-fns";
import Link from "next/link";

interface PendingRequest {
    id: string;
    requestDate: Date;
    order: {
        id: string;
        pvCode: string;
        clientName: string;
    };
    requester: {
        name: string;
    };
}

export function PendingResponseAlert({ requests }: { requests: PendingRequest[] }) {
    const [open, setOpen] = useState(requests.length > 0);

    if (requests.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-orange-600">
                        <AlertCircle className="h-5 w-5" />
                        Solicitações Pendentes - Cobrar PCP
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            As seguintes solicitações estão aguardando resposta do PCP há mais de 3 dias:
                        </p>

                        {requests.map((req) => {
                            const daysPending = differenceInDays(new Date(), new Date(req.requestDate));

                            return (
                                <Card key={req.id} className="p-4 border-l-4 border-l-orange-500">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/orders/${req.order.id}`}
                                                    className="font-semibold hover:underline"
                                                >
                                                    PV {req.order.pvCode}
                                                </Link>
                                                <Badge variant="destructive">{daysPending} dias</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Cliente: {req.order.clientName}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Solicitado por {req.requester.name} em {format(new Date(req.requestDate), 'dd/MM/yyyy')}
                                            </p>
                                        </div>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/orders/${req.order.id}`}>
                                                Ver Pedido
                                            </Link>
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 pt-2 flex justify-end border-t bg-background">
                    <Button onClick={() => setOpen(false)} variant="outline">
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
