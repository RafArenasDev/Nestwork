import { Link, router, usePage } from '@inertiajs/react';
import {
    ArchiveBoxIcon,
    BellIcon,
    BookmarkIcon,
    ChatBubbleLeftRightIcon,
    HomeIcon,
    UserGroupIcon,
    SpeakerWaveIcon,
    VideoCameraIcon,
} from '@heroicons/react/24/outline';
import {
    ArchiveBoxIcon as ArchiveBoxIconSolid,
    BellIcon as BellIconSolid,
    BookmarkIcon as BookmarkIconSolid,
    ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
    HomeIcon as HomeIconSolid,
    UserGroupIcon as UserGroupIconSolid,
    SpeakerWaveIcon as SpeakerWaveIconSolid,
    VideoCameraIcon as VideoCameraIconSolid,
} from '@heroicons/react/24/solid';
import { LogOut, Settings, Sparkles, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { ProfileModal } from '@/components/profile-modal';
import { SettingsModal } from '@/components/settings-modal';
import { PresenceDot } from '@/components/presence-dot';
import { CustomStatusEditor, PresenceMenu } from '@/components/status-editor';
import { TeamSwitcher } from '@/components/team-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { useLocale } from '@/hooks/use-locale';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { destroy as clearStatus } from '@/routes/user-status';

const RAIL_MODULES = [
    {
        key: 'home',
        label: 'Inicio',
        icon: HomeIcon,
        iconActive: HomeIconSolid,
    },
    {
        key: 'messages',
        label: 'Chats',
        icon: ChatBubbleLeftRightIcon,
        iconActive: ChatBubbleLeftRightIconSolid,
    },
    {
        key: 'groups',
        label: 'Grupos',
        icon: UserGroupIcon,
        iconActive: UserGroupIconSolid,
    },
    {
        key: 'channels',
        label: 'Canales',
        icon: SpeakerWaveIcon,
        iconActive: SpeakerWaveIconSolid,
    },
    {
        key: 'meetings',
        label: 'Reuniones',
        icon: VideoCameraIcon,
        iconActive: VideoCameraIconSolid,
    },
    {
        key: 'activity',
        label: 'Actividad',
        icon: BellIcon,
        iconActive: BellIconSolid,
    },
    {
        key: 'archived',
        label: 'Archivo',
        icon: ArchiveBoxIcon,
        iconActive: ArchiveBoxIconSolid,
    },
    {
        key: 'saved',
        label: 'Guardados',
        icon: BookmarkIcon,
        iconActive: BookmarkIconSolid,
    },
] as const;

export { RAIL_MODULES };
export type RailModuleKey = (typeof RAIL_MODULES)[number]['key'];

/** El Home (accesos rápidos a Guardados/Archivo/Actividad) dispara esto
 *  en vez de navegar directo — el módulo activo del rail es estado
 *  local de AppSidebarLayout, no una URL, así que una página no puede
 *  cambiarlo con un <Link> normal. */
export const SWITCH_MODULE_EVENT = 'nestwork:switch-module';

/** Ancho fijo (siempre el mismo, ocupa todo el alto, sin padding/margin). */
export const CURVED_RAIL_WIDTH = 72;

type Props = {
    active: RailModuleKey;
    onChange: (key: RailModuleKey) => void;
};

/** 99+ en vez de un número gigante que rompe el diseño del badge. */
function formatBadgeCount(count: number): string {
    return count > 99 ? '99+' : String(count);
}

const PRESENCE_LABEL: Record<string, string> = {
    available: 'Disponible',
    away: 'Ausente',
    busy: 'Ocupado',
    dnd: 'No molestar',
    offline: 'Desconectado',
};

const PRESENCE_FILL: Record<string, string> = {
    available: 'bg-emerald-500',
    away: 'bg-amber-500',
    busy: 'bg-red-500',
    dnd: 'bg-red-600',
    offline: 'bg-zinc-400',
};

export function CurvedNavRail({ active, onChange }: Props) {
    const {
        auth,
        conversations,
        archivedConversations,
        groupConversations,
        channelConversations,
        presencePresets,
        statusPresets,
    } = usePage().props;
    const getInitials = useInitials();
    const { t } = useLocale();
    const cleanup = useMobileNavigation();
    const [profileOpen, setProfileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const showAvatar = Boolean(auth.user.avatar && auth.user.avatar !== '');

    const unreadMessageCount = conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );
    const conversationsWithActivity = conversations.filter(
        (conversation) => conversation.unreadCount > 0,
    ).length;
    // Un chat archivado sale de "Mensajes" (se filtra ahí) pero sigue
    // recibiendo mensajes en vivo — sin este badge en el ícono de
    // Archivo, un no-leído ahí quedaba invisible para siempre a menos
    // que el usuario entrara a revisar manualmente.
    const unreadArchivedCount = archivedConversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );
    const unreadGroupCount = groupConversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );
    const unreadChannelCount = channelConversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );

    const badgeCountFor = (key: RailModuleKey): number => {
        if (key === 'messages') {
            return unreadMessageCount;
        }

        if (key === 'groups') {
            return unreadGroupCount;
        }

        if (key === 'channels') {
            return unreadChannelCount;
        }

        if (key === 'activity') {
            return conversationsWithActivity;
        }

        if (key === 'archived') {
            return unreadArchivedCount;
        }

        return 0;
    };

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <nav className="curved-rail" aria-label="Secciones">
            <TeamSwitcher iconOnly />
            <ul>
                {RAIL_MODULES.map(
                    ({ key, label, icon: Icon, iconActive: IconActive }) => {
                        const isActive = active === key;
                        const badgeCount = badgeCountFor(key);
                        const RenderedIcon = isActive ? IconActive : Icon;
                        const button = (
                            <button
                                type="button"
                                className="curved-rail-link"
                                aria-label={label}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => onChange(key)}
                            >
                                <span className="curved-rail-icon">
                                    <RenderedIcon
                                        className="size-7"
                                        strokeWidth={1.8}
                                    />
                                    {badgeCount > 0 && (
                                        <Badge
                                            variant="destructive"
                                            // Rojo fijo (el mismo oklch de
                                            // --destructive en tema claro), no la
                                            // variable — el dark:bg-destructive/60
                                            // de shadcn lo apaga en oscuro, y acá
                                            // además --destructive cambia de tono
                                            // entre temas; un contador de no
                                            // leídos debe verse igual en los dos.
                                            className="absolute -top-2 -right-2 h-4 min-w-4 justify-center rounded-full bg-[oklch(0.577_0.245_27.325)] px-1 text-[9px] leading-none dark:bg-[oklch(0.577_0.245_27.325)]"
                                        >
                                            {formatBadgeCount(badgeCount)}
                                        </Badge>
                                    )}
                                </span>
                            </button>
                        );

                        return (
                            <li
                                key={key}
                                className={`curved-rail-item${isActive ? ' curved-rail-item--active' : ''}`}
                            >
                                {/* Sin tooltip cuando ya está seleccionado:
                                el título ya se ve en el header del
                                sidebar, sería redundante. */}
                                {isActive ? (
                                    button
                                ) : (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            {button}
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            {label}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </li>
                        );
                    },
                )}
            </ul>

            <div className="curved-rail-footer">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="curved-rail-avatar relative"
                            aria-label={auth.user.name}
                        >
                            <Avatar className="size-9">
                                {showAvatar ? (
                                    <AvatarImage
                                        src={auth.user.avatar}
                                        alt={auth.user.name}
                                    />
                                ) : null}
                                <AvatarFallback className="bg-[var(--sidebar-accent)] text-xs text-[var(--sidebar-accent-foreground)]">
                                    {getInitials(auth.user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <PresenceDot
                                presence={auth.user.presence}
                                surfaceTone="var(--sidebar)"
                            />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-72"
                        side="right"
                        align="end"
                        sideOffset={8}
                    >
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex items-center gap-3 py-1 text-left">
                                <span className="relative inline-flex shrink-0">
                                    <Avatar className="size-11">
                                        {showAvatar ? (
                                            <AvatarImage
                                                src={auth.user.avatar}
                                                alt={auth.user.name}
                                            />
                                        ) : null}
                                        <AvatarFallback className="text-sm">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <PresenceDot
                                        presence={auth.user.presence}
                                        surfaceTone="var(--popover)"
                                        className="-top-0.5 -right-0.5 size-3"
                                    />
                                </span>
                                <div className="min-w-0 flex-1 text-sm">
                                    <span className="block truncate font-semibold">
                                        {auth.user.name}
                                    </span>
                                    <span className="text-muted-foreground block truncate text-xs">
                                        @{auth.user.username}
                                    </span>
                                </div>
                            </div>
                            <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                                <span
                                    className={cn(
                                        'inline-flex size-2 items-center justify-center rounded-full',
                                        PRESENCE_FILL[auth.user.presence],
                                    )}
                                >
                                    {auth.user.presence === 'dnd' && (
                                        <span className="h-px w-1/2 bg-white" />
                                    )}
                                </span>
                                {PRESENCE_LABEL[auth.user.presence]}
                            </div>
                            {auth.user.status_text && (
                                <div className="border-border/50 mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
                                    <span>{auth.user.status_emoji}</span>
                                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                                        {auth.user.status_text}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Borrar estado"
                                        onClick={() =>
                                            router.delete(clearStatus().url, {
                                                preserveScroll: true,
                                            })
                                        }
                                        className="text-muted-foreground hover:text-foreground shrink-0"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="px-1 py-1">
                            <span className="text-muted-foreground block px-1.5 pb-1 text-xs font-medium">
                                Presencia
                            </span>
                            <PresenceMenu
                                presets={presencePresets}
                                currentPreset={auth.user.status_preset}
                            />
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setStatusDialogOpen(true)}
                        >
                            <Sparkles className="mr-2" />
                            {auth.user.status_text
                                ? 'Cambiar estado personalizado'
                                : 'Establecer un estado'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                            <UserRound className="mr-2" />
                            {t.userMenu.profile}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                            <Settings className="mr-2" />
                            Ajustes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link
                                className="block w-full cursor-pointer"
                                href={logout()}
                                as="button"
                                onClick={handleLogout}
                                data-test="logout-button"
                            >
                                <LogOut className="mr-2" />
                                {t.common.logOut}
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
            <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Establecer un estado</DialogTitle>
                    </DialogHeader>
                    <CustomStatusEditor
                        presets={statusPresets}
                        onApplied={() => setStatusDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </nav>
    );
}
