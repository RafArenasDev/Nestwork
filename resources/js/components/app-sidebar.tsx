import { router, usePage } from '@inertiajs/react';
import { ArchiveRestore, Bookmark, Plus, Star } from 'lucide-react';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { NewConversationModal } from '@/components/new-conversation-modal';
import { NewGroupModal } from '@/components/new-group-modal';
import { NewChannelModal } from '@/components/new-channel-modal';
import { PresenceDot } from '@/components/presence-dot';
import { show as showMessage } from '@/routes/messages';
import { toggle as toggleSaveRoute } from '@/routes/messages/save';
import { toggleArchive, toggleFavorite } from '@/routes/conversations';
import { join as joinChannel } from '@/routes/channels';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { useLivePresence } from '@/hooks/use-live-presence';
import { useOpenConversationUnseen } from '@/hooks/use-open-conversation-unseen';
import { csrfHeaders } from '@/lib/csrf';
import type { RailModuleKey } from '@/components/curved-nav-rail';
import type {
    ConversationSummary,
    SavedMessageSummary,
} from '@/types/conversations';

type Props = {
    activeModule: RailModuleKey;
    /** Título del módulo activo en la mini-sidebar curva (reemplaza el logo/team-switcher, que ahora viven en el ícono de esa mini-sidebar). */
    activeModuleLabel: string;
};

/** Panel base compartido por las 5 listas (Inicio/Mensajes/Archivo/
 *  Guardados/Actividad): fondo --bg-elevated — chrome fijo oscuro,
 *  igual en los dos temas (sólo el contenido sigue el tema), separado
 *  del contenido con un hairline en vez del truco de gotera de antes. */
const SIDEBAR_PANEL_CLASS = 'bg-[var(--bg-elevated)] sidebar-panel';

/** Capa de tinte de color (personalización, ver settings-modal) —
 *  siempre presente, transparente ("Ninguno") si no hay preset
 *  elegido — la sidebar igual conserva su tono base fijo. */
function SidebarTintLayer() {
    return <div className="sidebar-tint-layer" aria-hidden="true" />;
}

/**
 * Header de cada módulo de la sidebar expandida: sólo título + botón de
 * nuevo chat — el buscador se unificó en uno solo, siempre visible en
 * el header del CONTENIDO (ver global-search-bar.tsx), no acá. El
 * toggle de tema vive SOLO en el modal de Ajustes (dropdown del
 * avatar) — dos controles para lo mismo era redundante.
 */
function SidebarModuleHeader({
    title,
    createLabel = 'Nuevo chat',
    CreateModal = NewConversationModal,
}: {
    title: string;
    createLabel?: string;
    /** Grupos/Canales usan su propio modal de creación — Home/Chats/
     *  Actividad/Archivo/Guardados siguen compartiendo "Nuevo chat"
     *  (arranca un DM o, si eliges varios, un minichat). */
    CreateModal?: (props: PropsWithChildren) => React.JSX.Element;
}) {
    return (
        <div className="relative z-10 flex h-8 items-center justify-between gap-2 px-3 pt-[21px] pb-3">
            <span className="truncate text-lg font-semibold tracking-tight">
                {title}
            </span>
            <CreateModal>
                <button
                    type="button"
                    aria-label={createLabel}
                    className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[var(--sidebar-hairline)] bg-white/5 text-[var(--sidebar-fg-muted)] transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-[var(--sidebar-fg)] active:scale-90"
                >
                    <Plus className="size-4" />
                </button>
            </CreateModal>
        </div>
    );
}

/** Hora si es hoy, "Ayer", o fecha corta — mismo criterio que
 *  WhatsApp/Telegram para la hora de la fila de una conversación. */
