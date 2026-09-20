import { useSyncExternalStore } from 'react';

/** Mismo patrón que use-customization.tsx (localStorage + listeners) —
 *  preferencia de DISPOSITIVO, no de cuenta: cada navegador/equipo
 *  decide si quiere sonido/notificaciones propias. */
export type NotificationPreferences = {
    desktopEnabled: boolean;
    soundEnabled: boolean;
    showPreview: boolean;
};

const DEFAULT_STATE: NotificationPreferences = {
    desktopEnabled: false,
    soundEnabled: true,
    showPreview: true,
};

const STORAGE_KEY = 'nestwork-notifications';
const listeners = new Set<() => void>();
let current: NotificationPreferences = DEFAULT_STATE;

function readStored(): NotificationPreferences {
    if (typeof window === 'undefined') {
        return DEFAULT_STATE;
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return DEFAULT_STATE;
        }

        return {
            ...DEFAULT_STATE,
            ...(JSON.parse(raw) as NotificationPreferences),
        };
    } catch {
        return DEFAULT_STATE;
    }
}

export function initializeNotificationPreferences(): void {
    current = readStored();
}

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function getNotificationPreferences(): NotificationPreferences {
    return current;
}

export function useNotificationPreferences() {
    const state = useSyncExternalStore(
        subscribe,
        () => current,
        () => DEFAULT_STATE,
    );

    const update = (patch: Partial<NotificationPreferences>): void => {
        current = { ...current, ...patch };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch {
            // Sin persistencia si el storage falla — igual queda
            // aplicado en memoria para el resto de la sesión.
        }

        notify();
    };

    return { ...state, update } as const;
}

/** Beep corto vía Web Audio — nada de asset de audio que cargar, sólo
 *  un tono generado (2 notas cortas, como el "ding" típico de chat). */
export function playNotificationSound(): void {
    try {
        const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
        const context = new AudioContextClass();
        const now = context.currentTime;

        [880, 1320].forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            const start = now + index * 0.09;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.2);
        });

        setTimeout(() => context.close(), 500);
    } catch {
        // Sin audio (autoplay bloqueado, navegador sin soporte) — no
        // es crítico, la notificación de escritorio sigue funcionando.
    }
}
