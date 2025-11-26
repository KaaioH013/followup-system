'use client'

import { importData } from "@/app/actions/import-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function ImportForm() {
    const [isUploading, setIsUploading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsUploading(true)
        try {
            const result = await importData(formData)
            if (result.success) {
                toast.success(result.message)
                // Optional: Reset form
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Erro ao enviar arquivo")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="file">Arquivo CSV</Label>
                <Input id="file" name="file" type="file" accept=".csv" required />
                <p className="text-sm text-muted-foreground">
                    Selecione o arquivo "Follow UP - Solicitações PCP.csv" atualizado.
                </p>
            </div>
            <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                    <>Enviando...</>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar Dados
                    </>
                )}
            </Button>
        </form>
    )
}