function formatSidebarTime(iso: string): string {
    const date = new Date(iso);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('es-CO', {
            hour: 'numeric',
            minute: '2-digit',
        });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
        return 'Ayer';
    }

    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export function AppSidebar({ activeModule, activeModuleLabel }: Props) {
    if (activeModule === 'messages') {
        return <MessagesSidebarList activeModuleLabel={activeModuleLabel} />;
    }

    if (activeModule === 'groups') {
        return <GroupsSidebarList activeModuleLabel={activeModuleLabel} />;
    }

    if (activeModule === 'channels') {
        return <ChannelsSidebarList activeModuleLabel={activeModuleLabel} />;
    }

    if (activeModule === 'meetings') {
        return <MeetingsSidebarList activeModuleLabel={activeModuleLabel} />;
    }

    if (activeModule === 'activity') {
        return <ActivitySidebarList activeModuleLabel={activeModuleLabel} />;
    }

    if (activeModule === 'archived') {
        return <ArchivedSidebarList activeModuleLabel={activeModuleLabel} />;
    }

    if (activeModule === 'saved') {
        return (
            <SavedMessagesSidebarList activeModuleLabel={activeModuleLabel} />
        );
    }

    return <HomeSidebarList activeModuleLabel={activeModuleLabel} />;
}

function HomeSidebarList({ activeModuleLabel }: { activeModuleLabel: string }) {
    const page = usePage();
    const favoriteConversations = page.props.favoriteConversations ?? [];
    const currentTeam = page.props.currentTeam;

    // "Inicio" = tus accesos fijados (favoritos), NO la misma lista
    // completa que Chats — antes mostraba exactamente lo mismo que
    // Mensajes recortado a 8, lo que hacía redundantes los dos
    // módulos. Marca cualquier chat/grupo/canal con la estrella de su
    // fila para que aparezca acá.
    return (
        <Sidebar
            collapsible="none"
            variant="sidebar"
            className={SIDEBAR_PANEL_CLASS}
        >
            <SidebarTintLayer />
            <SidebarHeader>
                <SidebarModuleHeader title={activeModuleLabel} />
            </SidebarHeader>
            <SidebarContent>
                <ul className="sidebar-list">
                    {favoriteConversations.map((conversation) => (
                        <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            currentTeamSlug={currentTeam?.slug}
                        />
                    ))}

                    {favoriteConversations.length === 0 && (
                        <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                            Marca la estrella de un chat, grupo o canal para
                            fijarlo acá.
                        </p>
                    )}
                </ul>
            </SidebarContent>
        </Sidebar>
    );
}

/** Qué contarle al usuario sobre esta conversación en el tooltip de
 *  Actividad — real, a partir del mismo dato que ya tenemos. */
function activitySummary(conversation: ConversationSummary): string {
    if (conversation.unreadCount > 1) {
        return `Tienes ${conversation.unreadCount} mensajes sin leer`;
    }

    if (conversation.unreadCount === 1) {
        return conversation.lastMessageBody
            ? `Nuevo mensaje: "${conversation.lastMessageBody}"`
            : 'Tienes 1 mensaje sin leer';
    }

    return conversation.lastMessageBody
        ? `Último mensaje: "${conversation.lastMessageBody}"`
        : 'Sin mensajes nuevos';
}

