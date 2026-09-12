import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const isOpen = usePage().props.sidebarOpen;

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    return (
        // `h-dvh` (no solo min-h-*): con `collapsible="none"` el
        // <Sidebar> real es un simple hijo flex con `h-full` — si este
        // wrapper solo tiene min-height (altura intrínseca/auto), ese
        // `h-full` no tiene contra qué resolverse y el sidebar colapsa
        // al alto de su contenido en vez de ocupar toda la pantalla.
        <SidebarProvider defaultOpen={isOpen} className="h-dvh">
            {children}
        </SidebarProvider>
    );
}
