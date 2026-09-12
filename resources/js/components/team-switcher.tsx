import { usePage } from '@inertiajs/react';
import { ChevronsUpDown, Plus, Users } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import CreateTeamModal from '@/components/create-team-modal';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

type TeamSwitcherProps = {
    inHeader?: boolean;
    /** Trigger = solo el ícono de la app (mini-sidebar curva), sin nombre de equipo visible. */
    iconOnly?: boolean;
};

export function TeamSwitcher({
    inHeader = false,
    iconOnly = false,
}: TeamSwitcherProps) {
    const page = usePage();
    const isMobile = useIsMobile();
    const currentTeam = page.props.currentTeam;
    const teams = page.props.teams ?? [];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {iconOnly ? (
                    <button
                        type="button"
                        className="curved-rail-brand"
                        data-test="team-switcher-trigger"
                        aria-label={`Cambiar de equipo — ${currentTeam?.name ?? 'Select team'}`}
                    >
                        <AppLogoIcon className="size-5 fill-current" />
                    </button>
                ) : (
                    <Button
                        variant="ghost"
                        data-test="team-switcher-trigger"
                        className={
                            inHeader
                                ? 'h-8 gap-1 px-2'
                                : 'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full justify-start px-2 has-[>svg]:px-2'
                        }
                    >
                        <Users
                            className={
                                inHeader
                                    ? 'hidden'
                                    : 'hidden size-4 shrink-0 group-data-[collapsible=icon]:block'
                            }
                        />
                        <div
                            className={
                                inHeader
                                    ? 'grid flex-1 text-left text-sm leading-tight'
                                    : 'grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden'
                            }
                        >
                            <span
                                className={
                                    inHeader
                                        ? 'max-w-[120px] truncate font-medium'
                                        : 'truncate font-semibold'
                                }
                            >
                                {currentTeam?.name ?? 'Select team'}
                            </span>
                        </div>
                        <ChevronsUpDown
                            className={
                                inHeader
                                    ? 'size-4 opacity-50'
                                    : 'ml-auto group-data-[collapsible=icon]:hidden'
                            }
                        />
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className={
                    iconOnly
                        ? 'w-56'
                        : inHeader
                          ? 'w-56'
                          : 'w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                }
                side={
                    iconOnly
                        ? 'right'
                        : inHeader
                          ? undefined
                          : isMobile
                            ? 'bottom'
                            : 'right'
                }
                align={iconOnly ? 'start' : inHeader ? 'end' : 'start'}
                sideOffset={iconOnly ? 8 : inHeader ? undefined : 4}
            >
                {teams.map((team) => (
                    // Solo informativo: no cambia de equipo al hacer clic
                    // (sin onSelect, sin cursor-pointer, sin check) — ver
                    // "New team" más abajo para la única acción real acá.
                    <div
                        key={team.id}
                        data-test="team-switcher-item"
                        className="flex gap-2 p-2"
                    >
                        <div className="grid flex-1 leading-tight">
                            <span className="truncate text-sm">
                                {team.name}
                            </span>
                            {team.domain && (
                                <span className="text-muted-foreground truncate text-xs">
                                    {team.domain}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                <DropdownMenuSeparator />
                <CreateTeamModal>
                    <DropdownMenuItem
                        data-test="team-switcher-new-team"
                        className={
                            inHeader
                                ? 'cursor-pointer gap-2'
                                : 'cursor-pointer gap-2 p-2'
                        }
                        onSelect={(event) => event.preventDefault()}
                    >
                        <Plus className={inHeader ? 'size-4' : 'h-4 w-4'} />
                        <span className="text-muted-foreground">New team</span>
                    </DropdownMenuItem>
                </CreateTeamModal>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
