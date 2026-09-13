import { createInertiaApp } from '@inertiajs/react';
import { RouteLoadingOverlay } from '@/components/route-loading-overlay';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { initializeLocale } from '@/hooks/use-locale';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { configureEcho } from '@laravel/echo-react';

configureEcho({
    broadcaster: 'reverb',
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

// This will set the ES/EN locale on load...
initializeLocale();
