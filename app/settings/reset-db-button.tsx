'use client'

import { resetDatabase } from "@/app/actions/reset-db"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function ResetDbButton() {
    const [isLoading, setIsLoading] = useState(false)
    const [confirming, setConfirming] = useState(false)

    async function handleReset() {
        setIsLoading(true)
        try {
            const result = await resetDatabase()
            if (result.success) {
                toast.success(result.message)
                setConfirming(false)
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Erro ao resetar banco")
        } finally {
            setIsLoading(false)
        }
    }

    if (confirming) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-600">Tem certeza?</span>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleReset}
                    disabled={isLoading}
                >
                    {isLoading ? "Apagando..." : "Sim, apagar tudo"}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirming(false)}
                    disabled={isLoading}
                >
                    Cancelar
                </Button>
            </div>
        )
    }

    return (
        <Button variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Resetar Banco de Dados
        </Button>
    )
}
