import { Head, router, usePage } from '@inertiajs/react';
import { useChannel, useEcho } from '@laravel/echo-react';
import {
    Archive,
    ArchiveRestore,
    ArrowDown,
    Bell,
    BellOff,
    Bold,
    Check,
    CheckCheck,
    ChevronDown,
    CircleAlert,
    Clock,
    Code,
    Forward,
    Italic,
    List,
    MoreHorizontal,
    MoreVertical,
    Phone,
    Quote,
    Reply,
    Search,
    Send,
    Smile,
    Strikethrough,
    Underline,
    UserRound,
    Video,
    X,
} from 'lucide-react';
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import {
    index as messagesIndex,
    read as markReadRoute,
    show as messagesShow,
    store as storeMessage,
} from '@/routes/messages';
import { toggleArchive, toggleMute } from '@/routes/conversations';
import { PresenceDot } from '@/components/presence-dot';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import {
    clearOpenConversationUnseen,
    setOpenConversationUnseen,
} from '@/hooks/use-open-conversation-unseen';
import type { ActiveConversation, MessageData } from '@/types';

type Props = {
    conversation: ActiveConversation | null;
    messages: MessageData[];
};

export default function MessagesIndex({ conversation, messages }: Props) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;

    const closeConversation = () => {
        if (!currentTeam) {
            return;
        }

        // preserveUrl: la dirección del navegador se queda siempre en
        // "/messages" — abrir o cerrar un chat es un cambio de props,
        // nunca una navegación real a "/messages/{id}" (pedido
        // explícito: nada de IDs de conversación visibles en la barra
        // de direcciones).
        router.visit(messagesIndex(currentTeam.slug).url, {
            preserveUrl: true,
            preserveScroll: true,
            only: ['conversation', 'messages'],
        });
    };

    return (
        <>
            <Head title={conversation ? conversation.name : 'Mensajes'} />

            {conversation ? (
                <Thread
                    // Fuerza un remount por conversación distinta — así
                    // la animación de apertura (efecto genio) se repite
                    // cada vez que se abre un chat, no sólo la primera.
                    key={conversation.id}
                    conversation={conversation}
                    messages={messages}
                    onClose={closeConversation}
                />
            ) : (
                <EmptyState />
            )}
        </>
    );
}

function EmptyState() {
    return (
        <div className="text-muted-foreground flex h-full flex-1 items-center justify-center p-8 text-center text-sm">
            Selecciona una conversación de la lista para empezar a chatear.
        </div>
    );
}

/** Grupo consecutivo del mismo remitente sin más de 5 min entre mensajes
 *  y dentro del mismo día — así no se repite avatar/hora en cada burbuja,
 *  igual que Slack/Telegram/iMessage. */
const GROUP_GAP_MS = 5 * 60 * 1000;