function ConversationRow({
    conversation,
    currentTeamSlug,
    showUnarchive = false,
    tooltip,
}: {
    conversation: ConversationSummary;
    currentTeamSlug: string | undefined;
    /** Sólo en Archivado: desarchivar sin tener que abrir el chat. */
    showUnarchive?: boolean;
    /** Sólo en Actividad: qué pasó, sin agregar una segunda línea a la
     *  fila (la altura del pill de la gotera nunca cambia). */
    tooltip?: string;
}) {
    const getInitials = useInitials();
    const openUnseen = useOpenConversationUnseen();
    // Mientras este chat está abierto y seleccionado, Thread ya sabe en
    // el momento cuántos mensajes sin leer hay (mismo número del botón
    // flotante "N mensajes nuevos") — se usa ese en vez del que trae el
    // prop, que sólo se actualiza tras un viaje de ida y vuelta al
    // backend.
    const unreadCount =
        conversation.isCurrent && openUnseen.conversationId === conversation.id
            ? openUnseen.count
            : conversation.unreadCount;

    const live = useLivePresence(conversation.otherUserId, conversation);

    const row = (
        <li
            className={`sidebar-row${conversation.isCurrent ? ' sidebar-row--active' : ''}`}
        >
            <button
                type="button"
                onClick={() => {
                    if (!currentTeamSlug) {
                        return;
                    }

                    // router.visit + preserveUrl en vez de <Link>: abre
                    // el chat como modal sin nunca navegar a
                    // "/messages/{id}" — la barra de direcciones se
                    // queda en "/messages" (pedido explícito: nada de
                    // IDs de conversación expuestos en la URL).
                    router.visit(
                        showMessage([currentTeamSlug, conversation.id]).url,
                        {
                            preserveUrl: true,
                            preserveScroll: true,
                            only: [
                                'conversation',
                                'messages',
                                'conversations',
                                'archivedConversations',
                            ],
                        },
                    );
                }}
                className={`sidebar-row-link${showUnarchive ? ' sidebar-row-link--actionable' : ''}`}
            >
                <span className="relative inline-flex shrink-0">
                    <Avatar className="size-9">
                        {conversation.avatar && (
                            <AvatarImage
                                src={conversation.avatar}
                                alt={conversation.name}
                            />
                        )}
                        <AvatarFallback className="bg-[var(--sidebar-accent)] text-[11px] text-[var(--sidebar-accent-foreground)]">
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
                            <TooltipContent side="right">
                                {live.statusText}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                        <span className="sidebar-row-label">
                            {conversation.name}
                        </span>
                        {conversation.lastMessageAt && (
                            <span className="sidebar-row-time">
                                {formatSidebarTime(conversation.lastMessageAt)}
                            </span>
                        )}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                        <span className="sidebar-row-preview">
                            {conversation.lastMessageBody ?? ' '}
                        </span>
                        {unreadCount > 0 && (
                            <Badge
                                variant="destructive"
                                // Rojo fijo, no la variable --destructive
                                // (que cambia de tono entre temas) — ver
                                // nota en curved-nav-rail.tsx.
                                className="h-4.5 min-w-4.5 shrink-0 justify-center rounded-full bg-[oklch(0.577_0.245_27.325)] px-1 text-[10px] dark:bg-[oklch(0.577_0.245_27.325)]"
                            >
                                {unreadCount}
                            </Badge>
                        )}
                    </span>
                </span>
            </button>
            {currentTeamSlug && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label={
                                conversation.isFavorite
                                    ? 'Quitar de Inicio'
                                    : 'Fijar en Inicio'
                            }
                            className={`sidebar-row-action rounded-full p-1 transition-colors hover:bg-white/10 ${
                                conversation.isFavorite
                                    ? 'text-amber-400'
                                    : 'text-[var(--sidebar-fg-muted)] hover:text-[var(--sidebar-fg)]'
                            }`}
                            onClick={() =>
                                router.patch(
                                    toggleFavorite([
                                        currentTeamSlug,
                                        conversation.id,
                                    ]).url,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <Star
                                className="size-3.5"
                                fill={
                                    conversation.isFavorite
                                        ? 'currentColor'
                                        : 'none'
                                }
                            />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        {conversation.isFavorite
                            ? 'Quitar de Inicio'
                            : 'Fijar en Inicio'}
                    </TooltipContent>
                </Tooltip>
            )}
            {showUnarchive && currentTeamSlug && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Desarchivar"
                            // Tokens de tema (no blanco fijo): la sidebar de
                            // conversaciones ahora sigue el tema (--bg-elevated,
                            // ver sidebar-list.css), ya no es oscura fija.
                            className="sidebar-row-action rounded-full p-1 text-[var(--sidebar-fg-muted)] transition-colors hover:bg-white/10 hover:text-[var(--sidebar-fg)]"
                            onClick={() =>
                                router.patch(
                                    toggleArchive([
                                        currentTeamSlug,
                                        conversation.id,
                                    ]).url,
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <ArchiveRestore className="size-3.5" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Desarchivar</TooltipContent>
                </Tooltip>
            )}
        </li>
    );

    if (!tooltip) {
        return row;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{row}</TooltipTrigger>
            <TooltipContent side="right">{tooltip}</TooltipContent>
        </Tooltip>
    );
}

function MessagesSidebarList({
    activeModuleLabel,
}: {
    activeModuleLabel: string;
}) {
    const page = usePage();
    const conversations = page.props.conversations ?? [];
    const currentTeam = page.props.currentTeam;

    return (
        <Sidebar
            collapsible="none"
            variant="sidebar"
            className={SIDEBAR_PANEL_CLASS}
        >
            <SidebarTintLayer />
            <SidebarHeader>
                <SidebarModuleHeader title={activeModuleLabel} />
            </SidebarHeader>

            <SidebarContent>
                <ul className="sidebar-list">
                    {conversations.map((conversation) => (
                        <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            currentTeamSlug={currentTeam?.slug}
                        />
                    ))}

                    {conversations.length === 0 && (
                        <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                            No tienes conversaciones todavía.
                        </p>
                    )}
                </ul>
            </SidebarContent>
        </Sidebar>
    );
}

function ArchivedSidebarList({
    activeModuleLabel,
}: {
    activeModuleLabel: string;
}) {
    const page = usePage();
    const archivedConversations = page.props.archivedConversations ?? [];
    const currentTeam = page.props.currentTeam;

    return (
        <Sidebar
            collapsible="none"
            variant="sidebar"
            className={SIDEBAR_PANEL_CLASS}
        >
            <SidebarTintLayer />
            <SidebarHeader>
                <SidebarModuleHeader title={activeModuleLabel} />
            </SidebarHeader>

            <SidebarContent>
                <ul className="sidebar-list">
                    {archivedConversations.map((conversation) => (
                        <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            currentTeamSlug={currentTeam?.slug}
                            showUnarchive
                        />
                    ))}

                    {archivedConversations.length === 0 && (
                        <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                            No tienes conversaciones archivadas.
                        </p>
                    )}
                </ul>
            </SidebarContent>
        </Sidebar>
    );
}

function GroupsSidebarList({
    activeModuleLabel,
}: {
    activeModuleLabel: string;
}) {
    const page = usePage();
    const groupConversations = page.props.groupConversations ?? [];
    const currentTeam = page.props.currentTeam;

    return (
        <Sidebar
            collapsible="none"
            variant="sidebar"
            className={SIDEBAR_PANEL_CLASS}
        >
            <SidebarTintLayer />
            <SidebarHeader>
                <SidebarModuleHeader
                    title={activeModuleLabel}
                    createLabel="Nuevo grupo"
                    CreateModal={NewGroupModal}
                />
            </SidebarHeader>

            <SidebarContent>
                <ul className="sidebar-list">
                    {groupConversations.map((conversation) => (
                        <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            currentTeamSlug={currentTeam?.slug}
                        />
                    ))}

                    {groupConversations.length === 0 && (
                        <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                            Todavía no perteneces a ningún grupo. Crea uno con
                            el botón de arriba.
                        </p>
                    )}
                </ul>
            </SidebarContent>
        </Sidebar>
    );
}

function ChannelsSidebarList({
    activeModuleLabel,
}: {
    activeModuleLabel: string;
}) {
    const page = usePage();
    const channelConversations = page.props.channelConversations ?? [];
    const discoverableChannels = page.props.discoverableChannels ?? [];
    const currentTeam = page.props.currentTeam;

    return (
        <Sidebar
            collapsible="none"
            variant="sidebar"
            className={SIDEBAR_PANEL_CLASS}
        >
            <SidebarTintLayer />
            <SidebarHeader>
                <SidebarModuleHeader
                    title={activeModuleLabel}
                    createLabel="Nuevo canal"
                    CreateModal={NewChannelModal}
                />
            </SidebarHeader>

            <SidebarContent>
                <ul className="sidebar-list">
                    {channelConversations.map((conversation) => (
                        <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            currentTeamSlug={currentTeam?.slug}
                        />
                    ))}

                    {channelConversations.length === 0 && (
                        <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                            Todavía no te uniste a ningún canal.
                        </p>
                    )}
                </ul>

                {discoverableChannels.length > 0 && (
                    <div className="mt-2">
                        <p className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide uppercase">
                            Descubrir
                        </p>
                        <ul className="sidebar-list">
                            {discoverableChannels.map((channel) => (
                                <li key={channel.id} className="sidebar-row">
                                    <button
                                        type="button"
                                        className="sidebar-row-link"
                                        onClick={() => {
                                            if (!currentTeam) {
                                                return;
                                            }

                                            router.post(
                                                joinChannel([
                                                    currentTeam.slug,
                                                    channel.id,
                                                ]).url,
                                            );
                                        }}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="sidebar-row-label">
                                                {channel.name}
                                            </span>
                                            <span className="sidebar-row-preview">
                                                {channel.memberCount ?? 0}{' '}
                                                miembros — unirse
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </SidebarContent>
        </Sidebar>
    );
}

/** Reuniones/videollamadas — pedido explícito, sin backend todavía
 *  (WebRTC/SFU real es infraestructura nueva grande, ver PENDING-WORK.md).
 *  Módulo visual completo para que la navegación ya muestre todo lo
 *  que la app va a tener, marcado como pendiente en vez de ausente. */
function MeetingsSidebarList({
    activeModuleLabel,
}: {
    activeModuleLabel: string;
}) {
    return (
        <Sidebar
            collapsible="none"
            variant="sidebar"
            className={SIDEBAR_PANEL_CLASS}
        >
            <SidebarTintLayer />
            <SidebarHeader>
                <div className="relative z-10 flex h-8 items-center px-3 pt-[21px] pb-3">
                    <span className="truncate text-lg font-semibold tracking-tight">
                        {activeModuleLabel}
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <p className="px-3 text-sm text-[var(--sidebar-fg-muted)]">
                    Las videollamadas todavía no están disponibles — próxima
                    novedad grande de Nestwork.
                </p>
            </SidebarContent>
        </Sidebar>
    );
}

function relativeSavedLabel(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const isSameDay = date.toDateString() === now.toDateString();

    if (isSameDay) {
        return date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
        return 'ayer';
    }

    return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
    });
}

function SavedMessageRow({
    saved,
    currentTeamSlug,
    onUnsave,
}: {
    saved: SavedMessageSummary;
    currentTeamSlug: string | undefined;
    onUnsave: (saved: SavedMessageSummary) => void;
}) {
    const getInitials = useInitials();

    return (
        <li className="sidebar-row">
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        onClick={() => {
                            if (!currentTeamSlug) {
                                return;
                            }

                            // Mismo mecanismo que abrir cualquier chat
                            // (preserveUrl, ver ConversationRow) + `message`
                            // en la query para que el backend arme
                            // `jumpToMessageId` y Thread salte al mensaje
                            // puntual en vez de al fondo del historial.
                            router.visit(
                                showMessage(
                                    [currentTeamSlug, saved.conversationId],
                                    { query: { message: saved.messageId } },
                                ).url,
                                {
                                    preserveUrl: true,
                                    preserveScroll: true,
                                    only: [
                                        'conversation',
                                        'messages',
                                        'conversations',
                                        'archivedConversations',
                                        'jumpToMessageId',
                                    ],
                                },
                            );
                        }}
                        className="sidebar-row-link sidebar-row-link--actionable"
                    >
                        <Avatar className="size-8 shrink-0">
                            {saved.senderAvatar && (
                                <AvatarImage
                                    src={saved.senderAvatar}
                                    alt={saved.senderName}
                                />
                            )}
                            <AvatarFallback className="bg-[var(--sidebar-accent)] text-[10px] text-[var(--sidebar-accent-foreground)]">
                                {getInitials(saved.senderName)}
                            </AvatarFallback>
                        </Avatar>
                        {/* Una sola línea (misma altura fija de 42px que
                            cualquier fila del sidebar) — pedido implícito
                            por el propio sistema (ver comentarios de
                            sidebar-row-link en sidebar-list.css): "quién
                            dijo qué" cabe junto, el resto (conversación +
                            cuándo) va al tooltip, mismo criterio que ya
                            usa Actividad. */}
                        <span className="sidebar-row-label min-w-0 flex-1 truncate">
                            <span className="font-medium">
                                {saved.senderName}
                            </span>
                            <span className="text-[var(--sidebar-fg-muted)]">
                                : {saved.excerpt || '📎 Adjunto'}
                            </span>
                        </span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    {saved.conversationName} ·{' '}
                    {relativeSavedLabel(saved.savedAt)}
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label="Quitar de guardados"
                        className="sidebar-row-action rounded-full p-1 text-[var(--sidebar-fg-muted)] transition-colors hover:bg-white/10 hover:text-[var(--sidebar-fg)]"
                        onClick={(event) => {
                            event.stopPropagation();
                            onUnsave(saved);
                        }}
                    >
                        <Bookmark className="size-3.5 fill-current" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    Quitar de guardados
                </TooltipContent>
            </Tooltip>
        </li>
    );
}

function SavedMessagesSidebarList({
    activeModuleLabel,
}: {
    activeModuleLabel: string;
}) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const [savedMessages, setSavedMessages] = useState(
        page.props.savedMessages,
    );

    useEffect(() => {
        setSavedMessages(page.props.savedMessages);
    }, [page.props.savedMessages]);

    const handleUnsave = (saved: SavedMessageSummary) => {
        if (!currentTeam) {
            return;
        }

        setSavedMessages((previous) =>
            previous.filter((item) => item.messageId !== saved.messageId),
        );

        fetch(
            toggleSaveRoute([
                currentTeam.slug,
                saved.conversationId,
                saved.messageId,
            ]).url,
            { method: 'POST', headers: csrfHeaders() },
        ).catch(() => {
            // Silencioso — reintentar tocando el botón de nuevo alcanza.
        });
    };

    return (
        <Sidebar
            collapsible="none"
            variant="sidebar"
            className={SIDEBAR_PANEL_CLASS}
        >
            <SidebarTintLayer />
            <SidebarHeader>
                <SidebarModuleHeader title={activeModuleLabel} />
            </SidebarHeader>

            <SidebarContent>
                <ul className="sidebar-list">
                    {savedMessages.map((saved) => (
                        <SavedMessageRow
                            key={saved.messageId}
                            saved={saved}
                            currentTeamSlug={currentTeam?.slug}
                            onUnsave={handleUnsave}
                        />
                    ))}

                    {savedMessages.length === 0 && (
                        <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                            No has guardado ningún mensaje todavía.
                        </p>
                    )}
                </ul>
            </SidebarContent>
        </Sidebar>
    );
}

function ActivitySidebarList({
    activeModuleLabel,
}: {
    activeModuleLabel: string;
}) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;

    // "Actividad" = todas las conversaciones con al menos un mensaje,
    // más recientes primero (mismo orden que ya trae `conversations`) —
    // leer una NO la saca de la lista, sólo le apaga el badge. Dato
    // real, no una tabla nueva de eventos.
    const recentActivity = (page.props.conversations ?? []).filter(
        (conversation) => conversation.lastMessageAt !== null,
    );

    return (
        <Sidebar
            collapsible="none"
            variant="sidebar"
            className={SIDEBAR_PANEL_CLASS}
        >
            <SidebarTintLayer />
            <SidebarHeader>
                <SidebarModuleHeader title={activeModuleLabel} />
            </SidebarHeader>

            <SidebarContent>
                <ul className="sidebar-list">
                    {recentActivity.map((conversation) => (
                        <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            currentTeamSlug={currentTeam?.slug}
                            tooltip={activitySummary(conversation)}
                        />
                    ))}

                    {recentActivity.length === 0 && (
                        <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                            Sin actividad reciente.
                        </p>
                    )}
                </ul>
            </SidebarContent>
        </Sidebar>
    );
}
