import { getSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
    const settings = await getSettings();

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <div className="mb-6">
                <Button asChild variant="ghost" className="gap-2">
                    <Link href="/orders">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Pedidos
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Configurações do Sistema</CardTitle>
                    <CardDescription>
                        Defina as configurações globais para o envio de emails e notificações.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SettingsForm initialSettings={settings} />
                </CardContent>
            </Card>
        </div>
    );
}
