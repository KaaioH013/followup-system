"use client";

import { updateSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useTransition } from "react";

export function SettingsForm({ initialSettings }: { initialSettings: any }) {
    const [isPending, startTransition] = useTransition();

    async function handleSubmit(formData: FormData) {
        startTransition(async () => {
            await updateSettings(formData);
            toast.success("Configurações salvas com sucesso!");
        });
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Contato Padrão do PCP</h3>
                <p className="text-sm text-muted-foreground">
                    Este email será usado automaticamente para cobranças quando não houver um email específico no pedido.
                </p>

                <div className="grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="pcpName">Nome do Responsável</Label>
                        <Input
                            id="pcpName"
                            name="pcpName"
                            placeholder="Ex: João Silva"
                            defaultValue={initialSettings?.pcpName || ""}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pcpEmail">Email para Cobrança</Label>
                        <Input
                            id="pcpEmail"
                            name="pcpEmail"
                            type="email"
                            placeholder="pcp@empresa.com"
                            defaultValue={initialSettings?.pcpEmail || ""}
                        />
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isPending}>
                <Save className="h-4 w-4" />
                {isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
        </form>
    );
}
