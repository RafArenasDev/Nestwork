import { useSyncExternalStore } from 'react';

/** "Mostrar escribiendo…" es la única preferencia de privacidad que no
 *  necesita viajar al servidor — el whisper de Echo (ver notifyTyping
 *  en messages/index.tsx) lo dispara el cliente mismo, así que sólo
 *  hace falta decidir ACÁ si se manda o no. Confirmación de lectura sí
 *  vive en el servidor (afecta lo que otros ven), ver
 *  read_receipts_enabled en el User. */
export type PrivacyPreferences = {
    showTypingIndicator: boolean;
};

const DEFAULT_STATE: PrivacyPreferences = {
    showTypingIndicator: true,
};

const STORAGE_KEY = 'nestwork-privacy';
const listeners = new Set<() => void>();
let current: PrivacyPreferences = DEFAULT_STATE;

function readStored(): PrivacyPreferences {
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
            ...(JSON.parse(raw) as PrivacyPreferences),
        };
    } catch {
        return DEFAULT_STATE;
    }
}

export function initializePrivacyPreferences(): void {
    current = readStored();
}

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function getPrivacyPreferences(): PrivacyPreferences {
    return current;
}

export function usePrivacyPreferences() {
    const state = useSyncExternalStore(
        subscribe,
        () => current,
        () => DEFAULT_STATE,
    );

    const update = (patch: Partial<PrivacyPreferences>): void => {
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
