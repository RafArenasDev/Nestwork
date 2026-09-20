import { Breadcrumbs } from '@/components/breadcrumbs';
import { GlobalSearchBar } from '@/components/global-search-bar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

/**
 * El toggle de tema vive siempre en la fila de título de la sidebar
 * expandida (ver SidebarModuleHeader en app-sidebar.tsx), nunca acá.
 *
 * A diferencia de antes (null sin breadcrumbs), este header SIEMPRE se
 * renderiza — pedido explícito: la búsqueda global no puede desaparecer
 * en ninguna pantalla, ni siquiera dentro de un chat (que tiene su
 * propio header debajo, con el nombre de la conversación).
 */
export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="bg-background text-foreground border-border/60 relative z-10 flex h-14 shrink-0 items-center gap-4 border-b px-6 md:px-4">
            <div className="min-w-0 flex-1">
                {breadcrumbs.length > 0 && (
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                )}
            </div>
            <GlobalSearchBar />
            <div className="min-w-0 flex-1" aria-hidden="true" />
        </header>
    );
}
