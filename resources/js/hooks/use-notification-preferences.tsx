import { useSyncExternalStore } from 'react';

export type NotificationSound = 'classic' | 'chime' | 'pop' | 'marimba';

/** Mismo patrón que use-customization.tsx (localStorage + listeners) —
 *  preferencia de DISPOSITIVO, no de cuenta: cada navegador/equipo
 *  decide si quiere sonido/notificaciones propias. */
export type NotificationPreferences = {
    desktopEnabled: boolean;
    soundEnabled: boolean;
    sound: NotificationSound;
    showPreview: boolean;
};

const DEFAULT_STATE: NotificationPreferences = {
    desktopEnabled: false,
    soundEnabled: true,
    sound: 'classic',
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

type Note = { frequency: number; start: number; duration: number };

/** Cada sonido es una lista de notas (sin archivo de audio que
 *  cargar) — mismo criterio que Slack: pocos tonos genéricos, cada uno
 *  reconocible por su patrón, no por timbre realista. */
const SOUND_PRESETS: Record<NotificationSound, Note[]> = {
    classic: [
        { frequency: 880, start: 0, duration: 0.18 },
        { frequency: 1320, start: 0.09, duration: 0.18 },
    ],
    chime: [
        { frequency: 660, start: 0, duration: 0.16 },
        { frequency: 880, start: 0.1, duration: 0.16 },
        { frequency: 1108, start: 0.2, duration: 0.22 },
    ],
    pop: [{ frequency: 520, start: 0, duration: 0.09 }],
    marimba: [
        { frequency: 987, start: 0, duration: 0.22 },
        { frequency: 740, start: 0.12, duration: 0.24 },
    ],
};

export const SOUND_OPTIONS: { value: NotificationSound; label: string }[] = [
    { value: 'classic', label: 'Clásico' },
    { value: 'chime', label: 'Campanita' },
    { value: 'pop', label: 'Pop' },
    { value: 'marimba', label: 'Marimba' },
];

/** Sin archivo de audio que cargar: cada tono es una nota (u ondas)
 *  generada con Web Audio en el momento. */
export function playNotificationSound(
    sound: NotificationSound = getNotificationPreferences().sound,
): void {
    try {
        const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
        const context = new AudioContextClass();
        const now = context.currentTime;

        SOUND_PRESETS[sound].forEach(({ frequency, start, duration }) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            const noteStart = now + start;
            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.01);
            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                noteStart + duration,
            );
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(noteStart);
            oscillator.stop(noteStart + duration + 0.02);
        });

        setTimeout(() => context.close(), 800);
    } catch {
        // Sin audio (autoplay bloqueado, navegador sin soporte) — no
        // es crítico, la notificación de escritorio sigue funcionando.
    }
}
