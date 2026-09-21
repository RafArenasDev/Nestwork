import { router, usePage } from '@inertiajs/react';
import {
    ArchiveRestore,
    Archive,
    ArrowDownAZ,
    Bell,
    BellOff,
    Bookmark,
    Check,
    ChevronDown,
    Clock,
    Code2,
    Eraser,
    FileText,
    Image as ImageIcon,
    type LucideIcon,
    MailOpen,
    Music,
    Phone,
    Plus,
    Star,
    Trash2,
    Video,
} from 'lucide-react';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { NewConversationModal } from '@/components/new-conversation-modal';
import { NewGroupModal } from '@/components/new-group-modal';
import { NewChannelModal } from '@/components/new-channel-modal';
import { PresenceDot } from '@/components/presence-dot';
import {
    createConversationTag,
    deleteConversationTag,
    toggleConversationInTag,
    useConversationTags,
    type ConversationTag,
} from '@/hooks/use-conversation-tags';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { show as showMessage } from '@/routes/messages';
import { toggle as toggleSaveRoute } from '@/routes/messages/save';
import {
    clear as clearChat,
    markUnread,
    toggleArchive,
    toggleFavorite,
    toggleHidden,
    toggleMute,
} from '@/routes/conversations';
import { join as joinChannel } from '@/routes/channels';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { useLivePresence } from '@/hooks/use-live-presence';
import { useOpenConversationUnseen } from '@/hooks/use-open-conversation-unseen';
import { csrfHeaders } from '@/lib/csrf';
import { documentStyleFor } from '@/lib/file-type-style';
import type { RailModuleKey } from '@/components/curved-nav-rail';
import type {
    ActivityItem,
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

type MessagePreview = { icon: LucideIcon | null; text: string };

/** El body queda vacío cuando el mensaje es sólo un adjunto — sin esto
 *  la fila mostraba una segunda línea en blanco para fotos/videos/
 *  audios/documentos, en vez de decir qué se mandó (mismo criterio que
 *  WhatsApp/Telegram). Ícono real (lucide), no un emoji mezclado en el
 *  texto — un emoji unicode dentro del mismo nodo de texto quedaba más
 *  abajo que las letras según fuente/OS, se veía desalineado.
 *
 * Un bloque de código (```lang…```, ver serializeToMarkdown en
 * message-composer.tsx) se anuncia como "Código" en vez de mostrar las
 * comillas invertidas crudas — ilegible truncado a una sola línea. El
 * código en línea (`texto`) se limpia de sus comillas sueltas dentro
 * del preview normal. */
function messagePreviewFor(conversation: ConversationSummary): MessagePreview {
    switch (conversation.lastMessageType) {
        case 'image':
            return { icon: ImageIcon, text: 'Foto' };
        case 'video':
            return { icon: Video, text: 'Video' };
        case 'audio':
            return { icon: Music, text: 'Audio' };
        case 'file': {
            const name = conversation.lastMessageAttachmentName;

            return {
                icon: name ? documentStyleFor(name).icon : FileText,
                text: name ?? 'Documento',
            };
        }
        case 'call_log':
            return { icon: Phone, text: 'Llamada' };
        default: {
            const body = conversation.lastMessageBody?.trim() ?? '';

            if (body.startsWith('```')) {
                return { icon: Code2, text: 'Código' };
            }

            return {
                icon: null,
                text: body.replace(/`([^`]+)`/g, '$1') || ' ',
            };
        }
    }
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

/** Encabezado de subsección con orden (recientes/alfabético) y/o un
 *  botón "+" opcional — mismo estilo para Recientes/Grupos/Canales/
 *  Favoritos/Etiquetas en Inicio. */
function SidebarSectionLabel({
    children,
    sort,
    onSortChange,
    addTrigger,
    onRemoveSection,
}: {
    children: string;
    sort?: SortMode;
    onSortChange?: (mode: SortMode) => void;
    /** Botón "+" ya armado por quien llama (con su propio
     *  PopoverTrigger/DialogTrigger adentro) — así el trigger real de
     *  Radix queda anclado a un botón visible de verdad, no a un
     *  elemento invisible aparte controlado por estado externo (eso
     *  hacía que el popover se posicionara mal). */
    addTrigger?: React.ReactNode;
    onRemoveSection?: () => void;
}) {
    return (
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {children}
            </p>
            <div className="flex items-center gap-1">
                {sort && onSortChange && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label={
                                    sort === 'recent'
                                        ? 'Ordenar alfabéticamente'
                                        : 'Ordenar por más reciente'
                                }
                                onClick={() =>
                                    onSortChange(
                                        sort === 'recent' ? 'alpha' : 'recent',
                                    )
                                }
                                className="text-muted-foreground hover:text-foreground rounded p-0.5"
                            >
                                {sort === 'recent' ? (
                                    <Clock className="size-3.5" />
                                ) : (
                                    <ArrowDownAZ className="size-3.5" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {sort === 'recent'
                                ? 'Más reciente primero'
                                : 'Orden alfabético'}
                        </TooltipContent>
                    </Tooltip>
                )}
                {addTrigger}
                {onRemoveSection && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-label="Borrar etiqueta"
                                onClick={onRemoveSection}
                                className="text-muted-foreground hover:text-destructive rounded p-0.5"
                            >
                                <Trash2 className="size-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            Borrar etiqueta
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}

/** Botón "+" reusado por Favoritos/Etiquetas — SIEMPRE dentro de un
 *  <Popover> como PopoverTrigger real (ver nota en SidebarSectionLabel). */
function SectionAddButton({ label }: { label: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label={label}
                        className="text-muted-foreground hover:text-foreground rounded p-0.5"
                    >
                        <Plus className="size-3.5" />
                    </button>
                </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
    );
}

type SortMode = 'recent' | 'alpha';

function sortConversations(
    list: ConversationSummary[],
    mode: SortMode,
): ConversationSummary[] {
    if (mode === 'alpha') {
        return [...list].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
        );
    }

    // Ya vienen ordenadas por fecha desde el backend
    // (ListConversationsForUser::handle) — nada que hacer.
    return list;
}

/** Buscador + lista con check para agregar/quitar conversaciones de
 *  una sección curada a mano (Favoritos, una Etiqueta) — cruza los
 *  tres tipos (Chats/Grupos/Canales), a propósito: una etiqueta como
 *  "API-Chat" agrupa gente y grupos por igual. */
function SectionAddPicker({
    isSelected,
    onToggle,
}: {
    isSelected: (conversationId: number) => boolean;
    onToggle: (conversation: ConversationSummary) => void;
}) {
    const page = usePage();
    const [search, setSearch] = useState('');

    const candidates = [
        ...(page.props.conversations ?? []),
        ...(page.props.groupConversations ?? []),
        ...(page.props.channelConversations ?? []),
    ].filter((conversation) =>
        conversation.name.toLowerCase().includes(search.trim().toLowerCase()),
    );

    return (
        <PopoverContent className="w-72 p-2" align="start">
            <Input
                autoFocus
                placeholder="Buscar chat, grupo o canal…"
                className="mb-2 rounded-full"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            />
            <ScrollArea className="h-56">
                <ul className="flex flex-col gap-0.5 pr-2">
                    {candidates.map((conversation) => (
                        <li key={conversation.id}>
                            <button
                                type="button"
                                onClick={() => onToggle(conversation)}
                                className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                            >
                                <span className="flex-1 truncate">
                                    {conversation.name}
                                </span>
                                {isSelected(conversation.id) && (
                                    <Check className="size-3.5 shrink-0 text-emerald-500" />
                                )}
                            </button>
                        </li>
                    ))}

                    {candidates.length === 0 && (
                        <p className="text-muted-foreground px-2 py-4 text-center text-sm">
                            Nada con ese nombre.
                        </p>
                    )}
                </ul>
            </ScrollArea>
        </PopoverContent>
    );
}

function HomeSidebarList({ activeModuleLabel }: { activeModuleLabel: string }) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const tags = useConversationTags();
    const [sort, setSort] = useState<SortMode>('recent');
    const [newTagOpen, setNewTagOpen] = useState(false);
    const [newTagName, setNewTagName] = useState('');

    // Antes "Recientes" mezclaba chats/grupos/canales en una sola
    // lista ("melcocha", pedido explícito de separar) y repetía lo
    // que ya estuviera en Favoritos. Ahora cada tipo tiene su propia
    // sección, ninguna incluye lo ya fijado como favorito, y un tope
    // de 20 evita que la sidebar crezca sin límite — al llegar un
    // mensaje nuevo el más viejo sale solo (slice tras ordenar por
    // fecha, que es como ya vienen desde el backend).
    const RECENT_LIMIT = 20;
    const favoriteIds = new Set(
        (page.props.favoriteConversations ?? []).map((c) => c.id),
    );
    const recentChats = sortConversations(
        (page.props.conversations ?? []).filter((c) => !favoriteIds.has(c.id)),
        sort,
    ).slice(0, RECENT_LIMIT);
    const recentGroups = sortConversations(
        (page.props.groupConversations ?? []).filter(
            (c) => !favoriteIds.has(c.id),
        ),
        sort,
    ).slice(0, RECENT_LIMIT);
    const recentChannels = sortConversations(
        (page.props.channelConversations ?? []).filter(
            (c) => !favoriteIds.has(c.id),
        ),
        sort,
    ).slice(0, RECENT_LIMIT);
    const favoriteConversations = page.props.favoriteConversations ?? [];

    const allByid = new Map(
        [
            ...(page.props.conversations ?? []),
            ...(page.props.groupConversations ?? []),
            ...(page.props.channelConversations ?? []),
        ].map((c) => [c.id, c]),
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
                <SidebarSectionLabel sort={sort} onSortChange={setSort}>
                    Recientes
                </SidebarSectionLabel>
                <ul className="sidebar-list">
                    {recentChats.map((conversation) => (
                        <ConversationRow
                            key={conversation.id}
                            conversation={conversation}
                            currentTeamSlug={currentTeam?.slug}
                        />
                    ))}

                    {recentChats.length === 0 && (
                        <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                            Sin chats recientes todavía.
                        </p>
                    )}
                </ul>

                <Popover>
                    <SidebarSectionLabel
                        addTrigger={
                            <SectionAddButton label="Agregar a Favoritos" />
                        }
                    >
                        Favoritos
                    </SidebarSectionLabel>
                    <SectionAddPicker
                        isSelected={(id) => favoriteIds.has(id)}
                        onToggle={(conversation) => {
                            if (!currentTeam) {
                                return;
                            }

                            router.patch(
                                toggleFavorite([
                                    currentTeam.slug,
                                    conversation.id,
                                ]).url,
                                {},
                                { preserveScroll: true },
                            );
                        }}
                    />
                </Popover>
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
                            Nada fijado todavía — usa el "+" de arriba o el menú
                            de cualquier fila.
                        </p>
                    )}
                </ul>

                {recentGroups.length > 0 && (
                    <>
                        <SidebarSectionLabel sort={sort} onSortChange={setSort}>
                            Grupos recientes
                        </SidebarSectionLabel>
                        <ul className="sidebar-list">
                            {recentGroups.map((conversation) => (
                                <ConversationRow
                                    key={conversation.id}
                                    conversation={conversation}
                                    currentTeamSlug={currentTeam?.slug}
                                />
                            ))}
                        </ul>
                    </>
                )}

                {recentChannels.length > 0 && (
                    <>
                        <SidebarSectionLabel sort={sort} onSortChange={setSort}>
                            Canales recientes
                        </SidebarSectionLabel>
                        <ul className="sidebar-list">
                            {recentChannels.map((conversation) => (
                                <ConversationRow
                                    key={conversation.id}
                                    conversation={conversation}
                                    currentTeamSlug={currentTeam?.slug}
                                />
                            ))}
                        </ul>
                    </>
                )}

                <Dialog open={newTagOpen} onOpenChange={setNewTagOpen}>
                    <SidebarSectionLabel
                        addTrigger={
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <button
                                            type="button"
                                            aria-label="Nueva etiqueta"
                                            className="text-muted-foreground hover:text-foreground rounded p-0.5"
                                        >
                                            <Plus className="size-3.5" />
                                        </button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    Nueva etiqueta
                                </TooltipContent>
                            </Tooltip>
                        }
                    >
                        Etiquetas
                    </SidebarSectionLabel>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Nueva etiqueta</DialogTitle>
                            <DialogDescription>
                                Agrupa chats, grupos y canales bajo un nombre
                                propio — ej. "API-Chat" o "Frontend".
                            </DialogDescription>
                        </DialogHeader>
                        <Input
                            autoFocus
                            placeholder="Nombre de la etiqueta"
                            value={newTagName}
                            onChange={(event) =>
                                setNewTagName(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    createConversationTag(newTagName);
                                    setNewTagName('');
                                    setNewTagOpen(false);
                                }
                            }}
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                disabled={newTagName.trim() === ''}
                                onClick={() => {
                                    createConversationTag(newTagName);
                                    setNewTagName('');
                                    setNewTagOpen(false);
                                }}
                            >
                                Crear
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {tags.length === 0 && (
                    <p className="px-3 text-sm text-[var(--sidebar-fg-muted)]">
                        Sin etiquetas todavía — usa el "+" de arriba.
                    </p>
                )}

                {tags.map((tag) => {
                    const tagConversations = tag.conversationIds
                        .map((id) => allByid.get(id))
                        .filter(
                            (c): c is ConversationSummary => c !== undefined,
                        );

                    return (
                        <TagSection
                            key={tag.id}
                            tag={tag}
                            conversations={tagConversations}
                            currentTeamSlug={currentTeam?.slug}
                        />
                    );
                })}
            </SidebarContent>
        </Sidebar>
    );
}

function TagSection({
    tag,
    conversations,
    currentTeamSlug,
}: {
    tag: ConversationTag;
    conversations: ConversationSummary[];
    currentTeamSlug: string | undefined;
}) {
    return (
        <>
            <Popover>
                <SidebarSectionLabel
                    addTrigger={
                        <SectionAddButton label={`Agregar a ${tag.name}`} />
                    }
                    onRemoveSection={() => deleteConversationTag(tag.id)}
                >
                    {tag.name}
                </SidebarSectionLabel>
                <SectionAddPicker
                    isSelected={(id) => tag.conversationIds.includes(id)}
                    onToggle={(conversation) =>
                        toggleConversationInTag(tag.id, conversation.id)
                    }
                />
            </Popover>
            <ul className="sidebar-list">
                {conversations.map((conversation) => (
                    <ConversationRow
                        key={conversation.id}
                        conversation={conversation}
                        currentTeamSlug={currentTeamSlug}
                    />
                ))}

                {conversations.length === 0 && (
                    <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                        Vacía todavía — usa el "+" de arriba.
                    </p>
                )}
            </ul>
        </>
    );
}

/** Menú de opciones de una fila (favorito/archivar/silenciar/limpiar/
 *  eliminar) — antes era un ícono de estrella siempre visible, mal
 *  posicionado (centrado en toda la fila, se veía encimado con la hora
 *  y con el badge de no-leídos). Ahora vive en el mismo cupo que la
 *  hora: la hora se ve por defecto, el chevron aparece al pasar el
 *  mouse (o si el menú sigue abierto) y la reemplaza en el mismo
 *  lugar, en vez de flotar encima. */
function ConversationRowMenu({
    conversation,
    currentTeamSlug,
    showUnarchive,
    onOpenChange,
}: {
    conversation: ConversationSummary;
    currentTeamSlug: string;
    showUnarchive: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [confirmAction, setConfirmAction] = useState<
        'clear' | 'delete' | null
    >(null);

    const patch = (url: string) =>
        router.patch(url, {}, { preserveScroll: true });

    return (
        <>
            <DropdownMenu onOpenChange={onOpenChange}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label="Más opciones"
                        className="text-[var(--sidebar-fg-muted)] transition-colors hover:text-[var(--sidebar-fg)]"
                    >
                        <ChevronDown className="size-3.5" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                        onClick={() =>
                            patch(
                                toggleFavorite([
                                    currentTeamSlug,
                                    conversation.id,
                                ]).url,
                            )
                        }
                    >
                        <Star
                            className={
                                conversation.isFavorite ? 'text-amber-400' : ''
                            }
                            fill={
                                conversation.isFavorite
                                    ? 'currentColor'
                                    : 'none'
                            }
                        />
                        {conversation.isFavorite
                            ? 'Quitar de favoritos'
                            : 'Agregar a favoritos'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() =>
                            patch(
                                markUnread([currentTeamSlug, conversation.id])
                                    .url,
                            )
                        }
                    >
                        <MailOpen />
                        Marcar como no leído
                    </DropdownMenuItem>
                    {showUnarchive ? (
                        <DropdownMenuItem
                            onClick={() =>
                                patch(
                                    toggleArchive([
                                        currentTeamSlug,
                                        conversation.id,
                                    ]).url,
                                )
                            }
                        >
                            <ArchiveRestore />
                            Desarchivar
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem
                            onClick={() =>
                                patch(
                                    toggleArchive([
                                        currentTeamSlug,
                                        conversation.id,
                                    ]).url,
                                )
                            }
                        >
                            <Archive />
                            Archivar
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                        onClick={() =>
                            patch(
                                toggleMute([currentTeamSlug, conversation.id])
                                    .url,
                            )
                        }
                    >
                        {conversation.isMuted ? <Bell /> : <BellOff />}
                        {conversation.isMuted
                            ? 'Activar notificaciones'
                            : 'Silenciar'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setConfirmAction('clear')}
                    >
                        <Eraser />
                        Limpiar chat
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setConfirmAction('delete')}
                    >
                        <Trash2 />
                        Eliminar chat
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
                                : 'La conversación desaparece de tu lista hasta que la busques a propósito, y tu historial hasta ahora se oculta contigo. No se borra ningún mensaje ni afecta a los demás.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        {confirmAction === 'clear' ? (
                            <>
                                <AlertDialogAction
                                    onClick={() => {
                                        router.patch(
                                            clearChat([
                                                currentTeamSlug,
                                                conversation.id,
                                            ]).url,
                                            { scope: 'today' },
                                            { preserveScroll: true },
                                        );
                                        setConfirmAction(null);
                                    }}
                                >
                                    Solo hoy
                                </AlertDialogAction>
                                <AlertDialogAction
                                    onClick={() => {
                                        router.patch(
                                            clearChat([
                                                currentTeamSlug,
                                                conversation.id,
                                            ]).url,
                                            { scope: 'all' },
                                            { preserveScroll: true },
                                        );
                                        setConfirmAction(null);
                                    }}
                                >
                                    Todo el historial
                                </AlertDialogAction>
                            </>
                        ) : (
                            <AlertDialogAction
                                onClick={() => {
                                    router.patch(
                                        toggleHidden([
                                            currentTeamSlug,
                                            conversation.id,
                                        ]).url,
                                    );
                                    setConfirmAction(null);
                                }}
                            >
                                Eliminar
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function ConversationRow({
    conversation,
    currentTeamSlug,
    showUnarchive = false,
}: {
    conversation: ConversationSummary;
    currentTeamSlug: string | undefined;
    /** Sólo en Archivado: desarchivar sin tener que abrir el chat. */
    showUnarchive?: boolean;
}) {
    const getInitials = useInitials();
    const openUnseen = useOpenConversationUnseen();
    const [menuOpen, setMenuOpen] = useState(false);
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
    const preview = messagePreviewFor(conversation);

    return (
        <li
            className={`sidebar-row group${conversation.isCurrent ? ' sidebar-row--active' : ''}`}
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
                className={`sidebar-row-link${currentTeamSlug ? ' sidebar-row-link--actionable' : ''}`}
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
                            {conversation.isFavorite && (
                                <Star
                                    className="ml-1 inline-block size-2.5 align-middle text-amber-400"
                                    fill="currentColor"
                                />
                            )}
                        </span>
                        {conversation.lastMessageAt && (
                            <span className="sidebar-row-time group-hover:invisible">
                                {formatSidebarTime(conversation.lastMessageAt)}
                            </span>
                        )}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                        <span className="sidebar-row-preview">
                            {preview.icon && (
                                <preview.icon className="sidebar-row-preview-icon size-3" />
                            )}
                            <span className="sidebar-row-preview-text">
                                {preview.text}
                            </span>
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
                <span
                    className={`sidebar-row-action ${menuOpen ? '' : 'invisible group-hover:visible'}`}
                >
                    <ConversationRowMenu
                        conversation={conversation}
                        currentTeamSlug={currentTeamSlug}
                        showUnarchive={showUnarchive}
                        onOpenChange={setMenuOpen}
                    />
                </span>
            )}
        </li>
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
                    Vista previa — usa "Nueva reunión" para ver cómo se va a
                    ver. Sin conexión de audio/video real todavía.
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

/** Fila de actividad real (reacciones recibidas por ahora — ver
 *  ListActivityForUser sobre por qué menciones/ediciones/cambios de
 *  estado de compañeros todavía no están acá). Mismo mecanismo de
 *  salto que SavedMessageRow. */
function ActivityRow({
    item,
    currentTeamSlug,
}: {
    item: ActivityItem;
    currentTeamSlug: string | undefined;
}) {
    const getInitials = useInitials();

    return (
        <li className="sidebar-row">
            <button
                type="button"
                onClick={() => {
                    if (!currentTeamSlug) {
                        return;
                    }

                    router.visit(
                        showMessage([currentTeamSlug, item.conversationId], {
                            query: { message: item.messageId },
                        }).url,
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
                <Avatar className="size-9 shrink-0">
                    {item.actorAvatar && (
                        <AvatarImage
                            src={item.actorAvatar}
                            alt={item.actorName}
                        />
                    )}
                    <AvatarFallback className="bg-[var(--sidebar-accent)] text-[11px] text-[var(--sidebar-accent-foreground)]">
                        {getInitials(item.actorName)}
                    </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                        <span className="sidebar-row-label">
                            {item.actorName}
                        </span>
                        <span className="sidebar-row-time">
                            {relativeSavedLabel(item.createdAt)}
                        </span>
                    </span>
                    <span className="sidebar-row-preview">
                        <span className="sidebar-row-preview-text">
                            reaccionó con {item.emoji} · {item.conversationName}{' '}
                            — “{item.messageExcerpt}”
                        </span>
                    </span>
                </span>
            </button>
        </li>
    );
}

function ActivitySidebarList({
    activeModuleLabel,
}: {
    activeModuleLabel: string;
}) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const activityItems = page.props.activityItems ?? [];

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
                    {activityItems.map((item) => (
                        <ActivityRow
                            key={item.id}
                            item={item}
                            currentTeamSlug={currentTeam?.slug}
                        />
                    ))}

                    {activityItems.length === 0 && (
                        <p className="px-2 text-sm text-[var(--sidebar-fg-muted)]">
                            Sin actividad reciente — acá vas a ver cuando
                            alguien reaccione a tus mensajes.
                        </p>
                    )}
                </ul>
            </SidebarContent>
        </Sidebar>
    );
}
