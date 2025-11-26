"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/app/actions/export";
import { useState } from "react";

export function ExportButton() {
    const [isExporting, setIsExporting] = useState(false);

    async function handleExport() {
        setIsExporting(true);
        try {
            const { data, filename } = await exportToExcel();

            // Convert base64 to blob
            const byteCharacters = atob(data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao exportar:', error);
            alert('Erro ao exportar para Excel');
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <Button
            onClick={handleExport}
            variant="outline"
            className="gap-2"
            disabled={isExporting}
        >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exportando...' : 'Exportar Excel'}
        </Button>
    );
}
