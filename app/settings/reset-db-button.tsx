'use client'

import { resetDatabase } from "@/app/actions/reset-db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function ResetDbButton() {
    const [isLoading, setIsLoading] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [password, setPassword] = useState("")

    async function handleReset() {
        if (!password) {
            toast.error("Digite a senha de acesso")
            return
        }

        setIsLoading(true)
        try {
            const result = await resetDatabase(password)
            if (result.success) {
                toast.success(result.message)
                setConfirming(false)
                setPassword("")
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
            <div className="flex flex-col gap-3 p-4 border rounded-md bg-red-50 border-red-100">
                <span className="text-sm font-medium text-red-800">
                    Digite a senha de acesso para confirmar:
                </span>
                <Input
                    type="password"
                    placeholder="Senha de acesso"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white"
                />
                <div className="flex gap-2">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleReset}
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading ? "Apagando..." : "Confirmar Exclusão"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setConfirming(false)
                            setPassword("")
                        }}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                </div>
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
