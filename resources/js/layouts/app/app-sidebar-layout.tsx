import { router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { useEffect, useState } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import {
    CURVED_RAIL_WIDTH,
    CurvedNavRail,
    RAIL_MODULES,
    type RailModuleKey,
} from '@/components/curved-nav-rail';
import { updateFaviconBadge } from '@/lib/favicon-badge';
import { dashboard } from '@/routes';
import {
    index as messagesIndex,
    show as messagesShow,
} from '@/routes/messages';
import type { ActiveConversation, AppLayoutProps } from '@/types';

/** Módulos que ya tienen una página real (el resto sigue como pestaña
 * local de solo lectura hasta que se construyan). */
const ROUTED_MODULES: Partial<Record<RailModuleKey, true>> = {
    home: true,
    messages: true,
};

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const authUserId = page.props.auth.user.id;
    const conversations = page.props.conversations;

    // Módulos sin página propia todavía (activity/archived) usan este
    // estado local; en cuanto tienen ruta real, la URL manda.
    const [manualModule, setManualModule] = useState<RailModuleKey | null>(
        null,
    );

    // Tiempo real (Reverb): un mensaje nuevo en cualquier conversación
    // propia refresca sólo el contador de no-leídos del sidebar — el
    // hilo abierto (si está viendo esa conversación) se actualiza aparte
    // en `messages/index.tsx`, que escucha el canal específico de esa
    // conversación.
    //
    // OJO: `router.reload()` reusa `window.location.href` tal cual —
    // que con `preserveUrl` se queda congelado en "/messages" (nunca
    // "/messages/{id}", a propósito, ver closeConversation en
    // messages/index.tsx). Si hay un chat abierto, ese endpoint
    // "/messages" (index) devuelve `conversations` SIN el
    // currentConversationId — el `isCurrent` de todas las filas da
    // false y el sidebar pierde el resaltado de "seleccionado" aunque
    // el chat siga abierto en pantalla. Por eso acá se arma la URL real
    // (con el id) a mano en vez de usar reload().
    useEcho(
        `App.Models.User.${authUserId}`,
        '.MessageSent',
        () => {
            if (!currentTeam) {
                return;
            }

            const openConversation = page.props.conversation as
                | ActiveConversation
                | null
                | undefined;

            const url = openConversation
                ? messagesShow([currentTeam.slug, openConversation.id]).url
                : messagesIndex(currentTeam.slug).url;

            router.visit(url, {
                only: ['conversations', 'archivedConversations'],
                preserveScroll: true,
                preserveState: true,
                preserveUrl: true,
            });
        },
        [authUserId, currentTeam, page.props.conversation],
    );

    // Badge de no-leídos en el favicon de la pestaña — se recalcula cada
    // vez que la lista de conversaciones cambia (llegue un mensaje o se
    // marque como leído).
    useEffect(() => {
        const totalUnread = conversations.reduce(
            (total, conversation) => total + conversation.unreadCount,
            0,
        );

        void updateFaviconBadge(totalUnread);
    }, [conversations]);

    const urlModule: RailModuleKey = page.url.includes('/messages')
        ? 'messages'
        : 'home';

    const activeModule = manualModule ?? urlModule;
    const activeModuleLabel =
        RAIL_MODULES.find((module) => module.key === activeModule)?.label ?? '';

    const handleModuleChange = (key: RailModuleKey) => {
        if (ROUTED_MODULES[key] && currentTeam) {
            setManualModule(null);

            const url =
                key === 'messages'
                    ? messagesIndex(currentTeam.slug).url
                    : dashboard(currentTeam.slug).url;

            router.visit(url);

            return;
        }

        setManualModule(key);
    };

    return (
        <>
            <CurvedNavRail
                active={activeModule}
                onChange={handleModuleChange}
            />
            {/* Rellena, con el mismo negro fijo de la mini, el huequito
                que el border-radius + overflow:hidden de la sidebar
                recorta en sus dos esquinas izquierdas. Van DETRÁS de la
                sidebar (z-index bajo, fuera del stacking context de la
                mini) para que la sidebar las tape en todos lados menos
                justo en ese recorte — si vivieran dentro de
                .curved-rail heredarían su z-index alto y taparían el
                título en vez de solo el huequito. */}
            <div
                className="rail-sidebar-corner-patch rail-sidebar-corner-patch--top"
                aria-hidden="true"
            />
            <div
                className="rail-sidebar-corner-patch rail-sidebar-corner-patch--bottom"
                aria-hidden="true"
            />
            {/* Con `collapsible="none"` el <Sidebar> ya no es
                `position:fixed` (ver app-shell.tsx) — es flujo normal,
                así que alcanza con este margen para correrlo a la
                derecha de la mini-sidebar. */}
            <div style={{ marginLeft: CURVED_RAIL_WIDTH }}>
                <AppShell variant="sidebar">
                    <AppSidebar
                        activeModule={activeModule}
                        activeModuleLabel={activeModuleLabel}
                    />
                    <AppContent
                        variant="sidebar"
                        // DECISIÓN FIJA — NO TOCAR sin pedido explícito
                        // (confirmado con el usuario 2026-09-11): el
                        // "enmarcado" es SOLO en el fondo (rounded-xl,
                        // las 4 esquinas) — CERO border, CERO shadow. Una
                        // línea de borde es, literalmente, un divider; un
                        // fondo redondeado sin trazo no lo es. Por eso
                        // ahora SÍ se puede redondear la esquina
                        // izquierda (pegada al sidebar) sin que se vea
                        // como una costura: no hay ninguna línea ahí, y
                        // el pill del item seleccionado en
                        // sidebar-list.css sigue pintado con el mismo
                        // --background de este panel, así que la gotera
                        // conecta igual de bien.
                        //
                        // `min-h-0` cancela el `min-h-svh` de base (esa
                        // altura MÍNIMA es justo lo que generaba 8px de
                        // scroll de más en TODA la página — el stretch de
                        // flexbox ya resta el margen solo, pero un
                        // min-height más alto que ese resultado gana el
                        // conflicto y desborda). Sin `h-full` explícito:
                        // dejar que el stretch del flex haga la cuenta.
                        className="bg-background m-2 ml-0 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto rounded-xl"
                    >
                        <AppSidebarHeader breadcrumbs={breadcrumbs} />
                        {children}
                    </AppContent>
                </AppShell>
            </div>
        </>
    );
}
