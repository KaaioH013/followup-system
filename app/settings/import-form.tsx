'use client'

import { importData } from "@/app/actions/import-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function ImportForm() {
    const [isUploading, setIsUploading] = useState(false)

    async function handleSubmit(formData: FormData) {
        const file = formData.get('file') as File
        if (file && file.size > 4 * 1024 * 1024) {
            toast.error("Arquivo muito grande! O limite da Vercel é 4MB. Por favor, divida o arquivo.")
            return
        }

        setIsUploading(true)
        try {
            const result = await importData(formData)
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.error)
            }
        } catch (error: any) {
            console.error(error)
            toast.error(`Erro ao enviar: ${error.message || "Erro desconhecido"}`)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="file">Arquivo CSV</Label>
                <Input id="file" name="file" type="file" accept=".csv" required />
            </div>
            <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar CSV
                    </>
                )}
            </Button>
        </form>
    )
}
