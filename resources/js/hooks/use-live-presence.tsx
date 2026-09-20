import { useEchoPresence } from '@laravel/echo-react';
import { router } from '@inertiajs/react';
import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { Presence } from '@/components/presence-dot';

type PresenceOverride = {
    presence: Presence;
    statusEmoji: string | null;
    statusText: string | null;
};

type PresenceUpdatedPayload = {
    userId: number;
    presence: Presence;
    statusEmoji: string | null;
    statusText: string | null;
};

const LivePresenceContext = createContext<Map<number, PresenceOverride>>(
    new Map(),
);

/**
 * Se une al canal de presencia del equipo (`team.{id}`, ver
 * `routes/channels.php` — el patrón estaba roto de raíz con el prefijo
 * "presence-" puesto a mano, nunca llegaba a matchear una suscripción
 * real) y guarda un mapa de "última presencia/estado que llegó por
 * socket" por usuario. Antes, cambiar tu estado (`UserPresenceController`/
 * `UserStatusController`) sólo lo veías vos — nadie más se enteraba
 * hasta que su pantalla recargara por cualquier otro motivo.
 *
 * El override cubre el hueco visual al instante; el `router.reload()`
 * de los props reales (conversations/teamMembers/conversation) llega
 * un instante después para dejar todo consistente con lo que hay en
 * BD (nombres, listas, lo que sea que dependa del mismo dato).
 */
export function TeamPresenceProvider({
    teamSlug,
    reloadProps,
    children,
}: {
    /** El canal se une por slug, no por id — `Team::getRouteKeyName()`
     *  es "slug" y `routes/channels.php` usa binding implícito de
     *  Team; unirse por id nunca resuelve el modelo y Reverb devuelve
     *  403 en /broadcasting/auth. */
    teamSlug: string | null | undefined;
    reloadProps: string[];
    children: ReactNode;
}) {
    const [overrides, setOverrides] = useState<Map<number, PresenceOverride>>(
        new Map(),
    );

    useEchoPresence<PresenceUpdatedPayload>(
        teamSlug ? `team.${teamSlug}` : '__no-team__',
        '.PresenceUpdated',
        (payload) => {
            if (!teamSlug) {
                return;
            }

            setOverrides((previous) => {
                const next = new Map(previous);
                next.set(payload.userId, {
                    presence: payload.presence,
                    statusEmoji: payload.statusEmoji,
                    statusText: payload.statusText,
                });

                return next;
            });

            router.reload({ only: reloadProps });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [teamSlug, reloadProps.join(',')],
    );

    return (
        <LivePresenceContext.Provider value={overrides}>
            {children}
        </LivePresenceContext.Provider>
    );
}

/** Aplica el override en vivo (si llegó uno) sobre el valor que trae la
 *  página por props — usarlo en cualquier fila/encabezado que muestre
 *  la presencia/estado de OTRO usuario. */
export function useLivePresence<
    T extends {
        presence: Presence | null;
        statusEmoji: string | null;
        statusText: string | null;
    },
>(userId: number | null | undefined, fallback: T): T {
    const overrides = useContext(LivePresenceContext);

    return useMemo(() => {
        if (!userId) {
            return fallback;
        }

        const override = overrides.get(userId);

        return override ? { ...fallback, ...override } : fallback;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, overrides, fallback.presence, fallback.statusEmoji, fallback.statusText]);
}
