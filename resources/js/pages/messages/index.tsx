import { Head, router, usePage } from '@inertiajs/react';
import { useChannel, useEcho } from '@laravel/echo-react';
import {
    Archive,
    ArchiveRestore,
    ArrowDown,
    Bell,
    BellOff,
    Bookmark,
    BookmarkCheck,
    Check,
    CheckCheck,
    ChevronDown,
    CircleAlert,
    Clock,
    Copy,
    Eraser,
    Forward,
    Link as LinkIcon,
    MoreHorizontal,
    MoreVertical,
    Pencil,
    Phone,
    Pin,
    PinOff,
    Reply,
    Search,
    Smile,
    Trash2,
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
    destroy as destroyMessageRoute,
    forward as forwardMessageRoute,
    hide as hideMessageRoute,
    index as messagesIndex,
    read as markReadRoute,
    show as messagesShow,
    store as storeMessage,
    update as updateMessageRoute,
} from '@/routes/messages';
import { toggle as togglePinRoute } from '@/routes/messages/pin';
import { toggle as toggleReactionRoute } from '@/routes/messages/reactions';
import { toggle as toggleSaveRoute } from '@/routes/messages/save';
import {
    clear as clearChatRoute,
    toggleArchive,
    toggleHidden,
    toggleMute,
} from '@/routes/conversations';
import { FOCUS_CONVERSATION_SEARCH_EVENT } from '@/components/global-search-bar';
import { MessageAttachment } from '@/components/message-attachment';
import { MessageCodeBlock } from '@/components/message-code-block';
import { MessageComposer } from '@/components/message-composer';
import { PresenceDot } from '@/components/presence-dot';
import { ReactionPickerButton } from '@/components/reaction-picker';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { useLivePresence } from '@/hooks/use-live-presence';
import { getPrivacyPreferences } from '@/hooks/use-privacy-preferences';
import {
    clearOpenConversationUnseen,
    setOpenConversationUnseen,
} from '@/hooks/use-open-conversation-unseen';
import { csrfHeaders } from '@/lib/csrf';
import { documentStyleFor } from '@/lib/file-type-style';
import { formatFileSize } from '@/lib/utils';
import type {
    ActiveConversation,
    AttachmentData,
    ConversationSummary,
    MessageData,
    ReactionData,
} from '@/types';

type Props = {
    conversation: ActiveConversation | null;
    messages: MessageData[];
    jumpToMessageId: number | null;
};

/** "Copiar" copia el texto LEGIBLE, no el markdown-ligero crudo — pegar
 *  "**hola**" en otra app sería peor que no ofrecer copiar. Bloques de
 *  código pierden la etiqueta de lenguaje del fence (no aporta nada al
 *  pegarlo en otro lado) pero conservan el código tal cual. */
function stripMarkdownForCopy(body: string): string {
    return body
        .replace(
            /```([\w-]*)\n([\s\S]*?)```/g,
            (_match, _language: string, code: string) =>
                code.replace(/\n$/, ''),
        )
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^\s)]+\)/g, '$1')
        .replace(/_(.+?)_/g, '$1');
}

