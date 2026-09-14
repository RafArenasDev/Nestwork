import { Download, File as FileIcon } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { AttachmentData } from '@/types';

function formatSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

/** Visor de imagen a pantalla completa — createPortal a document.body
 *  a propósito: un `position: fixed` normal queda atrapado dentro de
 *  cualquier ancestro con `transform` (la burbuja tiene
 *  `hover:-translate-y-px`), y ya no cubre el viewport completo. */
function ImageLightbox({
    url,
    alt,
    originalName,
    onClose,
}: {
    url: string;
    alt: string;
    originalName: string;
    onClose: () => void;
}) {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <img
                src={url}
                alt={alt}
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            />
            {/* Descargar directo desde el visor — pedido explícito
                ("modal con posibilidad de ampliar, descargar, etc"). */}
            <a
                href={url}
                download={originalName}
                onClick={(event) => event.stopPropagation()}
                className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25"
                aria-label="Descargar imagen"
            >
                <Download className="size-4" />
            </a>
        </div>,
        document.body,
    );
}

export function MessageAttachment({
    attachment,
    fill = false,
}: {
    attachment: AttachmentData;
    /** Burbuja "edge-to-edge" (sólo foto/video, sin caption ni cita) —
     *  la burbuja de afuera ya recorta con overflow-hidden, así que acá
     *  no hace falta ni redondear ni limitar el ancho. */
    fill?: boolean;
}) {
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Botón de descarga SIEMPRE visible encima del media — pedido
    // explícito por seguridad: nada se descarga solo, el usuario
    // confirma cada vez con un click a propósito (nunca automático,
    // así un archivo malicioso adjunto no se guarda sin que se note).
    const downloadOverlay = (
        <a
            href={attachment.url}
            download={attachment.originalName}
            onClick={(event) => event.stopPropagation()}
            className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
            aria-label="Descargar"
        >
            <Download className="size-3.5" />
        </a>
    );

    if (attachment.type === 'image') {
        return (
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className={`block transition-opacity hover:opacity-90 ${fill ? '' : 'overflow-hidden rounded-lg'}`}
                >
                    <img
                        src={attachment.url}
                        alt={attachment.originalName}
                        className={`w-full object-cover ${fill ? 'max-h-[360px]' : 'max-h-[280px] rounded-lg'}`}
                    />
                </button>
                {downloadOverlay}
                {lightboxOpen && (
                    <ImageLightbox
                        url={attachment.url}
                        alt={attachment.originalName}
                        originalName={attachment.originalName}
                        onClose={() => setLightboxOpen(false)}
                    />
                )}
            </div>
        );
    }

    if (attachment.type === 'video') {
        return (
            <div className="relative">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                    src={attachment.url}
                    controls
                    className={`w-full ${fill ? 'max-h-[360px]' : 'max-h-[280px] rounded-lg'}`}
                />
                {downloadOverlay}
            </div>
        );
    }

    if (attachment.type === 'audio') {
        return (
            <div className="flex items-center gap-2">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio
                    src={attachment.url}
                    controls
                    className="min-w-0 flex-1"
                />
                <a
                    href={attachment.url}
                    download={attachment.originalName}
                    className="hover:bg-foreground/10 flex size-8 shrink-0 items-center justify-center rounded-full opacity-70 transition-colors hover:opacity-100"
                    aria-label="Descargar audio"
                >
                    <Download className="size-3.5" />
                </a>
            </div>
        );
    }

    return (
        <a
            href={attachment.url}
            download={attachment.originalName}
            target="_blank"
            rel="noopener noreferrer"
            className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10 flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors"
        >
            <FileIcon className="size-4 shrink-0 opacity-70" />
            <span className="min-w-0 flex-1 truncate">
                {attachment.originalName}
            </span>
            <span className="shrink-0 text-xs opacity-60">
                {formatSize(attachment.sizeBytes)}
            </span>
            <Download className="size-3.5 shrink-0 opacity-60" />
        </a>
    );
}
