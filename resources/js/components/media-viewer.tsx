import {
    Bookmark,
    BookmarkCheck,
    Download,
    Expand,
    Forward,
    ListPlus,
    Maximize,
    MoreHorizontal,
    Pause,
    Pin,
    PinOff,
    Play,
    Reply,
    Shrink,
    SmilePlus,
    Trash2,
    Volume2,
    VolumeX,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ReactionPickerButton } from '@/components/reaction-picker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AttachmentData } from '@/types';

type MessageActions = {
    onReact: (emoji: string) => void;
    onReply: () => void;
    onForward: () => void;
    onToggleSave: () => void;
    isSaved: boolean;
    onTogglePin: () => void;
    isPinned: boolean;
    onDelete: (scope: 'me' | 'everyone') => void;
    canDeleteEveryone: boolean;
};

function RailButton({
    icon: Icon,
    label,
    onClick,
    active = false,
}: {
    icon: typeof Reply;
    label: string;
    onClick?: () => void;
    active?: boolean;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    onClick={onClick}
                    className={`flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 ${active ? 'text-[#f5a623]' : ''}`}
                >
                    <Icon
                        className="size-4"
                        fill={active ? 'currentColor' : 'none'}
                    />
                </button>
            </TooltipTrigger>
            <TooltipContent side="left">{label}</TooltipContent>
        </Tooltip>
    );
}

/** Los botones de acción en sí — sin el envoltorio flotante, para
 *  poder reusarlos tanto en el riel vertical (imagen/documento) como
 *  dentro de un popover compacto (video, ver VideoOptionsPopover). */
