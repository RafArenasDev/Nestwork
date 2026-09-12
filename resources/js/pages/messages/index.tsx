import { Head, router, usePage } from '@inertiajs/react';
import {
    Archive,
    ArchiveRestore,
    Bell,
    BellOff,
    Check,
    CheckCheck,
    CircleAlert,
    Clock,
    MoreVertical,
    Phone,
    Search,
    Send,
    UserRound,
    Video,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    index as messagesIndex,
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
import type { ActiveConversation, MessageData } from '@/types';

type Props = {
    conversation: ActiveConversation | null;
    messages: MessageData[];
};

export default function MessagesIndex({ conversation, messages }: Props) {
    return (
        <>
            <Head title={conversation ? conversation.name : 'Mensajes'} />

            {conversation ? (
                <Thread conversation={conversation} messages={messages} />
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
}: {
    conversation: ActiveConversation;
    currentTeamSlug: string | undefined;
    getInitials: (name: string) => string;
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
                // tiene sentido quedarse mirándolo, volvemos a la
                // bandeja como al archivar en Gmail/WhatsApp Web.
                onSuccess: () =>
                    !conversation.isArchived &&
                    router.visit(messagesIndex(currentTeamSlug).url),
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

                {currentTeamSlug && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                aria-label="Cerrar chat"
                                onClick={() =>
                                    router.visit(
                                        messagesIndex(currentTeamSlug).url,
                                    )
                                }
                            >
                                <X className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cerrar chat</TooltipContent>
                    </Tooltip>
                )}
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
}: {
    conversation: ActiveConversation;
    messages: MessageData[];
}) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const getInitials = useInitials();
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollBottomRef.current?.scrollIntoView({ block: 'end' });
    }, [messages.length]);

    const handleSend = () => {
        const trimmed = body.trim();

        if (!trimmed || !currentTeam || sending) {
            return;
        }

        setSending(true);

        router.post(
            storeMessage([currentTeam.slug, conversation.id]).url,
            { body: trimmed },
            {
                preserveScroll: true,
                onSuccess: () => setBody(''),
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--background)_84%,var(--foreground)_16%)] shadow-[0_0_2px_rgba(0,0,0,0.25),0_0_10px_rgba(0,0,0,0.35)] dark:shadow-[0_0_2px_rgba(0,0,0,0.7),0_0_10px_rgba(0,0,0,0.8)]">
                <ConversationHeader
                    conversation={conversation}
                    currentTeamSlug={currentTeam?.slug}
                    getInitials={getInitials}
                />

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <ScrollArea className="h-full flex-1 px-4">
                        <div className="flex flex-col gap-0.5 py-4">
                            {messages.map((message, index) => {
                            const previous = messages[index - 1];
                            const next = messages[index + 1];
                            const isFirstInGroup =
                                !previous || !isSameGroup(previous, message);
                            const isLastInGroup =
                                !next || !isSameGroup(message, next);
                            const showDateSeparator =
                                !previous ||
                                dayKey(previous.createdAt) !==
                                    dayKey(message.createdAt);

                            return (
                                <div key={message.id}>
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
                                    />
                                </div>
                            );
                        })}
                        <div ref={scrollBottomRef} />
                    </div>
                </ScrollArea>
            </div>

            <div className="flex items-end gap-2 border-t p-3">
                <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="max-h-40 min-h-10 flex-1 resize-none"
                    rows={1}
                />
                <Button
                    type="button"
                    size="icon"
                    disabled={sending || body.trim() === ''}
                    onClick={handleSend}
                >
                    <Send className="size-4" />
                </Button>
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
            <span className="text-destructive mt-0.5 flex items-center justify-end gap-1 text-[10px] font-medium">
                <CircleAlert className="size-3" />
                No se pudo enviar
            </span>
        );
    }

    return (
        <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[10px] opacity-70">
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

function MessageBubble({
    message,
    getInitials,
    isFirstInGroup,
    isLastInGroup,
}: {
    message: MessageData;
    getInitials: (name: string) => string;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
}) {
    const failed = message.status === 'failed';

    const bubbleColor = failed
        ? 'bg-destructive/15'
        : message.isMine
          ? 'bg-primary'
          : 'bg-muted';

    return (
        <div
            className={`flex items-end gap-2 ${message.isMine ? 'flex-row-reverse' : ''} ${isFirstInGroup ? 'mt-2' : 'mt-px'}`}
        >
            <Avatar
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

            {/* Burbuja de verdad, con una cola curva (cuerpo del mismo
                color + una máscara circular del tono del fondo que le
                talla la curva cóncava) apuntando al avatar — sólo en el
                último mensaje de la racha. */}
            <div
                className={`relative max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-[0_1px_1px_rgba(0,0,0,0.05),0_2px_6px_rgba(0,0,0,0.08)] transition-transform duration-150 ease-out hover:-translate-y-px ${bubbleColor} ${
                    failed
                        ? 'text-foreground ring-destructive/40 ring-1'
                        : message.isMine
                          ? 'text-primary-foreground'
                          : ''
                }`}
            >
                {isLastInGroup && (
                    <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute bottom-0 h-[13px] w-[10px] ${message.isMine ? '-right-[8px]' : '-left-[8px]'}`}
                    >
                        <span
                            className={`absolute inset-0 ${bubbleColor} ${message.isMine ? 'rounded-bl-[10px]' : 'rounded-br-[10px]'}`}
                        />
                        <span
                            className={`absolute bottom-0 size-4 rounded-full bg-[color-mix(in_srgb,var(--background)_84%,var(--foreground)_16%)] ${message.isMine ? '-right-1.5' : '-left-1.5'}`}
                        />
                    </span>
                )}

                <p className="break-words whitespace-pre-wrap">
                    {message.body}
                </p>
                <div
                    className={`mt-1 flex items-center gap-1 text-[10px] opacity-70 ${message.isMine ? 'justify-end' : ''}`}
                >
                    {formatBubbleTime(message.createdAt)}
                </div>
                <MessageStatus message={message} />
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
