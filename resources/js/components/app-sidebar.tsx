import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { TeamSwitcher } from '@/components/team-switcher';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import WhatsNewModal from '@/components/whats-new-modal';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';
import { CURRENT_VERSION } from '@/version';

export function AppSidebar() {
    const page = usePage();
    const dashboardUrl = page.props.currentTeam
        ? dashboard(page.props.currentTeam.slug)
        : '/';
    const [showWhatsNew, setShowWhatsNew] = useState(false);

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboardUrl,
            icon: LayoutGrid,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="border-sidebar-border border-b">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboardUrl} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <TeamSwitcher />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />

                {/* Mismo patrón que Inventory-Manager: versión + "Novedades" +
                    copyright, en vez de los links genéricos del starter kit. */}
                <div className="border-sidebar-border space-y-0.5 border-t px-2 pt-3 pb-1 text-center group-data-[collapsible=icon]:hidden">
                    <button
                        type="button"
                        onClick={() => setShowWhatsNew(true)}
                        className="text-sidebar-foreground/60 hover:text-sidebar-foreground text-[11px] font-medium tracking-wide underline-offset-2 hover:underline"
                    >
                        {CURRENT_VERSION} · Novedades
                    </button>
                    <p className="text-sidebar-foreground/35 text-[10px]">
                        © 2026–{new Date().getFullYear()} RafArenasDev
                    </p>
                </div>
            </SidebarFooter>

            <WhatsNewModal open={showWhatsNew} onOpenChange={setShowWhatsNew} />
        </Sidebar>
    );
}
