import {
    Database,
    File,
    FileArchive,
    FileSpreadsheet,
    FileText,
    type LucideIcon,
} from 'lucide-react';

/** Ícono + color por tipo real de archivo (extensión) — pedido
 *  explícito: "no en negro o blanco", una miniatura de documento debe
 *  parecerse a lo que ese archivo ES (PDF rojo, Excel verde, etc.),
 *  mismo criterio que usan Drive/Dropbox/Slack para archivos que no se
 *  pueden previsualizar de verdad. */
export function documentStyleFor(filename: string): {
    icon: LucideIcon;
    color: string;
} {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'pdf') {
        return { icon: FileText, color: '#dc2626' };
    }

    if (ext === 'doc' || ext === 'docx') {
        return { icon: FileText, color: '#2563eb' };
    }

    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
        return { icon: FileSpreadsheet, color: '#16a34a' };
    }

    if (ext === 'sql') {
        return { icon: Database, color: '#d97706' };
    }

    if (ext === 'zip' || ext === 'rar' || ext === '7z') {
        return { icon: FileArchive, color: '#ca8a04' };
    }

    if (ext === 'txt') {
        return { icon: FileText, color: '#64748b' };
    }

    return { icon: File, color: '#64748b' };
}
