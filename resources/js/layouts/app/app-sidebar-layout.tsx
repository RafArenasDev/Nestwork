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
            {/* Rediseño Aurora (2026-09-15): mini-sidebar y sidebar ya no
                comparten degradé ("gotera") — un hairline de 1px las
                separa (ver curved-nav-rail.css/sidebar-list.css), así que
                no hace falta parche de esquina ni margen/radio flotante
                acá. El panel de contenido va de punta a punta: la
                "audacia" de curvas grandes se gasta en piezas puntuales
                que sí flotan sobre contenido (header del chat, composer,
                modales, menús), no en el panel base. */}
            <div style={{ marginLeft: CURVED_RAIL_WIDTH }}>
                <AppShell variant="sidebar">
                    <AppSidebar
                        activeModule={activeModule}
                        activeModuleLabel={activeModuleLabel}
                    />
                    <AppContent
                        variant="sidebar"
                        className="bg-background min-h-0 min-w-0 overflow-x-hidden overflow-y-auto"
                    >
                        <AppSidebarHeader breadcrumbs={breadcrumbs} />
                        {children}
                    </AppContent>
                </AppShell>
            </div>
        </>
    );
}
