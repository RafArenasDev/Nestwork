import { createInertiaApp, router } from '@inertiajs/react';
import { RouteLoadingOverlay } from '@/components/route-loading-overlay';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { initializeCustomization } from '@/hooks/use-customization';
import { initializeLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { configureEcho, echo } from '@laravel/echo-react';

configureEcho({
    broadcaster: 'reverb',
});

// broadcast(...)->toOthers() en el backend depende de este header para
// saber qué conexión excluir — Laravel lo documenta asumiendo un
// interceptor de axios (bootstrap.js clásico de Breeze/Jetstream), pero
// Inertia usa su propio cliente de fetch, no axios, así que sin esto
// nunca se manda y toOthers() nunca excluye a nadie: el propio emisor
// recibe su propio evento (y, en Thread/app-sidebar-layout, eso disparaba
// un reload que pisaba la conversación recién abierta).
router.on('before', (event) => {
    const socketId = echo().socketId();

    if (socketId) {
        event.detail.visit.headers['X-Socket-Id'] = socketId;
    }
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            // El panel deslizante de auth/login arma su propia pantalla
            // completa (login/registro en un solo componente), igual que
            // forgot/reset-password — ninguna pasa por el layout
            // genérico de 2 columnas (AuthSplitLayout, sin usar hoy).
            case name === 'auth/login':
            case name === 'auth/forgot-password':
            case name === 'auth/reset-password':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
            case name.startsWith('teams/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <RouteLoadingOverlay />
                <Toaster />
            </TooltipProvider>
        );
    },
    // Barra de progreso nativa desactivada — el RouteLoadingOverlay
    // (skeleton) es ahora el único feedback de carga entre páginas.
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();

// Color de sidebar / intensidad del glass / densidad de mensajes —
// sin cookie/SSR (a diferencia del tema): no afectan el primer render
// del servidor, así que alcanza con aplicarlas acá.
initializeCustomization();

// This will set the ES/EN locale on load...
initializeLocale();
