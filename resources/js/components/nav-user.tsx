import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { PasswordModal } from '@/components/password-modal';
import { ProfileModal } from '@/components/profile-modal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';

export function NavUser() {
    const { auth, currentTeam } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();
    // Los modales viven acá, un nivel por encima del DropdownMenu — ver el
    // comentario en user-menu-content.tsx.
    const [profileOpen, setProfileOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="group text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
                                data-test="sidebar-menu-button"
                            >
                                <UserInfo user={auth.user} team={currentTeam} />
                                <ChevronsUpDown className="ml-auto size-4" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                            align="end"
                            side={
                                isMobile
                                    ? 'bottom'
                                    : state === 'collapsed'
                                      ? 'left'
                                      : 'bottom'
                            }
                        >
                            <UserMenuContent
                                user={auth.user}
                                onOpenProfile={() => setProfileOpen(true)}
                                onOpenPassword={() => setPasswordOpen(true)}
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>

            <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
            <PasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />
        </>
    );
}