function dayKey(iso: string): string {
    const date = new Date(iso);

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameGroup(a: MessageData, b: MessageData): boolean {
    return (
        a.userId === b.userId &&
        dayKey(a.createdAt) === dayKey(b.createdAt) &&
        Math.abs(
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ) <= GROUP_GAP_MS
    );
}

function formatDaySeparator(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dayKey(iso) === dayKey(today.toISOString())) {
        return 'Hoy';
    }

    if (dayKey(iso) === dayKey(yesterday.toISOString())) {
        return 'Ayer';
    }

    return date.toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

type DateGroup = { key: string; messages: MessageData[] };

/** Agrupa mensajes consecutivos del mismo día — insumo del badge de
 *  fecha "desplegable" (sección 17 punto 5 del prompt v2: Hoy/Ayer/días
 *  anteriores como dropdown, no una simple etiqueta). */
function groupMessagesByDate(messages: MessageData[]): DateGroup[] {
    const groups: DateGroup[] = [];

    for (const message of messages) {
        const key = dayKey(message.createdAt);
        const currentGroup = groups[groups.length - 1];

        if (currentGroup && currentGroup.key === key) {
            currentGroup.messages.push(message);
        } else {
            groups.push({ key, messages: [message] });
        }
    }

    return groups;
}

/** Igual que el auto-capitalize de los teclados de Android/iOS: la
 *  primera letra del mensaje siempre en mayúscula, sin importar cómo
 *  se haya escrito. */
function capitalizeFirstLetter(text: string): string {
    return text.length > 0
        ? text[0].toLocaleUpperCase('es') + text.slice(1)
        : text;
}

function formatBubbleTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CO', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

// Markdown ligero (sección 9 del prompt v2): NO usamos una librería de
// Markdown real ni dangerouslySetInnerHTML — el body de un mensaje es
// contenido de OTRO usuario, insertarlo como HTML crudo sería un XSS
// directo. Este tokenizer arma nodos de React a mano (texto siempre
// escapado por React, nunca interpretado como marcado) — negrita,
// cursiva, subrayado, tachado y código en línea. Orden del alternado
// importa: **negrita** y __subrayado__ (dobles) van ANTES que _cursiva_
// (simple) para que el motor de regex no le gane la posición al de
// doble carácter.
const INLINE_FORMAT_RE = /\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`(.+?)`|_(.+?)_/g;

function renderInlineFormatting(text: string, keyPrefix: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let index = 0;
    let match: RegExpExecArray | null;

    INLINE_FORMAT_RE.lastIndex = 0;

    while ((match = INLINE_FORMAT_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        const key = `${keyPrefix}-${index++}`;

        if (match[1] !== undefined) {
            nodes.push(<strong key={key}>{match[1]}</strong>);
        } else if (match[2] !== undefined) {
            nodes.push(<u key={key}>{match[2]}</u>);
        } else if (match[3] !== undefined) {
            nodes.push(<s key={key}>{match[3]}</s>);
        } else if (match[4] !== undefined) {
            nodes.push(
                <code
                    key={key}
                    className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em]"
                >
                    {match[4]}
                </code>,
            );
        } else if (match[5] !== undefined) {
            nodes.push(<em key={key}>{match[5]}</em>);
        }

        lastIndex = INLINE_FORMAT_RE.lastIndex;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}

/** Prefijos de línea (cita "> " y lista "- ") además del formato en
 *  línea de arriba — mismo criterio de seguridad, sin HTML crudo. */
function renderFormattedBody(body: string): ReactNode {
    const lines = body.split('\n');

    return lines.map((line, lineIndex) => {
        const key = `line-${lineIndex}`;

        if (line.startsWith('> ')) {
            return (
                <blockquote
                    key={key}
                    className="my-0.5 border-l-2 border-current/40 pl-2 opacity-90"
                >
                    {renderInlineFormatting(line.slice(2), key)}
                </blockquote>
            );
        }

        if (line.startsWith('- ')) {
            return (
                <div key={key} className="flex gap-1.5">
                    <span aria-hidden="true">•</span>
                    <span>{renderInlineFormatting(line.slice(2), key)}</span>
                </div>
            );
        }

        return (
            <span key={key}>
                {renderInlineFormatting(line, key)}
                {lineIndex < lines.length - 1 && <br />}
            </span>
        );
    });
}

/** Verde=disponible, amarillo=ausente, rojo=ocupado — sin relleno
 *  (sólo el aro) cuando está totalmente desconectado. */
function ConversationHeader({
    conversation,
    currentTeamSlug,
    getInitials,
    onClose,
}: {
    conversation: ActiveConversation;
    currentTeamSlug: string | undefined;
    getInitials: (name: string) => string;
    onClose: () => void;
}) {
    const handleToggleArchive = () => {
        if (!currentTeamSlug) {
            return;
        }

        router.patch(
            toggleArchive([currentTeamSlug, conversation.id]).url,
            {},
            {
                preserveScroll: true,
                // Un chat archivado sale de la lista principal — no
                // tiene sentido quedarse mirándolo, cerramos el modal
                // como al archivar en Gmail/WhatsApp Web. preserveUrl:
                // la barra de direcciones nunca sale de "/messages".
                onSuccess: () =>
                    !conversation.isArchived &&
                    router.visit(messagesIndex(currentTeamSlug).url, {
                        preserveUrl: true,
                        preserveScroll: true,
                        only: ['conversation', 'messages'],
                    }),
            },
        );
    };

    const handleToggleMute = () => {
        if (!currentTeamSlug) {
            return;
        }

        router.patch(
            toggleMute([currentTeamSlug, conversation.id]).url,
            {},
            { preserveScroll: true },
        );
    };

    const statusLabel =
        conversation.type === 'group'
            ? 'Grupo'
            : {
                  available: 'Disponible',
                  away: 'Ausente',
                  busy: 'Ocupado',
                  offline: 'Desconectado',
              }[conversation.presence ?? 'offline'];

    return (
        <div className="border-border/60 sticky top-0 z-10 flex shrink-0 items-center gap-4 border-b bg-[color-mix(in_srgb,var(--background)_90%,var(--foreground)_10%)] py-3 pr-4 pl-3">
            <div className="relative shrink-0">
                <Avatar className="size-10">
                    {conversation.avatar && (
                        <AvatarImage
                            src={conversation.avatar}
                            alt={conversation.name}
                        />
                    )}
                    {/* El título del chat siempre muestra al OTRO
                        participante (o al grupo) — tono "recibido"
                        fijo, nunca el "mío". */}
                    <AvatarFallback className="bg-[var(--avatar-received)] text-[var(--avatar-foreground)]">
                        {getInitials(conversation.name)}
                    </AvatarFallback>
                </Avatar>
                {conversation.presence && (
                    <PresenceDot
                        presence={conversation.presence}
                        surfaceTone="color-mix(in srgb, var(--background) 90%, var(--foreground) 10%)"
                    />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm leading-tight font-semibold">
                    {conversation.name}
                </p>
                <p className="text-muted-foreground truncate text-xs leading-tight">
                    {statusLabel}
                    {conversation.isMuted && ' · Silenciado'}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <DisabledActionIcon
                    icon={Search}
                    label="Buscar en el chat (próximamente)"
                />
                <DisabledActionIcon
                    icon={Phone}
                    label="Llamada de audio (próximamente)"
                />
                <DisabledActionIcon
                    icon={Video}
                    label="Videollamada (próximamente)"
                />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Más opciones"
                        >
                            <MoreVertical className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>
                            <UserRound />
                            Ver perfil
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleToggleMute}>
                            {conversation.isMuted ? <Bell /> : <BellOff />}
                            {conversation.isMuted
                                ? 'Reactivar notificaciones'
                                : 'Silenciar notificaciones'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleToggleArchive}>
                            {conversation.isArchived ? (
                                <ArchiveRestore />
                            ) : (
                                <Archive />
                            )}
                            {conversation.isArchived
                                ? 'Desarchivar conversación'
                                : 'Archivar conversación'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Cerrar chat"
                            onClick={onClose}
                        >
                            <X className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cerrar chat</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}

function DisabledActionIcon({
    icon: Icon,
    label,
}: {
    icon: typeof Search;
    label: string;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span tabIndex={-1}>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        disabled
                        aria-label={label}
                    >
                        <Icon className="size-4" />
                    </Button>
                </span>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

function Thread({
    conversation,
    messages,
    onClose,
}: {
    conversation: ActiveConversation;
    messages: MessageData[];
    onClose: () => void;
}) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const authUser = page.props.auth.user;
    const getInitials = useInitials();
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<MessageData | null>(null);
    const [liveMessages, setLiveMessages] = useState<MessageData[]>(messages);
    // Badges de fecha como dropdown (sección 17.5 del prompt v2): sólo
    // el día MÁS RECIENTE arranca desplegado (es el que se está usando
    // ahora mismo) — el resto del historial empieza colapsado,
    // mostrando sólo los últimos 1-2 mensajes de ese día hasta que se
    // pulse el badge. Lazy initializer: sólo se calcula una vez, con
    // los mensajes iniciales — abrir/cerrar días después es decisión
    // 100% del usuario, no se recalcula solo con cada mensaje nuevo.
    const [expandedDates, setExpandedDates] = useState<Set<string>>(() => {
        const groups = groupMessagesByDate(messages);
        const mostRecentKey = groups[groups.length - 1]?.key;

        return new Set(mostRecentKey ? [mostRecentKey] : []);
    });
    const [typingUserName, setTypingUserName] = useState<string | null>(null);
    const [genieClass, setGenieClass] = useState('genie-panel--opening');
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [unseenCount, setUnseenCount] = useState(0);
    const scrollBottomRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);
    // Distingue el primer render (mensajes ya cargados, no son
    // "nuevos") de una llegada real, para no contar el historial
    // inicial como no-leído.
    const hasMountedRef = useRef(false);
    const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const liveMessagesRef = useRef<MessageData[]>(messages);
    // Último id que ya avisamos al backend como "leído" — evita mandar
    // el mismo PATCH de nuevo en cada scroll mientras se sigue al fondo.
    const lastReadSentRef = useRef<number | null>(null);

    useEffect(() => {
        liveMessagesRef.current = liveMessages;
    }, [liveMessages]);

    // Badge del sidebar junto al nombre del chat SELECCIONADO: usa este
    // mismo número al instante (sin esperar la vuelta al backend) —
    // ver hooks/use-open-conversation-unseen.tsx. Se limpia al cerrar
    // este chat para no dejar un conteo pegado si se reabre otro.
    useEffect(() => {
        setOpenConversationUnseen(conversation.id, unseenCount);
    }, [conversation.id, unseenCount]);

    useEffect(() => {
        return () => clearOpenConversationUnseen(conversation.id);
    }, [conversation.id]);

    // Ping silencioso al backend (PATCH messages.read, NO es una visita
    // Inertia) cuando el usuario efectivamente llega al fondo del chat —
    // dispara MessageRead, que le actualiza en vivo el check de "leído"
    // a quien envió. Luego SÍ pide una recarga parcial de Inertia, pero
    // sólo de `conversations`/`archivedConversations` (el badge del
    // sidebar) — nunca de `messages`, así no se pisa a sí misma.
    const markAsRead = (explicitLastId?: number) => {
        if (!currentTeam) {
            return;
        }

        const lastId =
            explicitLastId ??
            liveMessagesRef.current[liveMessagesRef.current.length - 1]?.id;

        if (!lastId || lastReadSentRef.current === lastId) {
            return;
        }

        lastReadSentRef.current = lastId;

        const csrfToken = document.querySelector<HTMLMetaElement>(
            'meta[name="csrf-token"]',
        )?.content;

        fetch(markReadRoute([currentTeam.slug, conversation.id]).url, {
            method: 'PATCH',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
            },
        })
            .then(() => {
                router.visit(
                    messagesShow([currentTeam.slug, conversation.id]).url,
                    {
                        only: ['conversations', 'archivedConversations'],
                        preserveScroll: true,
                        preserveState: true,
                        preserveUrl: true,
                    },
                );
            })
            .catch(() => {
                // Ping silencioso: si falla, el próximo evento en vivo o
                // la próxima visita real igual va a reconciliar el
                // estado — no hace falta reintentar ni avisar al user.
            });
    };

    // Efecto "genio" de macOS: el panel se "traga" hacia el ícono de
    // Mensajes del rail al cerrar (y emerge desde ahí al abrir) en vez
    // de sólo encogerse parejo. La distancia real se mide contra el DOM
    // porque el ícono vive en otro componente (CurvedNavRail) — no hay
    // otra forma limpia de compartir esa posición sin acoplar ambos
    // componentes.
    const applyGenieOffset = () => {
        const panel = panelRef.current;
        const icon = document.querySelector<HTMLElement>(
            '.curved-rail [aria-label="Mensajes"]',
        );

        if (!panel || !icon) {
            return;
        }

        const panelRect = panel.getBoundingClientRect();
        const iconRect = icon.getBoundingClientRect();
        const originX = panelRect.left + panelRect.width * 0.08;
        const originY = panelRect.bottom;

        panel.style.setProperty(
            '--genie-tx',
            `${iconRect.left + iconRect.width / 2 - originX}px`,
        );
        panel.style.setProperty(
            '--genie-ty',
            `${iconRect.top + iconRect.height / 2 - originY}px`,
        );
    };

    useEffect(() => {
        applyGenieOffset();
        // Al abrir un chat el scroll ya arranca al fondo (ver el
        // useLayoutEffect de liveMessages más abajo), así que esto ya
        // cuenta como "leído" — avisa al backend con el último mensaje
        // que llegó en el prop inicial.
        markAsRead(messages[messages.length - 1]?.id);
        // Sólo al montar (abrir este chat) — dispara la animación de
        // entrada; se limpia sola en onAnimationEnd más abajo.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleClose = () => {
        applyGenieOffset();
        setGenieClass('genie-panel--closing');
    };

    // Los props sólo cambian entre visitas de Inertia (abrir otro chat,
    // enviar el propio mensaje) — al llegar uno nuevo, resincroniza el
    // estado local que además recibe los mensajes en vivo de Echo.
    useEffect(() => {
        setLiveMessages(messages);
    }, [messages]);

    // Detecta si el usuario está viendo el fondo del chat o leyendo
    // historial más arriba — Radix ScrollArea no expone onScroll
    // directo, así que se busca el viewport real que arma por debajo
    // (data-slot="scroll-area-viewport") y se escucha ahí.
    useEffect(() => {
        const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
            '[data-slot="scroll-area-viewport"]',
        );

        if (!viewport) {
            return;
        }

        const handleScroll = () => {
            const distanceFromBottom =
                viewport.scrollHeight -
                viewport.scrollTop -
                viewport.clientHeight;
            const nearBottom = distanceFromBottom < 80;

            isNearBottomRef.current = nearBottom;
            setIsNearBottom(nearBottom);

            // Desplazarse hasta el fondo SÍ cuenta como interacción real
            // (mover la rueda/arrastrar el dedo) — a diferencia de que
            // un mensaje nuevo simplemente auto-scrollee a la vista
            // porque ya estabas ahí, ver el comentario en el
            // useLayoutEffect de abajo.
            if (nearBottom) {
                setUnseenCount(0);
                markAsRead();
            }
        };

        viewport.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => viewport.removeEventListener('scroll', handleScroll);
    }, []);

    // Marcar como leído ya NO depende sólo de estar desplazado al fondo
    // cuando llega un mensaje — pedido explícito: "una cosa es enviado
    // y otra leído en tiempo real", puede estar con el chat abierto y
    // al fondo sin estar realmente mirando la pantalla (hablando con
    // alguien al lado, mirando el celular). Hace falta evidencia real
    // de que el usuario está interactuando con ESTE chat: mousemove,
    // click, touch o tecla, mientras está al fondo. Sólo entonces se
    // marca leído y se borra el badge/contador.
    useEffect(() => {
        const panel = panelRef.current;

        if (!panel) {
            return;
        }

        const handleInteraction = () => {
            if (!isNearBottomRef.current) {
                return;
            }

            setUnseenCount(0);
            markAsRead();
        };

        panel.addEventListener('mousemove', handleInteraction);
        panel.addEventListener('click', handleInteraction);
        panel.addEventListener('keydown', handleInteraction);
        panel.addEventListener('touchstart', handleInteraction, {
            passive: true,
        });

        return () => {
            panel.removeEventListener('mousemove', handleInteraction);
            panel.removeEventListener('click', handleInteraction);
            panel.removeEventListener('keydown', handleInteraction);
            panel.removeEventListener('touchstart', handleInteraction);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // useLayoutEffect (no useEffect): corre antes de que el navegador
    // pinte el frame, así el salto al fondo ya está hecho en el primer
    // frame visible — con useEffect a veces se alcanzaba a ver medio
    // scrolleado antes de saltar. El rAF de respaldo cubre el caso en
    // que ScrollArea (Radix) todavía no terminó de medir su viewport en
    // ese mismo tick (por ejemplo, justo al abrir un chat). Si el
    // usuario está leyendo historial más arriba, no lo interrumpe: en
    // vez de saltar solo, suma al contador del botón flotante — y AUNQUE
    // esté al fondo, un mensaje que sólo auto-scrollea a la vista NO se
    // marca leído solo (ver el useEffect de arriba): sólo suma al
    // contador hasta que haya una interacción real.
    useLayoutEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
        } else if (!liveMessages[liveMessages.length - 1]?.isMine) {
            // Un mensaje propio (lo acabo de enviar yo) nunca cuenta
            // como "no leído" — sólo lo que llega de otros.
            setUnseenCount((count) => count + 1);
        }

        if (!isNearBottomRef.current) {
            return;
        }

        scrollBottomRef.current?.scrollIntoView({ block: 'end' });
        const raf = requestAnimationFrame(() => {
            scrollBottomRef.current?.scrollIntoView({ block: 'end' });
        });

        return () => cancelAnimationFrame(raf);
    }, [liveMessages.length]);

    const { channel } = useChannel(`conversation.${conversation.id}`);

    // El punto inicial importa: MessageSent::broadcastAs() manda el
    // nombre "pelado" (sin namespace App\Events\...) — sin el punto acá,
    // Echo antepone el namespace por defecto al escuchar y el evento
    // nunca hace match (WebSocket conecta y el canal autentica bien,
    // pero el callback jamás se dispara). Mismo ajuste en
    // app-sidebar-layout.tsx.
    useEcho<{ conversationId: number; message: MessageData }>(
        `conversation.${conversation.id}`,
        '.MessageSent',
        (payload) => {
            setTypingUserName(null);
            setLiveMessages((previous) =>
                previous.some((m) => m.id === payload.message.id)
                    ? previous
                    : [
                          ...previous,
                          {
                              ...payload.message,
                              isMine: payload.message.userId === authUser.id,
                          },
                      ],
            );
        },
        [conversation.id],
    );

    // Checks de "leído" en vivo: cuando otro participante llega al fondo
    // del chat (markAsRead → backend dispara MessageRead), acá se
    // actualizan a 'read' los mensajes propios hasta ese id — sin esto,
    // el remitente sólo se enteraba de que le leyeron al recargar. Se
    // ignora el propio readerId: este mismo evento también le llega al
    // que acaba de leer, y sus mensajes propios (en un grupo) no deben
    // marcarse "leídos" por su propia acción de lectura.
    useEcho<{
        conversationId: number;
        readerId: number;
        lastReadMessageId: number | null;
    }>(
        `conversation.${conversation.id}`,
        '.MessageRead',
        (payload) => {
            if (
                payload.readerId === authUser.id ||
                payload.lastReadMessageId === null
            ) {
                return;
            }

            setLiveMessages((previous) =>
                previous.map((message) =>
                    message.isMine && message.id <= payload.lastReadMessageId!
                        ? { ...message, status: 'read' }
                        : message,
                ),
            );
        },
        [conversation.id, authUser.id],
    );

    // Indicador de "escribiendo…": whisper de Echo (no toca el backend,
    // no persiste nada) entre los participantes del mismo canal privado.
    useEffect(() => {
        const echoChannel = channel();

        if (!echoChannel) {
            return;
        }

        const handleWhisper = (data: { userName: string }) => {
            setTypingUserName(data.userName);

            if (typingClearRef.current) {
                clearTimeout(typingClearRef.current);
            }

            typingClearRef.current = setTimeout(
                () => setTypingUserName(null),
                3000,
            );
        };

        echoChannel.listenForWhisper('typing', handleWhisper);

        return () => {
            echoChannel.stopListeningForWhisper('typing', handleWhisper);
        };
    }, [channel]);

    const notifyTyping = () => {
        // Throttle: un whisper cada 2s como mucho, no uno por tecla.
        if (typingThrottleRef.current) {
            return;
        }

        channel()?.whisper('typing', { userName: authUser.name });
        typingThrottleRef.current = setTimeout(() => {
            typingThrottleRef.current = null;
        }, 2000);
    };

    const handleReply = (message: MessageData) => {
        setReplyingTo(message);
        textareaRef.current?.focus();
    };

    const toggleDateExpanded = (key: string) => {
        setExpandedDates((previous) => {
            const next = new Set(previous);

            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }

            return next;
        });
    };

    // Barra de formato (sección 9 del prompt v2): envuelve la selección
    // actual del textarea con el delimitador de Markdown ligero — si no
    // hay selección, inserta el par de delimitadores con el cursor en
    // el medio, igual que cualquier editor tipo WYSIWYG-lite. `__` para
    // subrayado (no estándar en Markdown real, pero el propio prompt
    // dice "Markdown ligero" — CommonMark no tiene subrayado nativo).
    const wrapSelection = (before: string, after: string = before) => {
        const textarea = textareaRef.current;

        if (!textarea) {
            return;
        }

        const { selectionStart, selectionEnd, value } = textarea;
        const selected = value.slice(selectionStart, selectionEnd);
        const next =
            value.slice(0, selectionStart) +
            before +
            selected +
            after +
            value.slice(selectionEnd);

        setBody(next);

        requestAnimationFrame(() => {
            textarea.focus();
            const cursor = selectionStart + before.length;
            textarea.setSelectionRange(cursor, cursor + selected.length);
        });
    };

    // Prefijo de línea (cita/lista): se aplica a la línea donde está el
    // cursor, no envuelve una selección — quitar el prefijo si ya está
    // (toggle), igual criterio que negrita/cursiva pero para bloques.
    const toggleLinePrefix = (prefix: string) => {
        const textarea = textareaRef.current;

        if (!textarea) {
            return;
        }

        const { selectionStart, value } = textarea;
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const lineEndIndex = value.indexOf('\n', selectionStart);
        const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
        const line = value.slice(lineStart, lineEnd);
        const hasPrefix = line.startsWith(prefix);
        const newLine = hasPrefix ? line.slice(prefix.length) : prefix + line;
        const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
        const delta = newLine.length - line.length;

        setBody(next);

        requestAnimationFrame(() => {
            textarea.focus();
            const cursor = selectionStart + delta;
            textarea.setSelectionRange(cursor, cursor);
        });
    };

    const handleSend = () => {
        const trimmed = capitalizeFirstLetter(body.trim());

        if (!trimmed || !currentTeam || sending) {
            return;
        }

        setSending(true);

        // Optimista: antes, mi propio mensaje sólo aparecía tras el
        // viaje completo de ida y vuelta (POST -> redirect -> GET de
        // messages.show), mientras que al OTRO participante le llegaba
        // casi al instante por el broadcast de Reverb — se veía primero
        // en su chat que en el mío. Un id negativo temporal (nunca
        // choca con los ids reales de la BD, todos positivos) para
        // poder identificarlo si hiciera falta; el efecto que
        // sincroniza liveMessages con el prop `messages` ya lo
        // reemplaza solo por el mensaje real en cuanto la respuesta del
        // POST trae la lista fresca — no hace falta reconciliar a mano.
        const replyTo = replyingTo;
        const optimisticMessage: MessageData = {
            id: -Date.now(),
            body: trimmed,
            createdAt: new Date().toISOString(),
            editedAt: null,
            userId: authUser.id,
            userName: authUser.name,
            userAvatar: authUser.avatar ?? null,
            isMine: true,
            replyToId: replyTo?.id ?? null,
            replyToUserName: replyTo
                ? replyTo.isMine
                    ? authUser.name
                    : replyTo.userName
                : null,
            replyToBody: replyTo?.body ?? null,
            status: 'sending',
        };

        setLiveMessages((previous) => [...previous, optimisticMessage]);
        setBody('');
        setReplyingTo(null);

        router.post(
            storeMessage([currentTeam.slug, conversation.id]).url,
            { body: trimmed, reply_to_message_id: replyTo?.id ?? null },
            {
                preserveScroll: true,
                preserveUrl: true,
                onError: () => {
                    setLiveMessages((previous) =>
                        previous.map((existing) =>
                            existing.id === optimisticMessage.id
                                ? { ...existing, status: 'failed' }
                                : existing,
                        ),
                    );
                },
                onFinish: () => setSending(false),
            },
        );
    };

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col p-3">
            {/* Toda la ventana de chat es UNA sola card (header + mensajes +
                composer), con un tono apenas más gris que el área de
                contenido de atrás. Shadow SIN offset (0 0, no "X_Y") —
                así se reparte pareja en los 4 lados (relieve), no solo
                abajo. Blur máx. ~10px, todavía bien por debajo de los
                12px de "colchón" del p-3 de afuera, para que nunca
                llegue cerca del sidebar y dañe la gotera. Sin ring, sin
                border: solo shadow + tono + radio. */}
            <div
                ref={panelRef}
                onAnimationEnd={() => {
                    if (genieClass === 'genie-panel--closing') {
                        onClose();

                        return;
                    }

                    setGenieClass('');
                }}
                className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--background)_84%,var(--foreground)_16%)] shadow-[0_0_2px_rgba(0,0,0,0.25),0_0_10px_rgba(0,0,0,0.35)] dark:shadow-[0_0_2px_rgba(0,0,0,0.7),0_0_10px_rgba(0,0,0,0.8)] ${genieClass}`}
            >
                <ConversationHeader
                    conversation={conversation}
                    currentTeamSlug={currentTeam?.slug}
                    getInitials={getInitials}
                    onClose={handleClose}
                />

                <div
                    ref={scrollAreaRef}
                    className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                    <ScrollArea className="h-full flex-1 px-4">
                        <div
                            // pb-10 (no pb-8): el avatar del último mensaje
                            // vive translate-y-3 (12px) MÁS abajo que el
                            // borde inferior de la burbuja — el aire de
                            // acá tiene que sobrar respecto al avatar, no
                            // sólo respecto a la burbuja, o queda cortado
                            // justo al enviar (el mensaje nuevo entra con
                            // su avatar ya desplazado).
                            className="flex w-full min-w-0 flex-col gap-0.5 py-4 pb-10"
                        >
                            {groupMessagesByDate(liveMessages).map((group) => {
                                const isExpanded = expandedDates.has(group.key);
                                // Colapsado: sólo los últimos 1-2 de ese
                                // día — el badge es un dropdown, no una
                                // simple etiqueta (pedido explícito,
                                // sección 17.5). El día más reciente
                                // arranca desplegado (ver el
                                // useState de expandedDates).
                                const visibleMessages = isExpanded
                                    ? group.messages
                                    : group.messages.slice(-2);
                                const hiddenCount =
                                    group.messages.length -
                                    visibleMessages.length;

                                return (
                                    <div key={group.key} className="min-w-0">
                                        <div className="my-3 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleDateExpanded(
                                                        group.key,
                                                    )
                                                }
                                                className="bg-foreground/5 text-muted-foreground hover:bg-foreground/10 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                                            >
                                                {formatDaySeparator(
                                                    group.messages[0].createdAt,
                                                )}
                                                {!isExpanded &&
                                                    hiddenCount > 0 && (
                                                        <span className="opacity-70">
                                                            · {hiddenCount} más
                                                        </span>
                                                    )}
                                                <ChevronDown
                                                    className={`size-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </button>
                                        </div>
                                        {visibleMessages.map(
                                            (message, index) => {
                                                const previous =
                                                    visibleMessages[index - 1];
                                                const next =
                                                    visibleMessages[index + 1];
                                                const isFirstInGroup =
                                                    !previous ||
                                                    !isSameGroup(
                                                        previous,
                                                        message,
                                                    );
                                                const isLastInGroup =
                                                    !next ||
                                                    !isSameGroup(message, next);

                                                return (
                                                    <div
                                                        key={message.id}
                                                        className="min-w-0"
                                                    >
                                                        <MessageBubble
                                                            message={message}
                                                            getInitials={
                                                                getInitials
                                                            }
                                                            authUserName={
                                                                authUser.name
                                                            }
                                                            isFirstInGroup={
                                                                isFirstInGroup
                                                            }
                                                            isLastInGroup={
                                                                isLastInGroup
                                                            }
                                                            onReply={
                                                                handleReply
                                                            }
                                                        />
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={scrollBottomRef} />
                        </div>
                    </ScrollArea>
                    {!isNearBottom && (
                        <button
                            type="button"
                            onClick={() => {
                                scrollBottomRef.current?.scrollIntoView({
                                    block: 'end',
                                    behavior: 'smooth',
                                });
                                setUnseenCount(0);
                                markAsRead();
                            }}
                            className="btn-elevated absolute bottom-10 left-1/2 z-10 inline-flex w-fit -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--sidebar)] px-4 py-2 text-xs font-medium text-nowrap text-[var(--sidebar-foreground)]"
                        >
                            <ArrowDown className="size-3.5" />
                            {unseenCount > 0
                                ? `${unseenCount} mensaje${unseenCount === 1 ? '' : 's'} nuevo${unseenCount === 1 ? '' : 's'} sin leer`
                                : 'Ir al final'}
                        </button>
                    )}
                    {typingUserName && (
                        <p className="text-muted-foreground px-4 pb-1 text-xs italic">
                            {typingUserName} está escribiendo…
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2 border-t p-3">
                    {replyingTo && (
                        // rounded-3xl + gris fijo (bg-[#71717a], no
                        // bg-foreground/5): mismo fondo y texto blanco
                        // que el badge de previsualización dentro de la
                        // burbuja — ese ya probó tener buen contraste en
                        // los dos temas; bg-foreground/5 (relativo al
                        // tema) hacía que el azul oscuro del borde/texto
                        // casi no se leyera en tema oscuro (fondo oscuro
                        // sobre fondo oscuro). Mismo acento que el badge
                        // de la burbuja: "respondo algo mío" = naranja,
                        // "respondo a otro" = azul oscuro.
                        <div
                            className={`flex items-start gap-2 rounded-3xl border-l-[5px] bg-[#71717a] py-2 pr-2 pl-3.5 ${replyingTo.isMine ? 'border-l-[#c2410c]' : 'border-l-[#1e3a8a]'}`}
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-white">
                                    Respondiendo a{' '}
                                    {replyingTo.isMine
                                        ? 'ti mismo'
                                        : replyingTo.userName}
                                </p>
                                <p className="truncate text-xs text-white/70">
                                    {replyingTo.body}
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-6 shrink-0"
                                aria-label="Cancelar respuesta"
                                onClick={() => setReplyingTo(null)}
                            >
                                <X className="size-3.5" />
                            </Button>
                        </div>
                    )}
                    {/* Barra de formato (sección 9 del prompt v2): fija
                        arriba del campo (no un popover al seleccionar
                        texto — más simple y descubrible). Markdown
                        ligero guardado tal cual en messages.body,
                        traducido a estilos reales al renderizar la
                        burbuja (ver renderFormattedBody). */}
                    <div className="text-muted-foreground flex items-center gap-0.5">
                        <FormatButton
                            icon={Bold}
                            label="Negrita"
                            onClick={() => wrapSelection('**')}
                        />
                        <FormatButton
                            icon={Italic}
                            label="Cursiva"
                            onClick={() => wrapSelection('_')}
                        />
                        <FormatButton
                            icon={Underline}
                            label="Subrayado"
                            onClick={() => wrapSelection('__')}
                        />
                        <FormatButton
                            icon={Strikethrough}
                            label="Tachado"
                            onClick={() => wrapSelection('~~')}
                        />
                        <FormatButton
                            icon={Code}
                            label="Código en línea"
                            onClick={() => wrapSelection('`')}
                        />
                        <FormatButton
                            icon={Quote}
                            label="Cita en bloque"
                            onClick={() => toggleLinePrefix('> ')}
                        />
                        <FormatButton
                            icon={List}
                            label="Lista"
                            onClick={() => toggleLinePrefix('- ')}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <Textarea
                            ref={textareaRef}
                            value={body}
                            onChange={(event) => {
                                // Mayúscula inicial en vivo, no sólo al
                                // enviar — reemplaza un único carácter,
                                // así que el cursor nunca salta de lugar.
                                setBody(
                                    capitalizeFirstLetter(event.target.value),
                                );
                                notifyTyping();
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    handleSend();
                                }
                                if (event.key === 'Escape' && replyingTo) {
                                    setReplyingTo(null);
                                }
                                // Atajos tipo cualquier editor: Ctrl/Cmd
                                // + B/I/U/Shift+X.
                                const modifier = event.ctrlKey || event.metaKey;
                                if (
                                    modifier &&
                                    event.key.toLowerCase() === 'b'
                                ) {
                                    event.preventDefault();
                                    wrapSelection('**');
                                }
                                if (
                                    modifier &&
                                    event.key.toLowerCase() === 'i'
                                ) {
                                    event.preventDefault();
                                    wrapSelection('_');
                                }
                                if (
                                    modifier &&
                                    event.key.toLowerCase() === 'u'
                                ) {
                                    event.preventDefault();
                                    wrapSelection('__');
                                }
                            }}
                            placeholder={`Escribe un mensaje a ${conversation.name}…`}
                            // Teclados móviles (Android/iOS): mayúscula
                            // automática al empezar a escribir, mismo
                            // comportamiento nativo esperado — el respaldo
                            // real para teclado físico/desktop es
                            // capitalizeFirstLetter() en handleSend.
                            autoCapitalize="sentences"
                            className="max-h-40 min-h-11 flex-1 resize-none rounded-3xl px-4 py-2.5"
                            rows={1}
                        />
                        <Button
                            type="button"
                            size="icon"
                            className="btn-elevated size-11 shrink-0 rounded-full"
                            disabled={sending || body.trim() === ''}
                            onClick={handleSend}
                        >
                            <Send className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MessageStatus({ message }: { message: MessageData }) {
    if (!message.isMine) {
        return null;
    }

    if (message.status === 'failed') {
        return (
            <span className="text-destructive flex items-center gap-1 text-[10px] font-medium">
                <CircleAlert className="size-3" />
                No se pudo enviar
            </span>
        );
    }

    return (
        <span className="flex items-center gap-0.5">
            {message.status === 'sending' && <Clock className="size-3" />}
            {message.status === 'read' && (
                <CheckCheck
                    className="text-sky-600 dark:text-sky-300"
                    size={13}
                />
            )}
            {message.status === 'sent' && <Check size={13} />}
        </span>
    );
}

function BubbleActionButton({
    icon: Icon,
    label,
    onClick,
    disabled,
}: {
    icon: typeof Reply;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    disabled={disabled}
                    onClick={onClick}
                    className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground flex size-6 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40"
                >
                    <Icon className="size-3.5" />
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

/** Botón de la barra de formato del composer — mismo lenguaje visual
 *  que BubbleActionButton (ícono + tooltip), pero un poco más grande:
 *  esta barra siempre está visible (no aparece sólo al hover), así que
 *  necesita ser un blanco de clic cómodo por sí sola. */
function FormatButton({
    icon: Icon,
    label,
    onClick,
}: {
    icon: typeof Bold;
    label: string;
    onClick: () => void;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    // onMouseDown (no onClick) + preventDefault: si
                    // fuera onClick, el textarea pierde el foco (y la
                    // selección de texto) ANTES de que este handler
                    // corra — wrapSelection ya no tendría selección
                    // sobre la que envolver el markdown.
                    onMouseDown={(event) => {
                        event.preventDefault();
                        onClick();
                    }}
                    className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground flex size-7 items-center justify-center rounded-full transition-colors"
                >
                    <Icon className="size-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

function MessageBubble({
    message,
    getInitials,
    authUserName,
    isFirstInGroup,
    isLastInGroup,
    onReply,
}: {
    message: MessageData;
    getInitials: (name: string) => string;
    authUserName: string;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    onReply: (message: MessageData) => void;
}) {
    const failed = message.status === 'failed';
    // Tono del acento del badge de respuesta según A QUIÉN se está
    // citando, no según quién envía este mensaje — pedido explícito:
    // distinguir "respondo a otro" / "respondo algo mío" / "él me
    // responde" con colores bien distintos y FIJOS (hex, no tokens de
    // tema ni shades pastel de Tailwind) — oscuros a propósito para que
    // se vean en los dos temas, mismo criterio que el badge rojo de
    // no-leídos (oklch fijo).
    const replyToIsMine =
        message.replyToId !== null && message.replyToUserName === authUserName;
    const replyAccentColor = !message.replyToId
        ? ''
        : message.isMine
          ? replyToIsMine
              ? 'border-l-[#c2410c]' // respondo algo mío: naranja oscuro
              : 'border-l-[#1e3a8a]' // respondo a otro: azul oscuro
          : replyToIsMine
            ? 'border-l-[#166534]' // él me responde a mí: verde oscuro
            : 'border-l-[#b91c1c]'; // él responde a un tercero (grupo): rojo, más visible que el gris de antes

    const bubbleColor = failed
        ? 'bg-destructive/15'
        : message.isMine
          ? 'bg-[var(--bubble-sent)]'
          : 'bg-[var(--bubble-received)]';

    // mt-2.5 (no mt-px): ahora CADA mensaje muestra su hora debajo, así
    // que ese "pegado" de antes (pensado para cuando sólo el último de
    // la racha tenía pie) quedaba muy poco aire entre la hora de un
    // mensaje y la burbuja del siguiente. Si ESTE mensaje tiene badge de
    // respuesta (que sobresale por encima de su propia burbuja), el
    // margen tiene que darle aire AL BADGE (que es lo que queda más
    // arriba), no a la burbuja — mismo espaciado que la hora con
    // cualquier burbuja normal (~8-10px), no el doble. mt-6 medido con
    // getBoundingClientRect da esos ~8px reales hasta el badge (el
    // resto —hasta la burbuja— es el solape a propósito del badge
    // flotando encima de ella).
    const topMargin = message.replyToId
        ? 'mt-6'
        : isFirstInGroup
          ? 'mt-2'
          : 'mt-2.5';

    return (
        <div className={topMargin}>
            <div
                className={`group/row flex min-w-0 items-end gap-2 ${message.isMine ? 'flex-row-reverse' : ''}`}
            >
                <Avatar
                    // items-end en la fila alinea este avatar con lo último
                    // de la columna [burbuja + hora/read] de abajo — o sea,
                    // con la hora y el check de leído, NO con el pico (pedido
                    // explícito: "alinea el avatar... con el hora y read...
                    // no con el pico"). Sin translate: la hora/read ya vive
                    // en esa misma columna, así que el borde inferior de esa
                    // fila ES el de la hora — items-end alcanza solo.
                    className={`size-7 shrink-0 ${isLastInGroup ? '' : 'invisible'}`}
                >
                    {message.userAvatar && (
                        <AvatarImage
                            src={message.userAvatar}
                            alt={message.userName}
                        />
                    )}
                    {/* Dos tonos fijos por quién envió el mensaje —
                        pedido explícito, ver la nota junto a
                        --avatar-mine en app.css. */}
                    <AvatarFallback
                        className={`text-[10px] text-[var(--avatar-foreground)] ${message.isMine ? 'bg-[var(--avatar-mine)]' : 'bg-[var(--avatar-received)]'}`}
                    >
                        {getInitials(message.userName)}
                    </AvatarFallback>
                </Avatar>

                {/* Cola: un cuadrado del mismo color de la burbuja, esquinas
                apenas redondeadas, inclinado con `skew` y pegado al
                borde inferior — el mismo truco que WhatsApp/Telegram
                (cuadrado sesgado, no un triángulo recto ni una máscara
                circular). Sólo en el último mensaje de la racha. La
                esquina donde se pega (bottom-right si es mío, bottom-left
                si es del otro) se deja COMPLETAMENTE cuadrada — CUALQUIER
                curva ahí (incluso un radio chico) deja un hueco entre el
                borde de la burbuja y la cola, que se ve como una muesca
                de otro tono en vez de una sola pieza continua. */}
                <div
                    // max-w-[70%] va ACÁ, no en la burbuja de adentro: un %
                    // en un hijo de un flex item sin ancho propio es
                    // referencia circular en CSS — el navegador no puede
                    // resolverla y colapsa al mínimo posible (por eso "OK"
                    // se veía "O"/"K" en dos líneas, y la burbuja se veía
                    // angosta y separada del avatar). Acá sí hay un ancho
                    // de referencia real: el de la fila completa.
                    className="flex max-w-[70%] min-w-0 flex-col"
                >
                    <div
                        // rounded-3xl (no -2xl): el pico ya quedó bien tal cual
                        // está — pedido explícito de sumarle MÁS curva al resto
                        // de la burbuja, no tocar la esquina de la cola (esa
                        // sigue -none, cuadrada a propósito, ver comentario
                        // arriba).
                        className={`relative min-w-0 rounded-3xl px-3 py-2 text-sm shadow-[0_1px_1px_rgba(0,0,0,0.05),0_2px_6px_rgba(0,0,0,0.08)] transition-transform duration-150 ease-out hover:-translate-y-px ${bubbleColor} ${
                            isLastInGroup
                                ? message.isMine
                                    ? 'rounded-br-none'
                                    : 'rounded-bl-none'
                                : ''
                        } ${
                            failed
                                ? 'text-foreground ring-destructive/40 ring-1'
                                : message.isMine
                                  ? 'text-[var(--bubble-sent-foreground)]'
                                  : 'text-[var(--bubble-received-foreground)]'
                        }`}
                    >
                        {isLastInGroup && (
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none absolute bottom-0 size-3 rounded-[3px] ${bubbleColor} ${message.isMine ? 'right-0 origin-bottom-left skew-y-[38deg]' : 'left-0 origin-bottom-right -skew-y-[38deg]'}`}
                            />
                        )}

                        {message.replyToId && (
                            // Insignia flotante montada sobre el borde
                            // superior de la burbuja (-mt-6: pasa la
                            // mitad de su propia altura afuera; la
                            // burbuja no tiene overflow-hidden que la
                            // recorte). Gris fijo (no var(--background),
                            // que en tema claro no leía como "gris") —
                            // pedido explícito: SIEMPRE gris, en los dos
                            // temas. Acento de color a la izquierda +
                            // rounded-3xl (igual que las burbujas): el
                            // "badge" propio, no el recuadro plano
                            // típico de WhatsApp.
                            //
                            // EL BUG REAL de "se sale del ancho de la
                            // burbuja" no era el -mt negativo: era
                            // `truncate` en los <p> de acá adentro —
                            // truncate = white-space:nowrap, que fuerza
                            // un ancho mínimo igual al del texto COMPLETO
                            // sin cortar. line-clamp (NO truncate):
                            // permite que el texto SÍ envuelva y sólo
                            // recorta por CANTIDAD de líneas.
                            //
                            // SIN w-fit (ancho de contenido) — pedido
                            // explícito: "totalmente ceñido al ancho de
                            // la burbuja", no sólo lo que el texto pida.
                            // width:auto (el default de un div en flujo
                            // normal, NINGUNA clase de ancho) rellena el
                            // content-box del padre igual que ya hace el
                            // <p> del cuerpo más abajo — mismo patrón
                            // seguro que ese <p> (sólo max-w-[420px]
                            // fijo en px como tope, nunca % ni w-full:
                            // esos sí reabren la referencia circular con
                            // el `display:table` interno de ScrollArea
                            // (Radix), el bug crítico de antes — "no
                            // muestra los mensajes enviados").
                            <div
                                className={`relative z-10 -mt-6 mb-1.5 max-w-[420px] rounded-3xl border-l-[5px] bg-[#71717a] px-3 py-1.5 text-xs shadow-sm ${replyAccentColor}`}
                            >
                                <p className="line-clamp-1 font-bold break-words text-white">
                                    {message.replyToUserName}
                                </p>
                                <p className="line-clamp-1 break-words text-white/70">
                                    {message.replyToBody}
                                </p>
                            </div>
                        )}

                        {/* max-w fijo en px (no %): el wrapper interno de
                    ScrollArea (Radix) mide contenido con un
                    `display:table`, que crece sin límite frente a texto
                    sin espacios — un % no lo frena porque la tabla no
                    tiene ancho definido a priori, un px sí. div (no p):
                    el Markdown ligero de la barra de formato puede
                    producir hijos de bloque (cita, lista) — meterlos
                    dentro de un <p> es HTML inválido (el navegador
                    cierra el <p> solo, apenas encuentra un bloque
                    adentro). */}
                        <div className="max-w-[420px] break-words">
                            {renderFormattedBody(message.body)}
                        </div>
                    </div>

                    {/* Hora fuera de la burbuja, en TODAS (no sólo la última de
                    la racha) — pedido explícito: "todas las burbujas deben
                    mostrar hora... la quiero fuera de las burbujas". Vive en
                    la MISMA columna que la burbuja (no una fila aparte) para
                    heredar gratis su mismo borde izq/der — nada de spacers
                    del ancho del avatar para no taparse con él. Separación
                    extra del lado de la cola/avatar (pr-2 si es mío, pl-2
                    si es del otro) — pegada al borde se traslapaba con el
                    pico, que justo de ese lado sobresale un poco de la
                    burbuja. mt-1.5 (no mt-0.5): más aire respecto a la
                    burbuja, no tan pegado. */}
                    <div
                        className={`text-muted-foreground mt-1.5 flex items-center gap-1 text-[10px] ${message.isMine ? 'justify-end pr-2' : 'justify-start pl-2'}`}
                    >
                        <span>{formatBubbleTime(message.createdAt)}</span>
                        <MessageStatus message={message} />
                    </div>
                </div>

                {/* Grupo de acciones al hover: sólo aparece con el mouse
                encima de la fila (no depende de clic derecho). Vive al
                lado externo de la burbuja (lejos del avatar) gracias al
                mismo flex-row-reverse que ya posiciona todo lo demás. */}
                <div className="pointer-events-none flex shrink-0 items-center self-center opacity-0 transition-opacity group-hover/row:pointer-events-auto group-hover/row:opacity-100">
                    <BubbleActionButton
                        icon={Reply}
                        label="Responder"
                        onClick={() => onReply(message)}
                    />
                    <BubbleActionButton
                        icon={Smile}
                        label="Reaccionar (próximamente)"
                        disabled
                    />
                    <BubbleActionButton
                        icon={Forward}
                        label="Reenviar (próximamente)"
                        disabled
                    />
                    <BubbleActionButton
                        icon={MoreHorizontal}
                        label="Más opciones (próximamente)"
                        disabled
                    />
                </div>
            </div>
        </div>
    );
}

MessagesIndex.layout = () => ({
    // El header genérico (breadcrumb + toggle) desaparece en Mensajes:
    // el toggle vive en la sidebar y, dentro de un chat, el header real
    // es el de la conversación (ConversationHeader).
    breadcrumbs: [],
});
