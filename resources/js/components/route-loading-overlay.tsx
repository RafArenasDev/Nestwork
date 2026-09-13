import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const SHOW_DELAY_MS = 150;

/** Skeleton de página completa mostrado sólo al ENTRAR a la app (hoy:
 *  "/{team}/dashboard", tras un login/registro exitoso) — nunca en el
 *  login/registro en sí (esos ya tienen su propio spinner de botón).
 *  Reemplaza la barra de progreso nativa (deshabilitada en
 *  `createInertiaApp`, ver app.tsx). Delay de entrada para no
 *  parpadear en visitas casi instantáneas. */
export function RouteLoadingOverlay() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let showTimeout: ReturnType<typeof setTimeout> | null = null;

        const removeStart = router.on('start', (event) => {
            if (!event.detail.visit.url.pathname.endsWith('/dashboard')) {
                return;
            }

            showTimeout = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
        });

        const removeFinish = router.on('finish', () => {
            if (showTimeout) {
                clearTimeout(showTimeout);
            }
            setVisible(false);
        });

        return () => {
            removeStart();
            removeFinish();
            if (showTimeout) {
                clearTimeout(showTimeout);
            }
        };
    }, []);

    if (!visible) {
        return null;
    }

    return (
        <div className="bg-background fixed inset-0 z-50 flex flex-col gap-6 p-6">
            <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
            </div>

            <div className="flex-1 space-y-0 overflow-hidden rounded-xl border">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 border-b p-4 last:border-0"
                    >
                        <Skeleton className="size-8 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-1/3" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