export default function MessagesIndex({
    conversation,
    messages,
    jumpToMessageId,
}: Props) {
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
                    jumpToMessageId={jumpToMessageId}
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

/** Mismo mecanismo que ya usa el badge de fijado (ver pinnedMessage más
 *  abajo) — saltar a un mensaje por id, si está cargado en el DOM. */
function jumpToMessage(messageId: number | null): void {
    if (!messageId) {
        return;
    }

    document
        .getElementById(`message-${messageId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

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
 *  se haya escrito — pedido explícito, "es un sí o sí". Busca la
 *  primera letra de verdad (no el índice 0 a secas): el body ya sale
 *  serializado a Markdown ligero del composer, así que un mensaje en
 *  negrita empieza con "**hola**" — capitalizar el carácter 0 pondría
 *  mayúscula sobre el asterisco (no hace nada) y la "h" real se
 *  quedaba en minúscula. Salta cualquier delimitador/prefijo (**, _,
 *  __, ~~, `, "> ", "- ", "1. ") hasta encontrar la letra real. Red de
 *  seguridad para lo pegado (paste no pasa por el auto-capitalize en
 *  vivo del composer, ver handleTextInput en message-composer.tsx) —
 *  por eso mismo repite acá la excepción de URL: un mensaje que
 *  arranca "https://…"/"www…" nunca se toca, sea escrito o pegado. */
function capitalizeFirstLetter(text: string): string {
    if (/^\[?(https?:\/\/|www\.)/i.test(text)) {
        return text;
    }

    const match = text.match(/\p{L}/u);

    if (!match || match.index === undefined) {
        return text;
    }

    const index = match.index;

    return (
        text.slice(0, index) +
        text[index].toLocaleUpperCase('es') +
        text.slice(index + 1)
    );
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
// cursiva, subrayado, tachado, código en línea y enlaces. Orden del
// alternado importa: **negrita** y __subrayado__ (dobles) van ANTES
// que _cursiva_ (simple), y el link explícito `[texto](url)` va ANTES
// que la URL suelta para no destrizarlo en dos matches.
const INLINE_FORMAT_RE =
    /\*\*(?<bold>.+?)\*\*|__(?<underline>.+?)__|~~(?<strike>.+?)~~|`(?<code>.+?)`|\[(?<linkText>[^\]]+)\]\((?<linkHref>[^\s)]+)\)|(?<url>https?:\/\/[^\s<]+)|_(?<italic>.+?)_/g;

/** Puntuación de cierre de frase pegada al final de una URL suelta
 *  ("...revisá https://x.com.") no es parte del link — mismo criterio
 *  que Slack/Gmail al autolinkear. */
function trimTrailingPunctuation(url: string): {
    url: string;
    trailing: string;
} {
    const match = url.match(/^(.*?)([.,;:!?'")\]]+)$/);

    return match
        ? { url: match[1], trailing: match[2] }
        : { url, trailing: '' };
}

/** El `[texto](url)` explícito viene del mismo mark de Link que ya
 *  restringe protocolos en el composer (ver Link.configure en
 *  message-composer.tsx), pero el body es texto plano que cualquiera
 *  podría escribir a mano — sin este chequeo, un `[click acá](javascript:...)`
 *  se renderizaría como un <a href> real y ejecutaría al clickear. */
function isSafeHref(href: string): boolean {
    return /^(https?:|mailto:)/i.test(href);
}

/** Sitio (segmento antes del TLD, saltando subdominios) capitalizado —
 *  el fallback cuando no hay nada más específico que mostrar. */
function siteNameFor(hostname: string): string {
    const parts = hostname.split('.');
    const name = parts.length > 2 ? parts[parts.length - 2] : parts[0];

    return name.charAt(0).toLocaleUpperCase('es') + name.slice(1);
}

/** "mi-articulo-de-blog" -> "Mi articulo de blog" — heurística sin
 *  fetch para que un slug de URL lea como texto, no como URL. */
function humanizeSlug(slug: string): string {
    const words = slug
        .replace(/\.[a-z0-9]+$/i, '') // .html, .php, etc. al final
        .replace(/[-_]+/g, ' ')
        .trim();

    if (!words) {
        return slug;
    }

    const capitalized =
        words.charAt(0).toLocaleUpperCase('es') + words.slice(1);

    return capitalized.length > 40
        ? `${capitalized.slice(0, 40).trimEnd()}…`
        : capitalized;
}

const GIT_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org'];

/** Etiqueta de un link SIN fetch/scraping (eso es la vista previa que
 *  se descartó a propósito) — pedido explícito: no alcanza con el
 *  nombre del sitio, si es un repo quiere el nombre del repo, si es un
 *  artículo/producto quiere algo parecido a un título. Todo esto sale
 *  de la URL misma:
 *  - github.com/duenio/repo(.git) -> "repo" (el dato que SÍ importa,
 *    no el owner ni ".git").
 *  - Cualquier otra URL con path -> el último segmento, humanizado
 *    ("mi-articulo" -> "Mi articulo") — no es el título real de la
 *    página, pero se acerca más que el dominio pelado sin pedir nada
 *    al servidor.
 *  - Sin path (dominio raíz) -> nombre del sitio, como antes. */
function linkLabelFor(href: string): string {
    let url: URL;

    try {
        url = new URL(href);
    } catch {
        return href;
    }

    const hostname = url.hostname.replace(/^www\./, '');
    const segments = url.pathname.split('/').filter(Boolean);

    if (GIT_HOSTS.includes(hostname) && segments.length >= 2) {
        // "owner/repo.git" tal cual — pedido explícito: importa quién
        // es el dueño, no sólo el repo, y el ".git" se mantiene si la
        // URL original lo traía.
        return `${segments[0]}/${segments[1]}`;
    }

    if (segments.length > 0) {
        return humanizeSlug(segments[segments.length - 1]);
    }

    return siteNameFor(hostname);
}

/** Chip de enlace estilo Slack/Jira — pedido explícito: "no plano",
 *  con relleno y un brillo sutil, no un texto subrayado azul genérico.
 *  Color fijo (no depende de --bubble-sent/received, igual criterio
 *  que el badge de no-leídos) para que el contraste sea consistente
 *  sobre las dos burbujas. */
function LinkChip({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="chat-link-chip"
        >
            <LinkIcon className="size-3" />
            <span className="max-w-52 truncate">{label}</span>
        </a>
    );
}

function renderInlineFormatting(
    text: string,
    keyPrefix: string,
    isMine: boolean,
): ReactNode[] {
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
        const groups = match.groups ?? {};

        if (groups.bold !== undefined) {
            nodes.push(<strong key={key}>{groups.bold}</strong>);
        } else if (groups.underline !== undefined) {
            nodes.push(<u key={key}>{groups.underline}</u>);
        } else if (groups.strike !== undefined) {
            nodes.push(<s key={key}>{groups.strike}</s>);
        } else if (groups.code !== undefined) {
            nodes.push(
                <code
                    key={key}
                    // bg-black/10 apenas se notaba sobre la burbuja
                    // recibida (negra sobre negro, casi sin contraste)
                    // — pedido explícito de mejorar justo este caso.
                    // bg-white/20 sobre esa burbuja, bg-black/10 sigue
                    // sirviendo sobre la burbuja propia (clara).
                    className={`rounded px-1 py-0.5 font-mono text-[0.85em] ${isMine ? 'bg-black/10' : 'bg-white/20'}`}
                >
                    {groups.code}
                </code>,
            );
        } else if (groups.linkText !== undefined) {
            // El autolink del composer (Tiptap) marca CUALQUIER URL
            // tipeada como link automáticamente, con el texto tal cual
            // se escribió — o sea, la inmensa mayoría de los links que
            // llegan acá son "explícitos" sólo de forma, pero el texto
            // ES la URL cruda. Mismo criterio que el link suelto: si el
            // texto no es más que la URL, mostrar el nombre del sitio,
            // no la URL completa.
            const isRawUrlAsText =
                groups.linkText.replace(/\/$/, '') ===
                groups.linkHref!.replace(/\/$/, '');

            nodes.push(
                isSafeHref(groups.linkHref!) ? (
                    <LinkChip
                        key={key}
                        href={groups.linkHref!}
                        label={
                            isRawUrlAsText
                                ? linkLabelFor(groups.linkHref!)
                                : groups.linkText
                        }
                    />
                ) : (
                    groups.linkText
                ),
            );
        } else if (groups.url !== undefined) {
            const { url, trailing } = trimTrailingPunctuation(groups.url);

            nodes.push(
                <LinkChip key={key} href={url} label={linkLabelFor(url)} />,
            );

            if (trailing) {
                nodes.push(trailing);
            }
        } else if (groups.italic !== undefined) {
            nodes.push(<em key={key}>{groups.italic}</em>);
        }

        lastIndex = INLINE_FORMAT_RE.lastIndex;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}

/** Prefijos de línea (cita "> ", lista "- " y lista numerada "N. ")
 *  además del formato en línea de arriba — mismo criterio de
 *  seguridad, sin HTML crudo. */
function renderFormattedBody(body: string, isMine: boolean): ReactNode {
    const lines = body.split('\n');

    return lines.map((line, lineIndex) => {
        const key = `line-${lineIndex}`;

        if (line.startsWith('> ')) {
            return (
                <blockquote
                    key={key}
                    className="my-0.5 border-l-2 border-current/40 pl-2 opacity-90"
                >
                    {renderInlineFormatting(line.slice(2), key, isMine)}
                </blockquote>
            );
        }

        if (line.startsWith('- ')) {
            return (
                <div key={key} className="flex gap-1.5">
                    <span aria-hidden="true">•</span>
                    <span>
                        {renderInlineFormatting(line.slice(2), key, isMine)}
                    </span>
                </div>
            );
        }

        const orderedMatch = line.match(/^(\d+)\.\s(.*)$/);

        if (orderedMatch) {
            return (
                <div key={key} className="flex gap-1.5">
                    <span aria-hidden="true">{orderedMatch[1]}.</span>
                    <span>
                        {renderInlineFormatting(orderedMatch[2], key, isMine)}
                    </span>
                </div>
            );
        }

        return (
            <span key={key}>
                {renderInlineFormatting(line, key, isMine)}
                {lineIndex < lines.length - 1 && <br />}
            </span>
        );
    });
}

/** Bloque de código: ```lenguaje\ncódigo\n``` (lo que serializa el
 *  composer, ver serializeToMarkdown en message-composer.tsx). Split a
 *  nivel de mensaje ENTERO antes del render línea por línea de arriba
 *  — un bloque de código nunca debe pasar por el formato en línea
 *  (negrita/link/etc.), ni perder su indentación exacta. */
const CODE_FENCE_RE = /```([\w-]*)\n([\s\S]*?)```/g;

function renderMessageBody(body: string, isMine: boolean): ReactNode {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let index = 0;
    let match: RegExpExecArray | null;

    CODE_FENCE_RE.lastIndex = 0;

    while ((match = CODE_FENCE_RE.exec(body)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(
                <span key={`text-${index}`}>
                    {renderFormattedBody(
                        body.slice(lastIndex, match.index),
                        isMine,
                    )}
                </span>,
            );
        }

        nodes.push(
            <MessageCodeBlock
                key={`code-${index}`}
                language={match[1] || 'plaintext'}
                // El fence siempre cierra con un '\n' antes de ``` al
                // serializar — quitarlo evita una línea en blanco
                // fantasma al final del bloque renderizado.
                code={match[2].replace(/\n$/, '')}
            />,
        );

        index++;
        lastIndex = CODE_FENCE_RE.lastIndex;
    }

    if (lastIndex < body.length) {
        nodes.push(
            <span key={`text-${index}`}>
                {renderFormattedBody(body.slice(lastIndex), isMine)}
            </span>,
        );
    }

    return nodes;
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
    const live = useLivePresence(conversation.otherUserId, conversation);

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

    const [confirmAction, setConfirmAction] = useState<'clear' | 'hide' | null>(
        null,
    );

    const handleClearChat = (scope: 'today' | 'all') => {
        if (!currentTeamSlug) {
            return;
        }

        router.patch(
            clearChatRoute([currentTeamSlug, conversation.id]).url,
            { scope },
            { preserveScroll: true, only: ['messages'] },
        );
    };

    const handleHideConversation = () => {
        if (!currentTeamSlug) {
            return;
        }

        router.patch(toggleHidden([currentTeamSlug, conversation.id]).url);
    };

    const statusLabel =
        conversation.type === 'group'
            ? 'Grupo'
            : {
                  available: 'Disponible',
                  away: 'Ausente',
                  busy: 'Ocupado',
                  dnd: 'No molestar',
                  offline: 'Desconectado',
              }[live.presence ?? 'offline'];

    return (
        <div className="glass-panel-edge-b sticky top-0 z-10 flex shrink-0 items-center gap-4 px-4 py-3">
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
                {live.presence && (
                    <PresenceDot
                        presence={live.presence}
                        surfaceTone="var(--bg-elevated)"
                    />
                )}
                {live.statusEmoji && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span
                                className="absolute -bottom-1 -left-1 flex size-4 items-center justify-center rounded-full text-[10px] leading-none"
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                }}
                            >
                                {live.statusEmoji}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            {live.statusText}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm leading-tight font-semibold">
                    {conversation.name}
                    {live.statusEmoji && (
                        <span className="text-xs font-normal">
                            {live.statusEmoji}
                        </span>
                    )}
                </p>
                <p className="text-muted-foreground truncate text-xs leading-tight">
                    {statusLabel}
                    {live.statusText && ` · ${live.statusText}`}
                    {conversation.isMuted && ' · Silenciado'}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-full transition-transform duration-100 active:scale-90"
                            aria-label="Buscar en este chat"
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent(
                                        FOCUS_CONVERSATION_SEARCH_EVENT,
                                    ),
                                )
                            }
                        >
                            <Search className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Buscar en este chat</TooltipContent>
                </Tooltip>
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
                            className="size-8 rounded-full transition-transform duration-100 active:scale-90"
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setConfirmAction('clear')}
                        >
                            <Eraser />
                            Limpiar chat
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setConfirmAction('hide')}
                        >
                            <Trash2 />
                            Eliminar conversación
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <AlertDialog
                    open={confirmAction !== null}
                    onOpenChange={(open) => !open && setConfirmAction(null)}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {confirmAction === 'clear'
                                    ? 'Limpiar chat'
                                    : 'Eliminar conversación'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {confirmAction === 'clear'
                                    ? 'Solo para ti — la otra persona sigue viendo todo igual, y los mensajes nuevos vuelven a aparecer normal. ¿Ocultar solo los de hoy, o todo el historial hasta ahora?'
                                    : 'La conversación desaparece de tu lista hasta que la busques a propósito, y tu historial hasta ahora se oculta contigo. No se borra ningún mensaje ni afecta a la otra persona.'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            {confirmAction === 'clear' ? (
                                <>
                                    <AlertDialogAction
                                        onClick={() => {
                                            handleClearChat('today');
                                            setConfirmAction(null);
                                        }}
                                    >
                                        Solo hoy
                                    </AlertDialogAction>
                                    <AlertDialogAction
                                        onClick={() => {
                                            handleClearChat('all');
                                            setConfirmAction(null);
                                        }}
                                    >
                                        Todo el historial
                                    </AlertDialogAction>
                                </>
                            ) : (
                                <AlertDialogAction
                                    onClick={() => {
                                        handleHideConversation();
                                        setConfirmAction(null);
                                    }}
                                >
                                    Eliminar
                                </AlertDialogAction>
                            )}
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-full transition-transform duration-100 active:scale-90"
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
                        className="size-8 rounded-full"
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
    jumpToMessageId,
    onClose,
}: {
    conversation: ActiveConversation;
    messages: MessageData[];
    jumpToMessageId: number | null;
    onClose: () => void;
}) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const authUser = page.props.auth.user;
    const getInitials = useInitials();
    const [sending, setSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<MessageData | null>(null);
    const [editingMessage, setEditingMessage] = useState<MessageData | null>(
        null,
    );
    // Mensaje que se está reenviando (abre el ForwardDialog) — null
    // cierra el diálogo, ver <ForwardDialog> al final del componente.
    const [forwardingMessage, setForwardingMessage] =
        useState<MessageData | null>(null);
    // Estado local reactivo al prop (cambia de conversación) + a los
    // toggles propios/del otro participante vía ConversationPinChanged.
    const [pinnedMessageId, setPinnedMessageId] = useState<number | null>(
        conversation.pinnedMessageId,
    );
    const [liveMessages, setLiveMessages] = useState<MessageData[]>(messages);
    // Si el mensaje fijado no está en el lote cargado (historial
    // largo), el badge simplemente no aparece — mismo límite que
    // "cargar más hacia arriba" (sección 4.1/Fase F, todavía pendiente).
    const pinnedMessage =
        liveMessages.find((m) => m.id === pinnedMessageId) ?? null;
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
    const [isNearBottom, setIsNearBottom] = useState(true);
    // Marca de agua de "leído" para ESTA apertura del chat: todo mensaje
    // ajeno con id mayor a esto es "no leído" hasta que markAsRead lo
    // mueva — arranca en lo que el backend tenía ANTES de esta visita
    // (loadMessages ya no lo pisa), no en el último mensaje cargado.
    const [readWatermarkId, setReadWatermarkId] = useState(
        () => conversation.viewerLastReadMessageId ?? 0,
    );
    const [unseenCount, setUnseenCount] = useState(
        () =>
            messages.filter((m) => !m.isMine && m.id > readWatermarkId).length,
    );
    const scrollBottomRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
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
    // Un scrollIntoView() programático (abrir el chat, o un mensaje
    // nuevo que se desliza solo a la vista) dispara el mismo evento
    // nativo 'scroll' que arrastrar el dedo o girar la rueda — el
    // listener de scroll no puede distinguirlos por sí solo. Esta
    // bandera marca esa ventana corta para que SÓLO un scroll genuino
    // del usuario cuente como interacción real (ver handleScroll más
    // abajo); sin esto, abrir un chat (que auto-scrollea al fondo)
    // volvía a marcar todo como leído al instante, aunque el mount
    // effect que hacía eso explícitamente ya se haya quitado.
    const suppressScrollReadRef = useRef(false);
    const markAutoScroll = () => {
        suppressScrollReadRef.current = true;
        window.setTimeout(() => {
            suppressScrollReadRef.current = false;
        }, 150);
    };

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
        // Optimista: no hace falta esperar la vuelta del PATCH para
        // apagar el divisor/resaltado de no-leído ni el contador — el
        // backend igual computa el id real de punta a punta (ver
        // markRead() en el controller).
        setUnseenCount(0);
        setReadWatermarkId(lastId);

        fetch(markReadRoute([currentTeam.slug, conversation.id]).url, {
            method: 'PATCH',
            headers: csrfHeaders(),
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

    // Pedido explícito: abrir el chat (aunque el scroll arranque al
    // fondo, ver el useLayoutEffect de liveMessages más abajo) NO
    // cuenta como "leído" por sí solo — sólo lo hacen la interacción
    // real, el scroll al fondo o enviar una respuesta (ver markAsRead
    // más arriba y sus llamadas). Antes se avisaba acá mismo al backend
    // con el último mensaje del prop inicial, y por eso la notificación
    // de no-leído se cerraba sola con sólo abrir.
    const handleClose = () => {
        onClose();
    };

    // Los props sólo cambian entre visitas de Inertia (abrir otro chat,
    // enviar el propio mensaje) — al llegar uno nuevo, resincroniza el
    // estado local que además recibe los mensajes en vivo de Echo.
    useEffect(() => {
        setLiveMessages(messages);
    }, [messages]);

    useEffect(() => {
        setPinnedMessageId(conversation.pinnedMessageId);
    }, [conversation.pinnedMessageId]);

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
            // porque ya estabas ahí (suppressScrollReadRef, ver el
            // useLayoutEffect de abajo y su nota más arriba).
            if (nearBottom && !suppressScrollReadRef.current) {
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

        markAutoScroll();
        scrollBottomRef.current?.scrollIntoView({ block: 'end' });
        const raf = requestAnimationFrame(() => {
            markAutoScroll();
            scrollBottomRef.current?.scrollIntoView({ block: 'end' });
        });

        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveMessages.length]);

    // Llegar acá desde "Guardados" (?message=id en la URL): pisa el
    // auto-scroll al fondo de arriba con un salto al mensaje puntual.
    // Sólo una vez por apertura de chat (el `key={conversation.id}` en
    // el padre ya fuerza un remount completo de Thread por cada chat
    // distinto, así que un ref simple alcanza sin depender de
    // jumpToMessageId cambiando). Sólo funciona si el mensaje cayó
    // dentro de la ventana inicial cargada — misma limitación que el
    // salto del badge de fijado hasta que exista paginación (Fase F).
    const jumpHandledRef = useRef(false);
    useEffect(() => {
        if (jumpHandledRef.current || !jumpToMessageId) {
            return;
        }

        jumpHandledRef.current = true;

        const raf = requestAnimationFrame(() => {
            markAutoScroll();
            document
                .getElementById(`message-${jumpToMessageId}`)
                ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });

        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jumpToMessageId]);

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

    // Reacciones y ediciones de OTROS participantes llegan acá — el
    // payload siempre trae isMine:false (mismo criterio que
    // MessageSent, ver MessageData::fromMessage en el backend: un
    // socket comparte payload entre todos los conectados al canal), así
    // que se recalcula localmente antes de reemplazar el mensaje.
    useEcho<{ conversationId: number; message: MessageData }>(
        `conversation.${conversation.id}`,
        '.MessageUpdated',
        (payload) => {
            setLiveMessages((previous) =>
                previous.map((message) =>
                    message.id === payload.message.id
                        ? {
                              ...payload.message,
                              isMine: payload.message.userId === authUser.id,
                          }
                        : message,
                ),
            );
        },
        [conversation.id, authUser.id],
    );

    // Fijar/desfijar SÍ es visible para el otro participante (a
    // diferencia de guardar, que es privado) — necesita su propio
    // evento en vez de reutilizar MessageUpdated (no es un cambio del
    // mensaje en sí, es de la conversación).
    useEcho<{ conversationId: number; pinnedMessageId: number | null }>(
        `conversation.${conversation.id}`,
        '.ConversationPinChanged',
        (payload) => {
            setPinnedMessageId(payload.pinnedMessageId);
        },
        [conversation.id],
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
        // Ajustes > Privacidad > "Mostrar escribiendo…" — si está
        // apagado, nunca se manda el whisper (no es que se oculte del
        // lado del que recibe, directamente no sale de acá).
        if (!getPrivacyPreferences().showTypingIndicator) {
            return;
        }

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
        setEditingMessage(null);
        setReplyingTo(message);
        // El foco del composer ahora reacciona solo al cambio de
        // replyingTo (ver el useEffect en MessageComposer) — Tiptap no
        // es un <textarea> al que se le pueda pedir .focus() desde
        // acá con un ref simple.
    };

    const handleEdit = (message: MessageData) => {
        setReplyingTo(null);
        setEditingMessage(message);
    };

    const handleSubmitEdit = (markdownBody: string) => {
        if (!currentTeam || !editingMessage) {
            return;
        }

        const targetId = editingMessage.id;

        // Optimista: el texto nuevo se ve al instante, igual que un
        // mensaje recién enviado — se reconcilia con la respuesta real
        // (que trae editedAt/editableUntil recalculados) apenas llega.
        setLiveMessages((previous) =>
            previous.map((m) =>
                m.id === targetId ? { ...m, body: markdownBody } : m,
            ),
        );
        setEditingMessage(null);

        fetch(
            updateMessageRoute([currentTeam.slug, conversation.id, targetId])
                .url,
            {
                method: 'PATCH',
                headers: csrfHeaders(),
                body: JSON.stringify({ body: markdownBody }),
            },
        )
            .then((response) =>
                response.ok ? response.json() : Promise.reject(),
            )
            .then((data: { message: MessageData }) => {
                setLiveMessages((previous) =>
                    previous.map((m) => (m.id === targetId ? data.message : m)),
                );
            })
            .catch(() => {
                // Silencioso, mismo criterio que markAsRead: la próxima
                // visita/evento en vivo reconcilia si esto falló.
            });
    };

    const handleReact = (message: MessageData, emoji: string) => {
        if (!currentTeam) {
            return;
        }

        const alreadyMine = message.reactions.some(
            (r) => r.userId === authUser.id && r.emoji === emoji,
        );

        setLiveMessages((previous) =>
            previous.map((m) =>
                m.id === message.id
                    ? {
                          ...m,
                          // Un solo emoji por persona: elegir otro
                          // reemplaza el propio, nunca se acumulan dos
                          // — se saca cualquier reacción previa de este
                          // usuario antes de sumar la nueva (si la nueva
                          // es la misma de antes, esto la deja en cero
                          // hasta el próximo `if`, que sólo la vuelve a
                          // poner cuando NO era la que ya tenía).
                          reactions: alreadyMine
                              ? m.reactions.filter(
                                    (r) => r.userId !== authUser.id,
                                )
                              : [
                                    ...m.reactions.filter(
                                        (r) => r.userId !== authUser.id,
                                    ),
                                    {
                                        emoji,
                                        userId: authUser.id,
                                        userName: authUser.name,
                                    },
                                ],
                      }
                    : m,
            ),
        );

        fetch(
            toggleReactionRoute([currentTeam.slug, conversation.id, message.id])
                .url,
            {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ emoji }),
            },
        )
            .then((response) =>
                response.ok ? response.json() : Promise.reject(),
            )
            .then((data: { reactions: ReactionData[] }) => {
                setLiveMessages((previous) =>
                    previous.map((m) =>
                        m.id === message.id
                            ? { ...m, reactions: data.reactions }
                            : m,
                    ),
                );
            })
            .catch(() => {
                // Silencioso — próximo MessageUpdated/recarga reconcilia.
            });
    };

    const handleCopy = (message: MessageData) => {
        void navigator.clipboard.writeText(stripMarkdownForCopy(message.body));
    };

    const handleForward = (targetIds: number[]) => {
        if (!currentTeam || !forwardingMessage) {
            return Promise.resolve();
        }

        return fetch(
            forwardMessageRoute([
                currentTeam.slug,
                conversation.id,
                forwardingMessage.id,
            ]).url,
            {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ conversation_ids: targetIds }),
            },
        ).then((response) => {
            if (response.ok) {
                setForwardingMessage(null);
            }
        });
    };

    const handleToggleSave = (message: MessageData) => {
        if (!currentTeam) {
            return;
        }

        // Privado del viewer — optimista y sin esperar broadcast (no
        // hay ninguno, ver toggleSave() en el backend).
        setLiveMessages((previous) =>
            previous.map((m) =>
                m.id === message.id ? { ...m, isSaved: !m.isSaved } : m,
            ),
        );

        fetch(
            toggleSaveRoute([currentTeam.slug, conversation.id, message.id])
                .url,
            { method: 'POST', headers: csrfHeaders() },
        )
            .then(() => {
                // savedMessages es un prop compartido (ver
                // HandleInertiaRequests) que sólo se recalcula en una
                // visita real de Inertia — este fetch de acá arriba no
                // cuenta como una — así que sin este reload puntual el
                // módulo "Guardados" del mini-rail seguiría mostrando
                // la lista vieja hasta la próxima navegación real.
                router.reload({ only: ['savedMessages'] });
            })
            .catch(() => {
                // Silencioso — reintentar tocando el botón de nuevo alcanza.
            });
    };

    const handleTogglePin = (message: MessageData) => {
        if (!currentTeam) {
            return;
        }

        const next = pinnedMessageId === message.id ? null : message.id;

        setPinnedMessageId(next);

        fetch(
            togglePinRoute([currentTeam.slug, conversation.id, message.id]).url,
            { method: 'POST', headers: csrfHeaders() },
        )
            .then((response) =>
                response.ok ? response.json() : Promise.reject(),
            )
            .then((data: { pinnedMessageId: number | null }) => {
                setPinnedMessageId(data.pinnedMessageId);
            })
            .catch(() => {
                setPinnedMessageId(pinnedMessageId);
            });
    };

    const handleDelete = (message: MessageData, scope: 'me' | 'everyone') => {
        if (!currentTeam) {
            return;
        }

        if (scope === 'me') {
            // "Para mí": el mensaje desaparece de MI lista nada más —
            // no hay nada que mostrarle a los demás (siguen viendo todo
            // intacto), así que se quita del todo en vez de marcar
            // isDeleted (eso es sólo para "para todos").
            setLiveMessages((previous) =>
                previous.filter((m) => m.id !== message.id),
            );

            fetch(
                hideMessageRoute([
                    currentTeam.slug,
                    conversation.id,
                    message.id,
                ]).url,
                { method: 'POST', headers: csrfHeaders() },
            ).catch(() => {
                // Silencioso — próxima recarga reconcilia si esto falló.
            });

            return;
        }

        setLiveMessages((previous) =>
            previous.map((m) =>
                m.id === message.id
                    ? { ...m, isDeleted: true, body: '', attachments: [] }
                    : m,
            ),
        );

        fetch(
            destroyMessageRoute([currentTeam.slug, conversation.id, message.id])
                .url,
            { method: 'DELETE', headers: csrfHeaders() },
        ).catch(() => {
            // Silencioso — próxima recarga reconcilia si esto falló.
        });
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

    const handleSend = (
        markdownBody: string,
        attachment: File | null,
        attachmentCategory: 'image' | 'video' | 'document' | 'audio' | null,
    ) => {
        const trimmed = capitalizeFirstLetter(markdownBody.trim());

        // Pedido explícito: un mensaje puede ser sólo el adjunto, sin
        // texto — sólo se descarta el envío si NO hay ni texto ni
        // archivo.
        if ((!trimmed && !attachment) || !currentTeam || sending) {
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
        // Preview local inmediata (createObjectURL) mientras el archivo
        // real todavía viaja al servidor — mismo espíritu optimista que
        // el mensaje: no esperar el viaje de ida y vuelta para ver algo.
        const optimisticAttachment: AttachmentData | null = attachment
            ? {
                  id: -Date.now() - 1,
                  type: attachment.type.startsWith('image/')
                      ? 'image'
                      : attachment.type.startsWith('video/')
                        ? 'video'
                        : attachment.type.startsWith('audio/')
                          ? 'audio'
                          : 'document',
                  url: URL.createObjectURL(attachment),
                  originalName: attachment.name,
                  mimeType: attachment.type,
                  sizeBytes: attachment.size,
                  width: null,
                  height: null,
                  thumbnailUrl: null,
              }
            : null;
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
            attachments: optimisticAttachment ? [optimisticAttachment] : [],
            reactions: [],
            isForwarded: false,
            editableUntil: null,
            editsRemaining: 0,
            isDeleted: false,
            isSaved: false,
        };

        setLiveMessages((previous) => [...previous, optimisticMessage]);
        setReplyingTo(null);
        // Pedido explícito: enviar una respuesta también cuenta como
        // "leí todo lo anterior" — usa el mismo camino que la
        // interacción/scroll (liveMessagesRef todavía no incluye este
        // optimisticMessage en este mismo tick, así que marca hasta el
        // último mensaje real, nunca hasta el id negativo temporal).
        markAsRead();

        // Respaldo por si la confirmación tarda de más — el mensaje ya
        // se guardó en el servidor apenas llega el POST, lo único que
        // puede demorarse es que ESTE cliente reciba la respuesta que
        // lo reconcilia con el real (normalmente bajo 1s). 1.5s de
        // margen: pedido explícito de acortarlo — 8s daba sensación de
        // falla de red aunque el mensaje ya hubiera llegado.
        setTimeout(() => {
            setLiveMessages((previous) =>
                previous.map((existing) =>
                    existing.id === optimisticMessage.id &&
                    existing.status === 'sending'
                        ? { ...existing, status: 'sent' }
                        : existing,
                ),
            );
        }, 1500);

        router.post(
            storeMessage([currentTeam.slug, conversation.id]).url,
            {
                body: trimmed,
                reply_to_message_id: replyTo?.id ?? null,
                attachment,
                attachment_category: attachmentCategory,
            },
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

    // Primer mensaje ajeno no leído de ESTA apertura — ahí va el
    // divisor "N mensajes nuevos".
    const firstUnreadId = liveMessages.find(
        (m) => !m.isMine && m.id > readWatermarkId,
    )?.id;

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            {/* Ventana de chat a todo el ancho/alto del content, sin
                card ni margen flotante — mismo criterio "chrome de
                punta a punta" que ya usan el header (glass-panel-edge-b
                de ConversationHeader) y el composer
                (glass-panel-edge-t): un solo fondo de contenido
                (bg-background), sin borde ni sombra propios. */}
            <div
                ref={panelRef}
                className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
            >
                <ConversationHeader
                    conversation={conversation}
                    currentTeamSlug={currentTeam?.slug}
                    getInitials={getInitials}
                    onClose={handleClose}
                />

                {pinnedMessage && (
                    // Badge debajo del título, NO dentro de la burbuja
                    // — pedido explícito. Clic salta al mensaje real en
                    // el historial (mismo mecanismo que usa "saltar a
                    // la cita" dentro de la burbuja, ver jumpToMessage).
                    <button
                        type="button"
                        onClick={() => jumpToMessage(pinnedMessage.id)}
                        className="border-border/60 flex w-full items-center gap-2 border-b bg-[color-mix(in_srgb,var(--background)_94%,var(--foreground)_6%)] px-4 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--background)_88%,var(--foreground)_12%)]"
                    >
                        <Pin className="text-muted-foreground size-3.5 shrink-0 fill-current" />
                        <div className="min-w-0 flex-1">
                            <p className="text-muted-foreground text-[11px] font-medium">
                                Mensaje fijado
                            </p>
                            <p className="truncate text-xs">
                                {pinnedMessage.isDeleted
                                    ? 'Mensaje eliminado'
                                    : pinnedMessage.body || '📎 Adjunto'}
                            </p>
                        </div>
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                                event.stopPropagation();
                                handleTogglePin(pinnedMessage);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.stopPropagation();
                                    handleTogglePin(pinnedMessage);
                                }
                            }}
                            aria-label="Desfijar mensaje"
                            className="text-muted-foreground hover:bg-foreground/10 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors"
                        >
                            <PinOff className="size-3.5" />
                        </span>
                    </button>
                )}

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
                                // Hoy nunca se colapsa — pedido explícito:
                                // "el chat de hoy está totalmente
                                // abierto", el dropdown es sólo para Ayer
                                // y días anteriores.
                                const isToday =
                                    group.key ===
                                    dayKey(new Date().toISOString());
                                const isExpanded =
                                    isToday || expandedDates.has(group.key);
                                // Colapsado: NADA visible de ese día —
                                // pedido explícito, "ocultar todos los
                                // mensajes y mantenerlos colapsados" para
                                // que el historial se vea limpio y sólo
                                // cargue al accionar el badge (que sigue
                                // siendo un dropdown, no una etiqueta
                                // decorativa). El día más reciente
                                // arranca desplegado (ver el useState de
                                // expandedDates) — sin eso el chat abre
                                // completamente vacío.
                                const visibleMessages = isExpanded
                                    ? group.messages
                                    : [];
                                const hiddenCount =
                                    group.messages.length -
                                    visibleMessages.length;

                                return (
                                    <div key={group.key} className="min-w-0">
                                        <div className="my-3 flex justify-center">
                                            {isToday ? (
                                                <span className="bg-foreground/5 text-muted-foreground flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
                                                    {formatDaySeparator(
                                                        group.messages[0]
                                                            .createdAt,
                                                    )}
                                                </span>
                                            ) : (
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
                                                        group.messages[0]
                                                            .createdAt,
                                                    )}
                                                    {!isExpanded &&
                                                        hiddenCount > 0 && (
                                                            <span className="opacity-70">
                                                                ·{' '}
                                                                {hiddenCount >
                                                                99
                                                                    ? '99+'
                                                                    : hiddenCount}{' '}
                                                                más
                                                            </span>
                                                        )}
                                                    <ChevronDown
                                                        className={`size-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                    />
                                                </button>
                                            )}
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
                                                        id={`message-${message.id}`}
                                                        className="min-w-0"
                                                    >
                                                        {message.id ===
                                                            firstUnreadId && (
                                                            <UnreadDivider
                                                                count={
                                                                    unseenCount
                                                                }
                                                            />
                                                        )}
                                                        <MessageBubble
                                                            message={message}
                                                            getInitials={
                                                                getInitials
                                                            }
                                                            authUserId={
                                                                authUser.id
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
                                                            isPinned={
                                                                message.id ===
                                                                pinnedMessageId
                                                            }
                                                            onReply={
                                                                handleReply
                                                            }
                                                            onReact={
                                                                handleReact
                                                            }
                                                            onEdit={handleEdit}
                                                            onCopy={handleCopy}
                                                            onForward={() =>
                                                                setForwardingMessage(
                                                                    message,
                                                                )
                                                            }
                                                            onTogglePin={
                                                                handleTogglePin
                                                            }
                                                            onToggleSave={
                                                                handleToggleSave
                                                            }
                                                            onDelete={
                                                                handleDelete
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
                                markAsRead();
                            }}
                            // bg-foreground/text-background (no
                            // --sidebar, que en oscuro daba un gris
                            // apagado) — pedido explícito: negro sólido
                            // en tema claro, blanco sólido en tema
                            // oscuro, misma lógica de inversión que el
                            // botón de Google en el login.
                            className="btn-elevated bg-foreground text-background absolute bottom-10 left-1/2 z-10 inline-flex w-fit -translate-x-1/2 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-nowrap transition-transform duration-100 active:scale-95"
                        >
                            <ArrowDown className="size-3.5" />
                            {unseenCount > 0
                                ? `${unseenCount} mensaje${unseenCount === 1 ? '' : 's'} nuevo${unseenCount === 1 ? '' : 's'} sin leer`
                                : 'Ir al final'}
                        </button>
                    )}
                    {typingUserName && (
                        <div className="flex items-center gap-1.5 px-4 pb-1.5">
                            <span className="text-muted-foreground text-xs italic">
                                {typingUserName} está escribiendo
                            </span>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--bubble-received)] px-2 py-1.5">
                                {[0, 1, 2].map((dot) => (
                                    <span
                                        key={dot}
                                        className="animate-typing-dot block size-1.5 rounded-full bg-[var(--bubble-received-foreground)]"
                                        style={{
                                            animationDelay: `${dot * 160}ms`,
                                        }}
                                    />
                                ))}
                            </span>
                        </div>
                    )}
                </div>

                <MessageComposer
                    placeholder="Escribe un mensaje…"
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    editingMessage={editingMessage}
                    onCancelEdit={() => setEditingMessage(null)}
                    onSubmit={handleSend}
                    onSubmitEdit={handleSubmitEdit}
                    onTyping={notifyTyping}
                />
            </div>

            <ForwardDialog
                message={forwardingMessage}
                currentConversationId={conversation.id}
                onClose={() => setForwardingMessage(null)}
                onForward={handleForward}
            />
        </div>
    );
}

function UnreadDivider({ count }: { count: number }) {
    // Tema opuesto al fondo (pedido explícito): blanco en oscuro, negro
    // en claro — eso es exactamente lo que ya hace el token
    // --foreground en los dos temas, no un color fijo como el rojo del
    // badge de no-leídos.
    return (
        <div className="my-3 flex items-center gap-3 px-1" aria-hidden>
            <div className="bg-foreground/25 h-px flex-1" />
            <span className="text-foreground/70 text-[11px] font-medium text-nowrap">
                {count > 0
                    ? `${count} mensaje${count === 1 ? '' : 's'} nuevo${count === 1 ? '' : 's'}`
                    : 'Mensajes nuevos'}
            </span>
            <div className="bg-foreground/25 h-px flex-1" />
        </div>
    );
}

/** Reenviar: lista las conversaciones donde el usuario participa (mismo
 *  prop compartido `conversations` que ya alimenta el sidebar, ver
 *  global.d.ts) y deja marcar varias a la vez — no hace falta un
 *  endpoint aparte sólo para listar destinos. */
function ForwardDialog({
    message,
    currentConversationId,
    onClose,
    onForward,
}: {
    message: MessageData | null;
    currentConversationId: number;
    onClose: () => void;
    onForward: (targetIds: number[]) => Promise<void>;
}) {
    const page = usePage();
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [isSending, setIsSending] = useState(false);

    const targets: ConversationSummary[] = page.props.conversations.filter(
        (item) => item.id !== currentConversationId,
    );

    const toggle = (id: number) => {
        setSelected((previous) => {
            const next = new Set(previous);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSelected(new Set());
            onClose();
        }
    };

    const submit = () => {
        if (selected.size === 0) {
            return;
        }

        setIsSending(true);
        onForward(Array.from(selected))
            .catch(() => {
                // Silencioso — el usuario puede intentar de nuevo, el
                // diálogo se queda abierto con su selección intacta.
            })
            .finally(() => {
                setIsSending(false);
                setSelected(new Set());
            });
    };

    return (
        <Dialog open={message !== null} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Reenviar mensaje</DialogTitle>
                </DialogHeader>

                <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                    {targets.length === 0 && (
                        <p className="text-muted-foreground px-1 py-4 text-center text-sm">
                            No tienes otras conversaciones a las que reenviar
                            todavía.
                        </p>
                    )}
                    {targets.map((target) => (
                        <label
                            key={target.id}
                            className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2"
                        >
                            <Checkbox
                                checked={selected.has(target.id)}
                                onCheckedChange={() => toggle(target.id)}
                            />
                            <Avatar className="size-8 shrink-0">
                                {target.avatar && (
                                    <AvatarImage
                                        src={target.avatar}
                                        alt={target.name}
                                    />
                                )}
                                <AvatarFallback className="text-[10px]">
                                    {target.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate text-sm">
                                {target.name}
                            </span>
                        </label>
                    ))}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        className="btn-elevated rounded-full"
                        disabled={selected.size === 0 || isSending}
                        onClick={submit}
                    >
                        Reenviar{selected.size > 0 ? ` (${selected.size})` : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

/** Trigger con el estilo propio de la fila de acciones de la burbuja —
 *  el picker en sí (accesos rápidos + "+ más emojis" + librería
 *  completa) vive en el componente compartido ReactionPicker, mismo
 *  que usa el visor de imagen/video (pedido explícito: "todas las
 *  reacciones aplica igual"). */
function BubbleReactionPickerButton({
    onPick,
}: {
    onPick: (emoji: string) => void;
}) {
    return (
        <ReactionPickerButton
            onPick={onPick}
            trigger={
                <button
                    type="button"
                    aria-label="Reaccionar"
                    className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground flex size-6 items-center justify-center rounded-full transition-colors"
                >
                    <Smile className="size-3.5" />
                </button>
            }
        />
    );
}

function MessageBubble({
    message,
    getInitials,
    authUserId,
    authUserName,
    isFirstInGroup,
    isLastInGroup,
    isPinned,
    onReply,
    onReact,
    onEdit,
    onCopy,
    onForward,
    onTogglePin,
    onToggleSave,
    onDelete,
}: {
    message: MessageData;
    getInitials: (name: string) => string;
    authUserId: number;
    authUserName: string;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    isPinned: boolean;
    onReply: (message: MessageData) => void;
    onReact: (message: MessageData, emoji: string) => void;
    onEdit: (message: MessageData) => void;
    onCopy: (message: MessageData) => void;
    onForward: () => void;
    onTogglePin: (message: MessageData) => void;
    onToggleSave: (message: MessageData) => void;
    onDelete: (message: MessageData, scope: 'me' | 'everyone') => void;
}) {
    const groupedReactions = Object.values(
        message.reactions.reduce<
            Record<string, { emoji: string; count: number; mine: boolean }>
        >((acc, reaction) => {
            acc[reaction.emoji] ??= {
                emoji: reaction.emoji,
                count: 0,
                mine: false,
            };
            acc[reaction.emoji].count += 1;
            if (reaction.userId === authUserId) {
                acc[reaction.emoji].mine = true;
            }

            return acc;
        }, {}),
    );
    const canEdit =
        message.isMine &&
        message.editsRemaining > 0 &&
        message.editableUntil !== null &&
        new Date(message.editableUntil) > new Date();
    const failed = message.status === 'failed';
    // Foto/video sin texto NI cita: burbuja "a lo WhatsApp nuevo" — el
    // media llena casi toda la burbuja de punta a punta, sin
    // fondo/padding propio ni cola (pedido explícito). Con caption,
    // cita, o un documento/audio (que sí necesitan su propio chrome —
    // nombre, duración, controles), sigue la burbuja normal de
    // siempre — mezclar el recorte edge-to-edge con el badge de cita
    // (que a propósito se sale del borde superior, ver más abajo) los
    // haría pelear entre sí.
    // Foto/video (o documento YA con preview real generada) SIEMPRE
    // llena de punta a punta arriba, tenga o no caption — pedido
    // explícito: "de ahí para arriba debe cubrir todo... sin tener más
    // BG de la burbuja", "deben cubrir la parte superior sin
    // márgenes". El texto (si hay) vive en su propio "pie" de color
    // debajo, que SIEMPRE existe — vacío si no hay caption. Reenviado
    // también entra acá ahora (antes se excluía, pedido explícito:
    // "evitar esas esquinas [cuadradas]") — la etiqueta "Reenviado" se
    // corre adentro del pie, ver más abajo. Con cita SÍ se sigue
    // excluyendo: el badge de cita se sale del borde superior y
    // pelearía con el recorte del media.
    const hasEdgeToEdgeMedia =
        !message.replyToId &&
        message.attachments.some(
            (attachment) =>
                attachment.type === 'image' ||
                attachment.type === 'video' ||
                (attachment.type === 'document' &&
                    attachment.thumbnailUrl !== null),
        );
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

    // bg-[image:...] (no bg-[var(...)] a secas): --bubble-sent ahora
    // guarda un gradiente (--accent-gradient), background-image es la
    // única propiedad que lo renderiza — background-color lo
    // ignoraría en silencio.
    const bubbleColor = failed
        ? 'bg-destructive/15'
        : message.isMine
          ? 'bg-[image:var(--bubble-sent)]'
          : 'bg-[var(--bubble-received)]';
    // El pico NO repite el degradé de la burbuja (bg-[image:...]): un
    // recorte de 12px pintando el MISMO gradiente 135deg por su cuenta
    // calcula sus propios extremos sobre una caja minúscula, así que
    // termina en un tono distinto al de la burbuja grande en el punto
    // exacto donde se tocan — se percibían como dos colores. En vez de
    // eso, el pico usa un color SÓLIDO tomado del extremo del degradé
    // que le corresponde (accent-2, el final de 135deg, coincide con
    // la esquina inferior-derecha real de la burbuja) — burbuja y pico
    // vuelven a leer como una sola superficie continua.
    const tailColor = failed
        ? 'bg-destructive/15'
        : message.isMine
          ? 'bg-[var(--bubble-sent-tail)]'
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
    // Clases propias (no mt-2/mt-2.5/mt-6 de Tailwind a secas): la
    // densidad de mensajes (drawer de personalización) necesita poder
    // overridear este espaciado sin tocar utilidades globales que
    // también usa medio proyecto para otra cosa.
    const topMargin = message.replyToId
        ? 'msg-spacing-reply'
        : isFirstInGroup
          ? 'msg-spacing-group'
          : 'msg-spacing-normal';

    return (
        <div className={topMargin}>
            <div
                className={`flex min-w-0 items-end gap-2 ${message.isMine ? 'flex-row-reverse' : ''}`}
            >
                <Avatar
                    // items-end en la fila alinea este avatar con lo último
                    // de la columna [burbuja + hora/read] de abajo — o sea,
                    // con la hora y el check de leído, NO con el pico (pedido
                    // explícito: "alinea el avatar... con el hora y read...
                    // no con el pico"). Sin translate: la hora/read ya vive
                    // en esa misma columna, así que el borde inferior de esa
                    // fila ES el de la hora — items-end alcanza solo.
                    className={`msg-avatar size-7 shrink-0 ${isLastInGroup ? '' : 'invisible'}`}
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
                    {/* Fila [burbuja + acciones]: items-center centra la
                        columna de acciones exactamente contra la ALTURA
                        DE LA BURBUJA (ni pegada arriba ni abajo, "entre
                        ambos") — no contra el avatar ni contra el
                        hora-read, que viven fuera de esta fila. */}
                    <div
                        className={`flex items-center gap-1 ${message.isMine ? 'flex-row-reverse' : ''}`}
                    >
                        <div
                            // rounded-3xl (no -2xl): el pico ya quedó bien tal cual
                            // está — pedido explícito de sumarle MÁS curva al resto
                            // de la burbuja, no tocar la esquina de la cola (esa
                            // sigue -none, cuadrada a propósito, ver comentario
                            // arriba).
                            className={`msg-bubble relative min-w-0 rounded-3xl text-sm shadow-[0_1px_2px_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.16)] transition-transform duration-150 ease-out hover:-translate-y-px dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_6px_18px_rgba(0,0,0,0.5)] ${
                                hasEdgeToEdgeMedia
                                    ? ''
                                    : `px-3 py-2 ${bubbleColor}`
                            } ${
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
                            {/* El pico va SIEMPRE, sin excepción (pedido
                            explícito: "no se negocia") — también en
                            foto/video edge-to-edge. z-10 para que quede
                            por encima del media, y el wrapper del media
                            de más abajo comparte la MISMA esquina
                            cortada (rounded-br/bl-none) que la burbuja,
                            así el pico continúa esa esquina en vez de
                            superponerse a mitad de la imagen. */}
                            {/* El pico va SIEMPRE (pedido explícito: "no
                            se negocia"), también en foto/video edge-to-
                            edge — el "pie" de abajo (con o sin caption)
                            siempre existe, así que siempre hay una
                            superficie de color donde apoyarlo. Curva
                            leve en la esquina que mira al avatar (la
                            otra queda cuadrada, pegada al borde real de
                            la burbuja) para que apunte hacia él en vez
                            de verse como un triángulo recto. */}
                            {isLastInGroup && (
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none absolute bottom-0 z-10 size-3 ${tailColor} ${message.isMine ? 'right-0 origin-bottom-left skew-y-[32deg] rounded-tr-[4px] rounded-bl-[9px]' : 'left-0 origin-bottom-right -skew-y-[32deg] rounded-tl-[4px] rounded-br-[9px]'}`}
                                />
                            )}

                            {/* Badge de reacción: superpuesto en la
                            esquina INFERIOR opuesta al pico (pico a la
                            derecha en mis mensajes, badge a la
                            izquierda, y viceversa) — pedido explícito:
                            "en una de las esquinas de la burbuja,
                            superpuesta como el badge de reacciones...
                            sin BG, sólo el emoji grandecito". z-20 para
                            quedar sobre el media edge-to-edge. */}
                            {/* Tocar el badge NO reacciona/cambia nada —
                            pedido explícito: es sólo informativo, "quién
                            reaccionó con qué". Cambiar la propia reacción
                            sigue siendo el picker (ícono 😀 de la fila de
                            acciones), no este badge. */}
                            {!message.isDeleted &&
                                groupedReactions.length > 0 && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label="Ver quién reaccionó"
                                                className={`absolute -bottom-2.5 z-20 flex items-center transition-transform active:scale-90 ${message.isMine ? 'left-1.5' : 'right-1.5'}`}
                                            >
                                                {groupedReactions.map(
                                                    (reaction, index) => (
                                                        <span
                                                            key={reaction.emoji}
                                                            className="text-xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                                                            style={
                                                                index > 0
                                                                    ? {
                                                                          marginLeft:
                                                                              '-6px',
                                                                      }
                                                                    : undefined
                                                            }
                                                        >
                                                            {reaction.emoji}
                                                        </span>
                                                    ),
                                                )}
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            side="bottom"
                                            align={
                                                message.isMine ? 'start' : 'end'
                                            }
                                            className="w-56 p-2"
                                        >
                                            <ul className="flex flex-col gap-1.5">
                                                {message.reactions.map(
                                                    (reaction) => (
                                                        <li
                                                            key={
                                                                reaction.userId
                                                            }
                                                            className="flex items-center justify-between gap-3 text-sm"
                                                        >
                                                            <span className="min-w-0 truncate">
                                                                {
                                                                    reaction.userName
                                                                }
                                                                {reaction.userId ===
                                                                    authUserId &&
                                                                    ' (Tú)'}
                                                            </span>
                                                            <span className="shrink-0 text-lg leading-none">
                                                                {reaction.emoji}
                                                            </span>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        </PopoverContent>
                                    </Popover>
                                )}

                            {message.isDeleted && (
                                <p
                                    className={`flex items-center gap-1.5 text-sm italic opacity-70 ${message.isMine ? 'text-[var(--bubble-sent-foreground)]' : 'text-[var(--bubble-received-foreground)]'}`}
                                >
                                    <Trash2 className="size-3.5" />
                                    Mensaje eliminado
                                </p>
                            )}

                            {/* Con media edge-to-edge, "Reenviado" se corre
                            DENTRO del pie (ver más abajo, junto al
                            cuerpo) — acá arriba de la burbuja no hay
                            superficie de color donde apoyarlo (pedido
                            explícito: "evitar esas esquinas [cuadradas]",
                            la imagen tiene que cubrir todo sin margen). */}
                            {!message.isDeleted &&
                                message.isForwarded &&
                                !hasEdgeToEdgeMedia && (
                                    // Línea informativa, sin acento de color (no
                                    // compite con la cita de respuesta, que sí
                                    // lo lleva) — mismo criterio que WhatsApp:
                                    // "Reenviado" antes que nada más del cuerpo,
                                    // SIN el nombre de quien reenvió (pedido
                                    // explícito).
                                    <p
                                        className={`mb-1 flex items-center gap-1 text-[11px] italic opacity-70 ${message.isMine ? 'text-[var(--bubble-sent-foreground)]' : 'text-[var(--bubble-received-foreground)]'}`}
                                    >
                                        <Forward className="size-3" />
                                        Reenviado
                                    </p>
                                )}

                            {!message.isDeleted &&
                                message.replyToId && (
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
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                            jumpToMessage(message.replyToId)
                                        }
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                jumpToMessage(
                                                    message.replyToId,
                                                );
                                            }
                                        }}
                                        className={`relative z-10 -mt-6 mb-1.5 max-w-[420px] cursor-pointer rounded-3xl border-l-[5px] bg-[#71717a] px-3 py-1.5 text-left text-xs shadow-sm transition-opacity hover:opacity-90 ${replyAccentColor}`}
                                    >
                                        <p className="line-clamp-1 font-bold break-words text-white">
                                            {message.replyToUserName}
                                        </p>
                                        <p className="line-clamp-1 break-words text-white/70">
                                            {message.replyToBody}
                                        </p>
                                    </div>
                                )}

                            {!message.isDeleted &&
                                message.attachments.length > 0 && (
                                    <div
                                        className={
                                            hasEdgeToEdgeMedia
                                                ? // Sólo las esquinas de ARRIBA
                                                  // redondean acá — las de abajo
                                                  // las pone el "pie" de texto,
                                                  // que SIEMPRE sigue
                                                  // inmediatamente después (con
                                                  // o sin caption).
                                                  'flex flex-col overflow-hidden rounded-t-3xl'
                                                : 'mb-1 flex max-w-[280px] flex-col gap-1.5'
                                        }
                                    >
                                        {message.attachments.map(
                                            (attachment) => (
                                                <MessageAttachment
                                                    key={attachment.id}
                                                    attachment={attachment}
                                                    fill={hasEdgeToEdgeMedia}
                                                    onReact={(emoji) =>
                                                        onReact(message, emoji)
                                                    }
                                                    onReply={() =>
                                                        onReply(message)
                                                    }
                                                    onForward={onForward}
                                                    onToggleSave={() =>
                                                        onToggleSave(message)
                                                    }
                                                    isSaved={message.isSaved}
                                                    onTogglePin={() =>
                                                        onTogglePin(message)
                                                    }
                                                    isPinned={isPinned}
                                                    onDelete={(scope) =>
                                                        onDelete(message, scope)
                                                    }
                                                    canDeleteEveryone={
                                                        message.isMine
                                                    }
                                                />
                                            ),
                                        )}
                                    </div>
                                )}

                            {/* Franja de nombre/tipo/peso — SÓLO para
                            documentos (pedido explícito: "para fotos y
                            video sólo el bloque reservado de mensajes",
                            esto no aplica ahí). Vive entre el media y el
                            pie, sin redondear nada propio (el media ya
                            redondeó arriba, el pie redondea abajo). */}
                            {!message.isDeleted &&
                                hasEdgeToEdgeMedia &&
                                message.attachments[0]?.type === 'document' &&
                                (() => {
                                    const doc = message.attachments[0];
                                    const { icon: DocIcon, color } =
                                        documentStyleFor(doc.originalName);
                                    const extension =
                                        doc.originalName
                                            .split('.')
                                            .pop()
                                            ?.toUpperCase() ?? '';

                                    return (
                                        <div
                                            className={`flex items-center gap-2 px-3 py-2 ${bubbleColor}`}
                                        >
                                            <span
                                                className="flex size-7 shrink-0 items-center justify-center rounded-md"
                                                style={{
                                                    backgroundColor: `${color}26`,
                                                    color,
                                                }}
                                            >
                                                <DocIcon className="size-3.5" />
                                            </span>
                                            <div className="min-w-0 flex-1 leading-tight">
                                                <p className="truncate text-xs font-medium">
                                                    {doc.originalName}
                                                </p>
                                                <p className="text-[10px] opacity-70">
                                                    {extension} ·{' '}
                                                    {formatFileSize(
                                                        doc.sizeBytes,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                            {/* max-w fijo en px (no %): el wrapper interno de
                    ScrollArea (Radix) mide contenido con un
                    `display:table`, que crece sin límite frente a texto
                    sin espacios — un % no lo frena porque la tabla no
                    tiene ancho definido a priori, un px sí. div (no p):
                    el Markdown ligero de la barra de formato puede
                    producir hijos de bloque (cita, lista) — meterlos
                    dentro de un <p> es HTML inválido (el navegador
                    cierra el <p> solo, apenas encuentra un bloque
                    adentro). Vacío (mensaje de sólo adjunto) no
                    renderiza nada — sin este chequeo quedaba un hueco
                    de padding fantasma debajo de la foto/archivo. */}
                            {!message.isDeleted &&
                                hasEdgeToEdgeMedia && (
                                    // "Pie" de color debajo del media edge-to-
                                    // edge — SIEMPRE existe, tenga o no caption
                                    // (pedido explícito: "espacio para mensaje
                                    // o vacío, igual debe existir"), tomando
                                    // las esquinas INFERIORES de la burbuja
                                    // (las de arriba ya las tomó el media).
                                    // w-full (no max-w-[420px]): pedido
                                    // explícito, "siempre se debe pintar del
                                    // ancho de la burbuja" — el ancho real de
                                    // la burbuja lo define la imagen (su
                                    // hermano de arriba en este mismo flex-col),
                                    // este pie sólo tiene que igualarlo, no
                                    // imponer su propio tope independiente.
                                    // Vacío: franja mínima (sólo lo que
                                    // necesita el pico para apoyarse) — más
                                    // amplio SÓLO cuando de verdad hay
                                    // caption/"Reenviado" que mostrar,
                                    // pedido explícito: "al estar vacío...
                                    // debe ser menor, sólo será más amplio
                                    // cuando venga mensaje".
                                    <div
                                        className={`w-full rounded-b-3xl px-3 break-words ${message.body || message.isForwarded ? 'py-2' : 'py-1.5'} ${bubbleColor} ${
                                            isLastInGroup
                                                ? message.isMine
                                                    ? 'rounded-br-none'
                                                    : 'rounded-bl-none'
                                                : ''
                                        }`}
                                    >
                                        {message.isForwarded && (
                                            <p className="mb-1 flex items-center gap-1 text-[11px] italic opacity-70">
                                                <Forward className="size-3" />
                                                Reenviado
                                            </p>
                                        )}
                                        {message.body &&
                                            renderMessageBody(
                                                message.body,
                                                message.isMine,
                                            )}
                                    </div>
                                )}
                            {!message.isDeleted &&
                                !hasEdgeToEdgeMedia &&
                                message.body && (
                                    <div className="max-w-[420px] break-words">
                                        {renderMessageBody(
                                            message.body,
                                            message.isMine,
                                        )}
                                    </div>
                                )}
                        </div>

                        {/* Acciones: AL OPUESTO de la burbuja (mismo
                        flex-row-reverse de arriba las separa del lado
                        del avatar), centradas contra la ALTURA DE LA
                        BURBUJA (items-center de la fila de arriba), no
                        contra el avatar ni el hora-read. Siempre
                        visibles, nunca por hover (en móvil no hay
                        mouse). Las reacciones YA NO viven acá — pedido
                        explícito: van superpuestas en la esquina de la
                        burbuja (badge), ver más abajo dentro del propio
                        div de la burbuja. */}
                        {!message.isDeleted && (
                            <div className="flex shrink-0 flex-col items-center gap-1">
                                <div className="flex items-center gap-0.5">
                                    <BubbleActionButton
                                        icon={Reply}
                                        label="Responder"
                                        onClick={() => onReply(message)}
                                    />
                                    <BubbleReactionPickerButton
                                        onPick={(emoji) =>
                                            onReact(message, emoji)
                                        }
                                    />
                                    <BubbleActionButton
                                        icon={Forward}
                                        label="Reenviar"
                                        onClick={onForward}
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label="Más opciones"
                                                className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground flex size-6 items-center justify-center rounded-full transition-colors"
                                            >
                                                <MoreHorizontal className="size-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align={
                                                message.isMine ? 'end' : 'start'
                                            }
                                        >
                                            {/* Copiar sólo tiene sentido para
                                            texto — un adjunto se reenvía
                                            completo o se descarga y se
                                            envía de nuevo, pedido
                                            explícito: "no debe tener
                                            copiar". */}
                                            {message.attachments.length ===
                                                0 && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        onCopy(message)
                                                    }
                                                >
                                                    <Copy className="size-4" />
                                                    Copiar texto
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    onToggleSave(message)
                                                }
                                            >
                                                {message.isSaved ? (
                                                    <BookmarkCheck className="size-4" />
                                                ) : (
                                                    <Bookmark className="size-4" />
                                                )}
                                                {message.isSaved
                                                    ? 'Quitar de guardados'
                                                    : 'Guardar mensaje'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    onTogglePin(message)
                                                }
                                            >
                                                {isPinned ? (
                                                    <PinOff className="size-4" />
                                                ) : (
                                                    <Pin className="size-4" />
                                                )}
                                                {isPinned
                                                    ? 'Desfijar mensaje'
                                                    : 'Fijar mensaje'}
                                            </DropdownMenuItem>
                                            {canEdit && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        onEdit(message)
                                                    }
                                                >
                                                    <Pencil className="size-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    onDelete(message, 'me')
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                                Eliminar para mí
                                            </DropdownMenuItem>
                                            {message.isMine && (
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    onClick={() =>
                                                        onDelete(
                                                            message,
                                                            'everyone',
                                                        )
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                    Eliminar para todos
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Hora + estado, simple — debajo de la burbuja, no de
                    la fila [burbuja+acciones] de arriba. */}
                    <div
                        className={`text-muted-foreground mt-1.5 flex items-center gap-1 text-[10px] ${message.isMine ? 'justify-end pr-2' : 'justify-start pl-2'}`}
                    >
                        <span>{formatBubbleTime(message.createdAt)}</span>
                        {message.editedAt && (
                            <span className="italic opacity-70">Editado</span>
                        )}
                        {isPinned && <Pin className="size-3 fill-current" />}
                        <MessageStatus message={message} />
                    </div>
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
