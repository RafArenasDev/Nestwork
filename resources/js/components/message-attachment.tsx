import { Download, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MediaViewer } from '@/components/media-viewer';
import { documentStyleFor } from '@/lib/file-type-style';
import { formatFileSize } from '@/lib/utils';
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

/** Persistir qué fotos/videos ya se revelaron — pedido explícito: "no
 *  es un tap to show, es un [revelar] hacia el chat", no debería pedir
 *  tocar de nuevo cada vez que se reabre la conversación. localStorage
 *  (no cookies/BD): es puramente cosmético por dispositivo, no hace
 *  falta sincronizarlo entre pestañas ni con el servidor. */
const REVEALED_STORAGE_KEY = 'nestwork:revealed-attachments';

function readRevealedIds(): Set<number> {
    try {
        const raw = localStorage.getItem(REVEALED_STORAGE_KEY);

        return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch {
        return new Set();
    }
}

function markRevealed(attachmentId: number): void {
    try {
        const ids = readRevealedIds();
        ids.add(attachmentId);
        localStorage.setItem(
            REVEALED_STORAGE_KEY,
            JSON.stringify(Array.from(ids)),
        );
    } catch {
        // Sin localStorage (privado/bloqueado): simplemente vuelve a
        // pedir "revelar" cada vez — no rompe nada más.
    }
}

export function MessageAttachment({
    attachment,
    fill = false,
    onReact,
    onReply,
    onForward,
    onToggleSave,
    isSaved,
    onTogglePin,
    isPinned,
    onDelete,
    canDeleteEveryone,
}: {
    attachment: AttachmentData;
    /** Burbuja "edge-to-edge" (sólo foto/video, sin caption ni cita) —
     *  la burbuja de afuera ya recorta con overflow-hidden, así que acá
     *  no hace falta ni redondear ni limitar el ancho. */
    fill?: boolean;
    /** Acciones del mensaje — el visor trae las mismas que la burbuja,
     *  salvo "Copiar texto" (no aplica a un adjunto: se reenvía o se
     *  descarga, pedido explícito). */
    onReact: (emoji: string) => void;
    onReply: () => void;
    onForward: () => void;
    onToggleSave: () => void;
    isSaved: boolean;
    onTogglePin: () => void;
    isPinned: boolean;
    onDelete: (scope: 'me' | 'everyone') => void;
    canDeleteEveryone: boolean;
}) {
    const [viewerOpen, setViewerOpen] = useState(false);
    // Patrón WhatsApp, pedido explícito: la media NO se muestra nítida
    // de una — arranca borrosa con un botón de "revelar" encima; recién
    // al tocarlo se ve nítida EN LA BURBUJA y ese botón desaparece. La
    // descarga real al dispositivo queda para el modal/lightbox, ya con
    // la media revelada — son dos pasos distintos, no el mismo botón.
    // Arranca en false SIEMPRE (no leer localStorage acá) — pedido por
    // el propio error real de hidratación: el render del servidor
    // nunca tiene localStorage, así que un initializer que lo lee
    // producía un primer render del cliente distinto al del servidor
    // (mismatch de hidratación de React). El useEffect de abajo
    // corrige el valor real YA EN EL CLIENTE, después del montaje —
    // un solo re-render extra, invisible, en vez de un warning/reset
    // de todo el árbol.
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        if (readRevealedIds().has(attachment.id)) {
            setRevealed(true);
        }
    }, [attachment.id]);

    const reveal = () => {
        setRevealed(true);
        markRevealed(attachment.id);
    };

    const mediaSizeClass = fill ? 'max-h-[360px]' : 'max-h-[280px] rounded-lg';

    // Un solo bloque de props para el visor — antes se repetía
    // idéntico en imagen y video (y ahora también documento), pura
    // duplicación.
    const viewer = viewerOpen && (
        <MediaViewer
            attachment={attachment}
            onClose={() => setViewerOpen(false)}
            onReact={onReact}
            onReply={() => {
                setViewerOpen(false);
                onReply();
            }}
            onForward={() => {
                setViewerOpen(false);
                onForward();
            }}
            onToggleSave={onToggleSave}
            isSaved={isSaved}
            onTogglePin={onTogglePin}
            isPinned={isPinned}
            onDelete={(scope) => {
                setViewerOpen(false);
                onDelete(scope);
            }}
            canDeleteEveryone={canDeleteEveryone}
        />
    );

    if (attachment.type === 'image') {
        return (
            <div className="relative">
                <button
                    type="button"
                    onClick={() => (revealed ? setViewerOpen(true) : reveal())}
                    aria-label={revealed ? 'Ver imagen' : 'Descargar al chat'}
                    className={`block w-full transition-opacity hover:opacity-90 ${fill ? '' : 'overflow-hidden rounded-lg'}`}
                >
                    <img
                        src={attachment.url}
                        alt={attachment.originalName}
                        className={`w-full object-cover transition-[filter] duration-300 ${mediaSizeClass} ${revealed ? '' : 'scale-105 blur-lg'}`}
                    />
                </button>
                {!revealed && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15"
                    >
                        {/* Descargar (no "ojo/mostrar"): esto revela la
                            media DENTRO del chat, no la guarda al
                            dispositivo — esa es una acción distinta,
                            disponible en el visor/opciones. Mismo
                            ícono que Telegram usa para "bajar al
                            caché local", que es conceptualmente lo
                            mismo que pasa acá. */}
                        <span className="flex size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
                            <Download className="size-4" />
                        </span>
                    </div>
                )}
                {viewer}
            </div>
        );
    }

    if (attachment.type === 'video') {
        return (
            <div className="relative">
                <button
                    type="button"
                    onClick={() => (revealed ? setViewerOpen(true) : reveal())}
                    aria-label={revealed ? 'Ver video' : 'Descargar al chat'}
                    className={`relative block w-full ${fill ? '' : 'overflow-hidden rounded-lg'}`}
                >
                    {/* Miniatura estática (sin controls/autoplay): revelar
                        ya no reproduce inline en la burbuja — abre el
                        visor propio, mismo patrón que la imagen. */}
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                        src={attachment.url}
                        muted
                        className={`w-full object-cover transition-[filter] duration-300 ${mediaSizeClass} ${revealed ? '' : 'scale-105 blur-lg'}`}
                    />
                    <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center bg-black/15"
                    >
                        <span className="flex size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
                            {revealed ? (
                                <Play
                                    className="ml-0.5 size-4"
                                    fill="currentColor"
                                />
                            ) : (
                                <Download className="size-4" />
                            )}
                        </span>
                    </span>
                </button>
                {viewer}
            </div>
        );
    }

    if (attachment.type === 'audio') {
        // Reproducir en la burbuja alcanza — sin botón de descarga
        // acá al lado (pedido explícito: esos botones son para
        // previsualizar, no para bajar al dispositivo).
        return <AudioPlayer url={attachment.url} />;
    }

    // Mismo criterio de color/ícono por tipo real de archivo que el
    // chip del composer (documentStyleFor) — un documento se ve igual
    // aparezca donde aparezca, ver feedback_module_visual_standard.
    const { icon: DocIcon, color } = documentStyleFor(attachment.originalName);
    const extension =
        attachment.originalName.split('.').pop()?.toUpperCase() ?? '';

    // Con thumbnailUrl (PDF/Word/Excel/txt ya convertidos por
    // GenerateAttachmentPreview, síncrono al subir el archivo — pedido
    // explícito: "desde la miniatura que se carga, no al rato"): mismo
    // comportamiento que imagen/video — borroso, tocar revela dentro
    // del chat, tocar de nuevo abre el visor con la página real. Sin
    // eso (zip/sql/exe/msi/instaladores — "de resto no tiene sentido",
    // o si la conversión falló): descarga directa al dispositivo, sin
    // paso de revelar ni modal — pedido explícito, "debe descargar
    // directamente".
    if (attachment.thumbnailUrl) {
        return (
            <div className="relative">
                <button
                    type="button"
                    onClick={() => (revealed ? setViewerOpen(true) : reveal())}
                    aria-label={
                        revealed ? 'Ver documento' : 'Descargar al chat'
                    }
                    className={`block w-full transition-opacity hover:opacity-90 ${fill ? '' : 'overflow-hidden rounded-lg'}`}
                >
                    <img
                        src={attachment.thumbnailUrl}
                        alt={attachment.originalName}
                        className={`w-full object-cover object-top transition-[filter] duration-300 ${mediaSizeClass} ${revealed ? '' : 'scale-105 blur-lg'}`}
                    />
                </button>
                {!revealed && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15"
                    >
                        <span className="flex size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md">
                            <Download className="size-4" />
                        </span>
                    </div>
                )}
                {viewer}
            </div>
        );
    }

    return (
        <a
            href={attachment.url}
            download={attachment.originalName}
            target="_blank"
            rel="noopener noreferrer"
            className="border-foreground/10 hover:border-foreground/20 block w-full max-w-[280px] overflow-hidden rounded-2xl border transition-colors"
        >
            <div
                className="flex h-24 items-center justify-center"
                style={{ backgroundColor: `${color}1a` }}
            >
                <DocIcon className="size-9" style={{ color }} />
            </div>
            <div className="bg-foreground/5 flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                        {attachment.originalName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {extension} · {formatFileSize(attachment.sizeBytes)}
                    </p>
                </div>
                <Download className="size-4 shrink-0 opacity-60" />
            </div>
        </a>
    );
}