function ActionButtons({
    originalName,
    url,
    onReact,
    onReply,
    onForward,
    onToggleSave,
    isSaved,
    onTogglePin,
    isPinned,
    onDelete,
    canDeleteEveryone,
    reactionSide = 'left',
}: MessageActions & {
    originalName: string;
    url: string;
    reactionSide?: 'left' | 'top' | 'bottom' | 'right';
}) {
    return (
        <>
            <ReactionPickerButton
                onPick={onReact}
                side={reactionSide}
                trigger={
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label="Reaccionar"
                                className="flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                            >
                                <SmilePlus className="size-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Reaccionar</TooltipContent>
                    </Tooltip>
                }
            />
            <RailButton icon={Reply} label="Responder" onClick={onReply} />
            <RailButton icon={Forward} label="Reenviar" onClick={onForward} />
            <RailButton
                icon={isSaved ? BookmarkCheck : Bookmark}
                label={isSaved ? 'Quitar de guardados' : 'Guardar'}
                onClick={onToggleSave}
                active={isSaved}
            />
            <RailButton
                icon={isPinned ? PinOff : Pin}
                label={isPinned ? 'Desfijar mensaje' : 'Fijar mensaje'}
                onClick={onTogglePin}
                active={isPinned}
            />
            <DropdownMenu>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Más opciones"
                                className="flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                            >
                                <MoreHorizontal className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="left">Más opciones</TooltipContent>
                </Tooltip>
                {/* z-[60]: ver comentario igual en reaction-picker.tsx —
                    mismo riesgo de quedar tapado detrás del scrim
                    (z-[55]) del visor. Sin "Copiar texto": un adjunto se
                    reenvía completo o se descarga, no se copia (pedido
                    explícito). */}
                <DropdownMenuContent
                    side="left"
                    align="start"
                    className="z-[60]"
                >
                    <DropdownMenuItem onClick={() => onDelete('me')}>
                        <Trash2 className="size-4" />
                        Eliminar para mí
                    </DropdownMenuItem>
                    {canDeleteEveryone && (
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete('everyone')}
                        >
                            <Trash2 className="size-4" />
                            Eliminar para todos
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <div className="my-0.5 h-px w-5 bg-white/20" />
            <Tooltip>
                <TooltipTrigger asChild>
                    <a
                        href={url}
                        download={originalName}
                        aria-label="Descargar al dispositivo"
                        className="flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                    >
                        <Download className="size-4" />
                    </a>
                </TooltipTrigger>
                <TooltipContent side="left">
                    Descargar al dispositivo
                </TooltipContent>
            </Tooltip>
        </>
    );
}

/** Riel de acciones del propio mensaje — pedido explícito: "todo lo que
 *  esté en las opciones de las burbujas debe salir en las opciones del
 *  modal", no sólo un botón de descargar. Sólo imagen/documento: en
 *  video queda oculto a propósito (ver VideoOptionsPopover) — "en
 *  video no deben salir, ya que sólo quiero reproducirlo". Mismos
 *  tooltips que el resto de la app, nunca el `title` nativo del
 *  navegador. */
function ActionRail(
    props: MessageActions & {
        originalName: string;
        url: string;
        expanded: boolean;
        onToggleExpanded: () => void;
    },
) {
    return (
        <div
            className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-white/15 p-1.5"
            style={{
                background: 'rgba(30,30,34,0.45)',
                backdropFilter: 'blur(16px) saturate(160%)',
            }}
        >
            <ActionButtons {...props} />
            {/* Expandir vive ACÁ (panel de opciones), no suelto arriba
                del panel — pedido explícito. */}
            <RailButton
                icon={props.expanded ? Shrink : Expand}
                label={
                    props.expanded
                        ? 'Salir de pantalla completa'
                        : 'Pantalla completa'
                }
                onClick={props.onToggleExpanded}
            />
        </div>
    );
}

/** Video: sin riel visible (pedido explícito, "sólo quiero
 *  reproducirlo") — las mismas acciones viven en este popover chico,
 *  disparado desde la propia barra de transporte. */
function VideoOptionsPopover(
    props: MessageActions & { url: string; originalName: string },
) {
    return (
        <Popover>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            aria-label="Opciones del mensaje"
                            className="flex size-7 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                        >
                            <ListPlus className="size-3.5" />
                        </button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Opciones del mensaje</TooltipContent>
            </Tooltip>
            <PopoverContent
                side="top"
                align="end"
                className="z-[60] flex w-fit flex-col gap-1 rounded-2xl border-white/15 bg-[rgba(30,30,34,0.92)] p-1.5"
                style={{ backdropFilter: 'blur(16px) saturate(160%)' }}
            >
                <ActionButtons {...props} reactionSide="top" />
            </PopoverContent>
        </Popover>
    );
}

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) {
        return '0:00';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

/** Barra de transporte propia (no los controles nativos del
 *  navegador) — su propio material, separado del riel de acciones
 *  para no apilar dos superficies translúcidas una sobre otra (apple-
 *  design §12). */
function TransportBar({
    video,
    actions,
    expanded,
    onToggleExpanded,
}: {
    video: HTMLVideoElement | null;
    actions: MessageActions & { url: string; originalName: string };
    expanded: boolean;
    onToggleExpanded: () => void;
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [speedIndex, setSpeedIndex] = useState(1);

    useEffect(() => {
        if (!video) {
            return;
        }

        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onLoadedMetadata = () => setDuration(video.duration);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);

        void video.play();

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, [video]);

    if (!video) {
        return null;
    }

    return (
        <div
            className="absolute right-3 bottom-3 left-3 z-10 flex items-center gap-2.5 rounded-full border border-white/15 px-3 py-2"
            style={{
                background: 'rgba(30,30,34,0.5)',
                backdropFilter: 'blur(16px) saturate(160%)',
            }}
        >
            <button
                type="button"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                onClick={() => (isPlaying ? video.pause() : void video.play())}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
            >
                {isPlaying ? (
                    <Pause className="size-3.5" fill="currentColor" />
                ) : (
                    <Play className="ml-0.5 size-3.5" fill="currentColor" />
                )}
            </button>
            <span className="w-9 shrink-0 text-right text-[11px] text-white tabular-nums">
                {formatTime(currentTime)}
            </span>
            <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(event) => {
                    video.currentTime = Number(event.target.value);
                    setCurrentTime(Number(event.target.value));
                }}
                className="media-scrub h-1 flex-1"
                aria-label="Progreso"
            />
            <span className="w-9 shrink-0 text-[11px] text-white tabular-nums">
                {formatTime(duration)}
            </span>
            <button
                type="button"
                aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                onClick={() => {
                    video.muted = !isMuted;
                    setIsMuted(!isMuted);
                }}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
            >
                {isMuted || volume === 0 ? (
                    <VolumeX className="size-3.5" />
                ) : (
                    <Volume2 className="size-3.5" />
                )}
            </button>
            <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(event) => {
                    const next = Number(event.target.value);
                    video.volume = next;
                    video.muted = next === 0;
                    setVolume(next);
                    setIsMuted(next === 0);
                }}
                className="media-scrub h-1 w-12 shrink-0"
                aria-label="Volumen"
            />
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={() => {
                            const next = (speedIndex + 1) % SPEEDS.length;
                            video.playbackRate = SPEEDS[next];
                            setSpeedIndex(next);
                        }}
                        aria-label="Velocidad de reproducción"
                        className="w-9 shrink-0 rounded-full text-[11px] text-white tabular-nums transition-colors hover:bg-white/15"
                    >
                        {SPEEDS[speedIndex]}×
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    Velocidad de reproducción
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label="Pantalla completa"
                        onClick={() => void video.requestFullscreen?.()}
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                    >
                        <Maximize className="size-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top">Pantalla completa</TooltipContent>
            </Tooltip>
            {/* Expandir EL PANEL del visor (no el fullscreen nativo del
                <video> de arriba, que ya existe aparte) — misma
                paridad que tiene la imagen en su propio riel. */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={onToggleExpanded}
                        aria-label={
                            expanded
                                ? 'Salir de pantalla completa del panel'
                                : 'Expandir panel'
                        }
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                    >
                        {expanded ? (
                            <Shrink className="size-3.5" />
                        ) : (
                            <Expand className="size-3.5" />
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    {expanded ? 'Salir de pantalla completa' : 'Expandir panel'}
                </TooltipContent>
            </Tooltip>
            <div className="mx-0.5 h-4 w-px bg-white/20" />
            {/* Opciones del mensaje — pedido explícito: "en video no
                deben salir [sueltas]... agregas un popover de opciones
                en los controles mejor". */}
            <VideoOptionsPopover {...actions} />
        </div>
    );
}

/** Visor de imagen/video — panel acotado con borde/radio propio
 *  (pedido explícito: "es un modal", no la imagen flotando sola sobre
 *  el scrim), con botón de expandir a pantalla completa aparte del
 *  fullscreen nativo del `<video>`. createPortal a document.body a
 *  propósito: un `position: fixed` normal queda atrapado dentro de
 *  cualquier ancestro con `transform` (la burbuja tiene
 *  `hover:-translate-y-px`), y ya no cubre el viewport completo. */
export function MediaViewer({
    attachment,
    onClose,
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
    onClose: () => void;
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
    const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
    const [expanded, setExpanded] = useState(false);
    // Nunca agranda una imagen chica más allá de su tamaño natural —
    // sólo el zoom manual la agranda a propósito. 1 = tamaño real
    // (o reducido si no entra), tope 3x.
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return createPortal(
        <div
            className={`fixed inset-0 z-[55] flex items-center justify-center bg-black/70 backdrop-blur-sm ${expanded ? '' : 'p-6'}`}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            {/* Panel acotado — pedido explícito: "no del ancho y alto de
                la página... tener un espacio determinado, y manejar
                borders, es un modal". "Expandir" vive en el riel de
                opciones (ver ActionRail), no suelto acá arriba. */}
            <div
                onClick={(event) => event.stopPropagation()}
                className={`animate-media-viewer-in relative flex items-center justify-center overflow-hidden border border-white/15 bg-[#0b0d12] shadow-2xl ${
                    expanded
                        ? 'h-full w-full rounded-none'
                        : 'h-[min(85vh,720px)] w-[min(92vw,1000px)] rounded-2xl'
                }`}
            >
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Cerrar"
                                className="flex size-9 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/15"
                                style={{ background: 'rgba(30,30,34,0.45)' }}
                            >
                                <X className="size-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Cerrar</TooltipContent>
                    </Tooltip>
                </div>

                {attachment.type === 'video' ? (
                    <>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                            ref={setVideoEl}
                            src={attachment.url}
                            className="h-full w-full object-contain"
                        />
                        <TransportBar
                            video={videoEl}
                            expanded={expanded}
                            onToggleExpanded={() =>
                                setExpanded((value) => !value)
                            }
                            actions={{
                                originalName: attachment.originalName,
                                url: attachment.url,
                                onReact,
                                onReply,
                                onForward,
                                onToggleSave,
                                isSaved,
                                onTogglePin,
                                isPinned,
                                onDelete,
                                canDeleteEveryone,
                            }}
                        />
                    </>
                ) : (
                    <>
                        {/* overflow-auto: con zoom > 1 la imagen crece más
                            allá del panel — esto permite recorrerla con
                            scroll/arrastre en vez de recortarla en seco.
                            Sin w-full/h-full en el <img> (a propósito):
                            así una imagen chica se ve a su tamaño real,
                            nunca estirada — sólo el max-h/max-w-full la
                            achica si no entra. */}
                        <div className="flex h-full w-full items-center justify-center overflow-auto">
                            <img
                                // Documento: la imagen real es la preview
                                // de la primera página, no el archivo
                                // original (un <img> no puede renderizar
                                // un .pdf/.docx) — descargar sigue dando
                                // el archivo real (ver ActionRail, usa
                                // attachment.url siempre).
                                src={
                                    attachment.type === 'document'
                                        ? (attachment.thumbnailUrl ??
                                          attachment.url)
                                        : attachment.url
                                }
                                alt={attachment.originalName}
                                style={{
                                    transform: `scale(${zoom})`,
                                }}
                                className="max-h-full max-w-full object-contain transition-transform duration-150 ease-out"
                            />
                        </div>
                        <div
                            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 px-2 py-1.5"
                            style={{
                                background: 'rgba(30,30,34,0.5)',
                                backdropFilter: 'blur(16px) saturate(160%)',
                            }}
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Alejar"
                                        disabled={zoom <= 1}
                                        onClick={() =>
                                            setZoom((value) =>
                                                Math.max(1, value - 0.25),
                                            )
                                        }
                                        className="flex size-7 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-30"
                                    >
                                        <ZoomOut className="size-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    Alejar
                                </TooltipContent>
                            </Tooltip>
                            <span className="w-10 text-center text-[11px] text-white tabular-nums">
                                {Math.round(zoom * 100)}%
                            </span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Acercar"
                                        disabled={zoom >= 3}
                                        onClick={() =>
                                            setZoom((value) =>
                                                Math.min(3, value + 0.25),
                                            )
                                        }
                                        className="flex size-7 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-30"
                                    >
                                        <ZoomIn className="size-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    Acercar
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </>
                )}

                {attachment.type !== 'video' && (
                    <ActionRail
                        originalName={attachment.originalName}
                        url={attachment.url}
                        onReact={onReact}
                        onReply={onReply}
                        onForward={onForward}
                        onToggleSave={onToggleSave}
                        isSaved={isSaved}
                        onTogglePin={onTogglePin}
                        isPinned={isPinned}
                        onDelete={onDelete}
                        canDeleteEveryone={canDeleteEveryone}
                        expanded={expanded}
                        onToggleExpanded={() => setExpanded((value) => !value)}
                    />
                )}
            </div>
        </div>,
        document.body,
    );
}
