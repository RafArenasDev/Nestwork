import { useSyncExternalStore } from 'react';
import { colorPresetByKey } from '@/lib/color-presets';

/** Mismo patrón que use-appearance.tsx (localStorage + listeners, sin
 *  backend) — nada de esto afecta el primer render del servidor (a
 *  diferencia del tema, que sí necesita coincidir con SSR). */
export type MessageDensity = 'minimal' | 'comfortable' | 'compact';
export type UiScale = 'small' | 'medium' | 'large';

export type CustomizationState = {
    /** Clave de preset (ver lib/color-presets.ts) o 'none'. */
    sidebarColor: string;
    bubbleColor: string;
    /** 0-1: cuánto "vidrio" (blur + opacidad) llevan header/composer/
     *  stat cards — 0 es casi transparente y sin blur, 1 es casi
     *  opaco con blur fuerte. Los menús/modales (glass-popover) NO
     *  dependen de esto a propósito: necesitan legibilidad garantizada
     *  siempre, sin importar la preferencia estética del usuario. */
    glassIntensity: number;
    density: MessageDensity;
    uiScale: UiScale;
};

const DEFAULT_STATE: CustomizationState = {
    sidebarColor: 'aurora',
    bubbleColor: 'aurora',
    glassIntensity: 0.5,
    density: 'comfortable',
    uiScale: 'medium',
};

const UI_SCALE_VALUE: Record<UiScale, number> = {
    small: 0.9375,
    medium: 1,
    large: 1.0625,
};

const STORAGE_KEY = 'nestwork-customization';
const listeners = new Set<() => void>();
let current: CustomizationState = DEFAULT_STATE;

function readStored(): CustomizationState {
    if (typeof window === 'undefined') {
        return DEFAULT_STATE;
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return DEFAULT_STATE;
        }

        return { ...DEFAULT_STATE, ...(JSON.parse(raw) as CustomizationState) };
    } catch {
        return DEFAULT_STATE;
    }
}

function applyToDom(state: CustomizationState): void {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement.style;

    root.setProperty('--glass-intensity', String(state.glassIntensity));

    if (state.sidebarColor === 'none') {
        root.removeProperty('--sidebar-tint');
    } else {
        root.setProperty(
            '--sidebar-tint',
            colorPresetByKey(state.sidebarColor).tint,
        );
    }

    const bubble = colorPresetByKey(state.bubbleColor);
    root.setProperty('--bubble-sent', bubble.image);
    root.setProperty('--bubble-sent-tail', bubble.solidEnd);

    document.documentElement.setAttribute('data-density', state.density);
    root.setProperty('--ui-scale', String(UI_SCALE_VALUE[state.uiScale]));
}

export function initializeCustomization(): void {
    current = readStored();
    applyToDom(current);
}

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function useCustomization() {
    const state = useSyncExternalStore(
        subscribe,
        () => current,
        () => DEFAULT_STATE,
    );

    const update = (patch: Partial<CustomizationState>): void => {
        current = { ...current, ...patch };
        applyToDom(current);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch {
            // Sin persistencia si el storage falla (privado/lleno) — la
            // sesión actual igual queda personalizada en memoria.
        }

        notify();
    };

    return { ...state, update } as const;
}
