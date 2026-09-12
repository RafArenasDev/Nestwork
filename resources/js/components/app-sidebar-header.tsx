import { Breadcrumbs } from '@/components/breadcrumbs';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

/**
 * El toggle de tema vive siempre en la fila de título de la sidebar
 * expandida (ver SidebarModuleHeader en app-sidebar.tsx), nunca acá —
 * así este header deja de ocupar espacio en las páginas que no lo
 * necesitan (ej. dentro de un chat, donde el header real es el de la
 * conversación).
 */
export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    if (breadcrumbs.length === 0) {
        return null;
    }

    return (
        <header className="bg-background text-foreground border-border/60 relative z-10 flex h-16 shrink-0 items-center gap-2 border-b px-6 shadow-sm md:px-4">
            <Breadcrumbs breadcrumbs={breadcrumbs} />
        </header>
    );
}
