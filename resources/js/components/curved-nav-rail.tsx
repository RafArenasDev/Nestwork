import { Link, router, usePage } from '@inertiajs/react';
import {
    ArchiveBoxIcon,
    BellIcon,
    ChatBubbleLeftRightIcon,
    HomeIcon,
} from '@heroicons/react/24/outline';
import {
    ArchiveBoxIcon as ArchiveBoxIconSolid,
    BellIcon as BellIconSolid,
    ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
    HomeIcon as HomeIconSolid,
} from '@heroicons/react/24/solid';
import { Circle, LogOut, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { ProfileModal } from '@/components/profile-modal';
import { PresenceDot } from '@/components/presence-dot';
import { TeamSwitcher } from '@/components/team-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
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
import { logout } from '@/routes';
import {
    update as updateStatus,
    destroy as clearStatus,
} from '@/routes/user-status';

const RAIL_MODULES = [
    {
        key: 'home',
        label: 'Inicio',
        icon: HomeIcon,
        iconActive: HomeIconSolid,
    },
    {
        key: 'messages',
        label: 'Mensajes',
        icon: ChatBubbleLeftRightIcon,
        iconActive: ChatBubbleLeftRightIconSolid,
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
] as const;

export { RAIL_MODULES };
export type RailModuleKey = (typeof RAIL_MODULES)[number]['key'];

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

export function CurvedNavRail({ active, onChange }: Props) {
    const { auth, conversations, statusPresets } = usePage().props;
    const getInitials = useInitials();
    const { t } = useLocale();
    const cleanup = useMobileNavigation();
    const [profileOpen, setProfileOpen] = useState(false);
    const showAvatar = Boolean(auth.user.avatar && auth.user.avatar !== '');

    const unreadMessageCount = conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );
    const conversationsWithActivity = conversations.filter(
        (conversation) => conversation.unreadCount > 0,
    ).length;

    const badgeCountFor = (key: RailModuleKey): number => {
        if (key === 'messages') {
            return unreadMessageCount;
        }

        if (key === 'activity') {
            return conversationsWithActivity;
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
                                            className="absolute -top-2 -right-2 h-4 min-w-4 justify-center rounded-full px-1 text-[9px] leading-none"
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
                                <span
                                    className="curved-rail-notch curved-rail-notch--top"
                                    aria-hidden="true"
                                />
                                <span
                                    className="curved-rail-notch curved-rail-notch--bottom"
                                    aria-hidden="true"
                                />
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
                        className="w-56"
                        side="right"
                        align="end"
                        sideOffset={8}
                    >
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col text-left text-sm">
                                <span className="truncate font-medium">
                                    {auth.user.name}
                                </span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {auth.user.email}
                                </span>
                                {auth.user.status_text && (
                                    <span className="truncate text-xs">
                                        {auth.user.status_emoji}{' '}
                                        {auth.user.status_text}
                                    </span>
                                )}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Circle className="mr-2 size-3.5" />
                                Cambiar estado
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {statusPresets.map(({ key, emoji, label }) => (
                                    <DropdownMenuItem
                                        key={key}
                                        onClick={() =>
                                            router.patch(
                                                updateStatus().url,
                                                { preset: key },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <span>{emoji}</span>
                                        {label}
                                    </DropdownMenuItem>
                                ))}
                                {(auth.user.status_preset ||
                                    auth.user.status_text) && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() =>
                                                router.delete(
                                                    clearStatus().url,
                                                    {
                                                        preserveScroll: true,
                                                    },
                                                )
                                            }
                                        >
                                            <X className="mr-2" />
                                            Borrar estado
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                            <UserRound className="mr-2" />
                            {t.userMenu.profile}
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
        </nav>
    );
}
