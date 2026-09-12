import { Link, router, usePage } from '@inertiajs/react';
import { ArchiveRestore, Plus } from 'lucide-react';
import { NewConversationModal } from '@/components/new-conversation-modal';
import { PresenceDot } from '@/components/presence-dot';
import { ThemeToggle } from '@/components/theme-toggle';
import { show as showMessage } from '@/routes/messages';
import { toggleArchive } from '@/routes/conversations';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import type { RailModuleKey } from '@/components/curved-nav-rail';
import type { ConversationSummary } from '@/types/conversations';

type Props = {
    activeModule: RailModuleKey;
    /** Título del módulo activo en la mini-sidebar curva (reemplaza el logo/team-switcher, que ahora viven en el ícono de esa mini-sidebar). */
    activeModuleLabel: string;
};

/**
 * Fila de título de cada módulo de la sidebar expandida. Sólo el título
 * cambia según el módulo activo — el toggle de tema y el botón de nuevo
 * chat están SIEMPRE acá, sin importar en qué módulo estés, para poder
 * arrancar una conversación al toque desde cualquier parte.
 */
function SidebarModuleHeader({ title }: { title: string }) {
    return (
        <div className="relative z-10 flex h-8 items-center justify-between gap-2 px-2">
            <span className="truncate text-base font-semibold">{title}</span>
            <div className="flex shrink-0 items-center gap-1">
                <ThemeToggle />
                <NewConversationModal>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        aria-label="Nuevo chat"
                    >
                        <Plus className="size-4" />
                    </Button>
                </NewConversationModal>
            </div>
        </div>
    );
}

export function AppSidebar({ activeModule, activeModuleLabel }: Props) {
    if (activeModule === 'messages') {
        return <MessagesSidebarList activeModuleLabel={activeModuleLabel} />;
    }

    if (activeModule === 'activity') {
        return <ActivitySidebarList activeModuleLabel={activeModuleLabel} />;
    }

    if (activeModule === 'archived') {
        return <ArchivedSidebarList activeModuleLabel={activeModuleLabel} />;
    }

    return <HomeSidebarList activeModuleLabel={activeModuleLabel} />;
}

function HomeSidebarList({ activeModuleLabel }: { activeModuleLabel: string }) {
    const page = usePage();
    const conversations = page.props.conversations ?? [];
    const currentTeam = page.props.currentTeam;

    // "Inicio" = acceso rápido a tus chats recientes, mismo dato real
    // que Mensajes (nada quemado en pantalla) — de acá saltás directo a
    // la conversación.
    return (
        <Sidebar collapsible="none" variant="sidebar">
            <SidebarHeader>
                <SidebarModuleHeader title={activeModuleLabel} />
            </SidebarHeader>
            <SidebarContent>
                <ul className="sidebar-list">
                    {conversations.slice(0, 8).map((conversation) => (
                        <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            currentTeamSlug={currentTeam?.slug}
                        />
                    ))}

                    {conversations.length === 0 && (
                        <p className="text-muted-foreground px-2 text-sm">
                            No tienes conversaciones todavía.
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

    const row = (
        <li
            className={`sidebar-row${conversation.isCurrent ? ' sidebar-row--active' : ''}`}
        >
            <span
                className="sidebar-row-notch sidebar-row-notch--top"
                aria-hidden="true"
            />
            <span
                className="sidebar-row-notch sidebar-row-notch--bottom"
                aria-hidden="true"
            />
            <Link
                href={
                    currentTeamSlug
                        ? showMessage([currentTeamSlug, conversation.id]).url
                        : '#'
                }
                className={`sidebar-row-link${showUnarchive ? ' sidebar-row-link--actionable' : ''}`}
            >
                <span className="relative mr-3 inline-flex shrink-0">
                    <Avatar className="size-7">
                        {conversation.avatar && (
                            <AvatarImage
                                src={conversation.avatar}
                                alt={conversation.name}
                            />
                        )}
                        <AvatarFallback className="bg-[var(--sidebar-accent)] text-[10px] text-[var(--sidebar-accent-foreground)]">
                            {getInitials(conversation.name)}
                        </AvatarFallback>
                    </Avatar>
                    {conversation.presence && (
                        <PresenceDot presence={conversation.presence} />
                    )}
                </span>
                <span className="sidebar-row-label flex-1 truncate">
                    {conversation.name}
                </span>
                {conversation.unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="ml-2 h-5 min-w-5 shrink-0 justify-center rounded-full px-1 text-[10px]"
                    >
                        {conversation.unreadCount}
                    </Badge>
                )}
            </Link>
            {showUnarchive && currentTeamSlug && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Desarchivar"
                            className="sidebar-row-action text-muted-foreground hover:text-foreground rounded p-1"
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
        <Sidebar collapsible="none" variant="sidebar">
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
                        <p className="text-muted-foreground px-2 text-sm">
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
        <Sidebar collapsible="none" variant="sidebar">
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
                        <p className="text-muted-foreground px-2 text-sm">
                            No tienes conversaciones archivadas.
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
        <Sidebar collapsible="none" variant="sidebar">
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
                        <p className="text-muted-foreground px-2 text-sm">
                            Sin actividad reciente.
                        </p>
                    )}
                </ul>
            </SidebarContent>
        </Sidebar>
    );
}
