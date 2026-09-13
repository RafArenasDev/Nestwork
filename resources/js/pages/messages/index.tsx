import { Head, router, usePage } from '@inertiajs/react';
import { useChannel, useEcho } from '@laravel/echo-react';
import {
    Archive,
    ArchiveRestore,
    ArrowDown,
    Bell,
    BellOff,
    Check,
    CheckCheck,
    CircleAlert,
    Clock,
    Forward,
    MoreHorizontal,
    MoreVertical,
    Phone,
    Reply,
    Search,
    Send,
    Smile,
    UserRound,
    Video,
    X,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
                    <AvatarFallback className="bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]">
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
    const [typingUserName, setTypingUserName] = useState<string | null>(null);
    const [genieClass, setGenieClass] = useState('genie-panel--opening');
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [unseenCount, setUnseenCount] = useState(0);
    const scrollBottomRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);
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

            if (nearBottom) {
                setUnseenCount(0);
                markAsRead();
            }
        };

        viewport.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => viewport.removeEventListener('scroll', handleScroll);
    }, []);

    // useLayoutEffect (no useEffect): corre antes de que el navegador
    // pinte el frame, así el salto al fondo ya está hecho en el primer
    // frame visible — con useEffect a veces se alcanzaba a ver medio
    // scrolleado antes de saltar. El rAF de respaldo cubre el caso en
    // que ScrollArea (Radix) todavía no terminó de medir su viewport en
    // ese mismo tick (por ejemplo, justo al abrir un chat). Si el
    // usuario está leyendo historial más arriba, no lo interrumpe: en
    // vez de saltar solo, suma al contador del botón flotante.
    useLayoutEffect(() => {
        if (!isNearBottomRef.current) {
            setUnseenCount((count) => count + 1);

            return;
        }

        scrollBottomRef.current?.scrollIntoView({ block: 'end' });
        markAsRead();
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

    const handleSend = () => {
        const trimmed = capitalizeFirstLetter(body.trim());

        if (!trimmed || !currentTeam || sending) {
            return;
        }

        setSending(true);

        router.post(
            storeMessage([currentTeam.slug, conversation.id]).url,
            { body: trimmed, reply_to_message_id: replyingTo?.id ?? null },
            {
                preserveScroll: true,
                preserveUrl: true,
                onSuccess: () => {
                    setBody('');
                    setReplyingTo(null);
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
                            {liveMessages.map((message, index) => {
                                const previous = liveMessages[index - 1];
                                const next = liveMessages[index + 1];
                                const isFirstInGroup =
                                    !previous ||
                                    !isSameGroup(previous, message);
                                const isLastInGroup =
                                    !next || !isSameGroup(message, next);
                                const showDateSeparator =
                                    !previous ||
                                    dayKey(previous.createdAt) !==
                                        dayKey(message.createdAt);

                                return (
                                    <div key={message.id} className="min-w-0">
                                        {showDateSeparator && (
                                            <div className="my-3 flex justify-center">
                                                <span className="bg-foreground/5 text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
                                                    {formatDaySeparator(
                                                        message.createdAt,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        <MessageBubble
                                            message={message}
                                            getInitials={getInitials}
                                            isFirstInGroup={
                                                isFirstInGroup ||
                                                showDateSeparator
                                            }
                                            isLastInGroup={isLastInGroup}
                                            onReply={handleReply}
                                        />
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
                        // rounded-3xl: mismo radio que las burbujas de
                        // mensajes (pedido explícito) — no el rounded-lg
                        // genérico de antes.
                        <div className="border-border bg-foreground/5 flex items-start gap-2 rounded-3xl border-l-2 border-l-sky-500 py-2 pr-2 pl-3.5">
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                                    Respondiendo a{' '}
                                    {replyingTo.isMine
                                        ? 'ti mismo'
                                        : replyingTo.userName}
                                </p>
                                <p className="text-muted-foreground truncate text-xs">
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
                    <div className="flex items-end gap-2">
                        <Textarea
                            ref={textareaRef}
                            value={body}
                            onChange={(event) => {
                                setBody(event.target.value);
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
                            }}
                            placeholder="Escribe un mensaje…"
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

function MessageBubble({
    message,
    getInitials,
    isFirstInGroup,
    isLastInGroup,
    onReply,
}: {
    message: MessageData;
    getInitials: (name: string) => string;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    onReply: (message: MessageData) => void;
}) {
    const failed = message.status === 'failed';

    const bubbleColor = failed
        ? 'bg-destructive/15'
        : message.isMine
          ? 'bg-[var(--bubble-sent)]'
          : 'bg-[var(--bubble-received)]';

    // mt-2.5 (no mt-px): ahora CADA mensaje muestra su hora debajo, así
    // que ese "pegado" de antes (pensado para cuando sólo el último de
    // la racha tenía pie) quedaba muy poco aire entre la hora de un
    // mensaje y la burbuja del siguiente.
    return (
        <div className={isFirstInGroup ? 'mt-2' : 'mt-2.5'}>
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
                    <AvatarFallback className="bg-[var(--sidebar-accent)] text-[10px] text-[var(--sidebar-accent-foreground)]">
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
                            // Insignia flotante que se monta sobre el
                            // borde superior de la burbuja (-mt-4, sin
                            // overflow-hidden en la burbuja que la
                            // recorte) — no un cuadro embebido plano tipo
                            // WhatsApp. bg-[var(--background)] (el fondo
                            // general de la página, NO un overlay negro
                            // translúcido): así el tono SIEMPRE contrasta
                            // contra la burbuja sin importar su color ni
                            // el tema — antes, en recibidos, el overlay
                            // apenas se distinguía en ningún tema.
                            // max-w-[420px] fijo en px, NO w-full/%: un %
                            // acá encadena con el `display:table` interno
                            // de ScrollArea (Radix) y hace crecer TODO sin
                            // límite — el mismo bug crítico de antes
                            // ("no muestra los mensajes enviados"), ver el
                            // comentario junto al <p> del cuerpo más abajo.
                            <div className="relative z-10 -mt-4 mb-1.5 w-fit max-w-[420px] rounded-2xl border border-black/10 bg-[var(--background)] px-3 py-1.5 text-xs shadow-sm dark:border-white/10">
                                <p className="text-foreground truncate font-bold">
                                    {message.replyToUserName}
                                </p>
                                <p className="text-muted-foreground truncate">
                                    {message.replyToBody}
                                </p>
                            </div>
                        )}

                        {/* max-w fijo en px (no %): el wrapper interno de
                    ScrollArea (Radix) mide contenido con un
                    `display:table`, que crece sin límite frente a texto
                    sin espacios — un % no lo frena porque la tabla no
                    tiene ancho definido a priori, un px sí. */}
                        <p className="max-w-[420px] break-words whitespace-pre-wrap">
                            {message.body}
                        </p>
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
