import { Download, Eye, File as FileIcon, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AttachmentData } from '@/types';

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds)) {
        return '0:00';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Reproductor de audio propio — pedido explícito: el `<audio>` nativo
 *  "se ve demasiado simple/feo". Vidrio + barra de progreso propia
 *  (apple-design §12: materiales translúcidos), el `<audio>` real
 *  queda oculto sólo como motor de reproducción. */
function AudioPlayer({ url }: { url: string }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onLoadedMetadata = () => setDuration(audio.duration);
        const onEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        if (isPlaying) {
            audio.pause();
        } else {
            void audio.play();
        }

        setIsPlaying(!isPlaying);
    };

    const seek = (event: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;

        if (!audio || !duration) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;

        audio.currentTime = ratio * duration;
    };

    const progress = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="border-foreground/10 bg-foreground/[0.04] flex w-full items-center gap-2.5 rounded-full border px-2 py-1.5 backdrop-blur-sm">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio ref={audioRef} src={url} className="hidden" />
            <button
                type="button"
                onClick={togglePlay}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white transition-transform duration-100 active:scale-90"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
                {isPlaying ? (
                    <Pause className="size-3.5" fill="currentColor" />
                ) : (
                    <Play className="ml-0.5 size-3.5" fill="currentColor" />
                )}
            </button>
            <div
                onClick={seek}
                className="bg-foreground/15 relative h-1.5 flex-1 cursor-pointer rounded-full"
            >
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#2563eb]"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <span className="text-muted-foreground w-9 shrink-0 text-right text-[11px] tabular-nums">
                {formatDuration(
                    isPlaying || currentTime ? currentTime : duration,
                )}
            </span>
        </div>
    );
}

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
    // Patrón WhatsApp, pedido explícito: la media NO se muestra nítida
    // de una — arranca borrosa con un botón de "revelar" encima; recién
    // al tocarlo se ve nítida EN LA BURBUJA y ese botón desaparece. La
    // descarga real al dispositivo queda para el modal/lightbox, ya con
    // la media revelada — son dos pasos distintos, no el mismo botón.
    const [revealed, setRevealed] = useState(false);

    const mediaSizeClass = fill ? 'max-h-[360px]' : 'max-h-[280px] rounded-lg';

    if (attachment.type === 'image') {
        return (
            <div className="relative">
                <button
                    type="button"
                    onClick={() =>
                        revealed ? setLightboxOpen(true) : setRevealed(true)
                    }
                    className={`block w-full transition-opacity hover:opacity-90 ${fill ? '' : 'overflow-hidden rounded-lg'}`}
                >
                    <img
                        src={attachment.url}
                        alt={attachment.originalName}
                        className={`w-full object-cover transition-[filter] duration-300 ${mediaSizeClass} ${revealed ? '' : 'scale-105 blur-xl'}`}
                    />
                </button>
                {!revealed && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15"
                    >
                        <span className="flex size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
                            <Eye className="size-4" />
                        </span>
                    </div>
                )}
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
                {revealed ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                        src={attachment.url}
                        controls
                        autoPlay
                        className={`w-full ${mediaSizeClass}`}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setRevealed(true)}
                        className={`relative block w-full ${fill ? '' : 'overflow-hidden rounded-lg'}`}
                    >
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                            src={attachment.url}
                            className={`w-full scale-105 object-cover blur-xl ${mediaSizeClass}`}
                        />
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 flex items-center justify-center bg-black/15"
                        >
                            <span className="flex size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
                                <Eye className="size-4" />
                            </span>
                        </span>
                    </button>
                )}
            </div>
        );
    }

    if (attachment.type === 'audio') {
        // Reproducir en la burbuja alcanza — sin botón de descarga
        // acá al lado (pedido explícito: esos botones son para
        // previsualizar, no para bajar al dispositivo).
        return <AudioPlayer url={attachment.url} />;
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
