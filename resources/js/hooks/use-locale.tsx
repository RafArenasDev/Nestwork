import { useSyncExternalStore } from 'react';
import {
    isSupportedLocale,
    translations,
    type Dictionary,
    type Locale,
} from '@/lib/translations';

export type UseLocaleReturn = {
    readonly locale: Locale;
    readonly t: Dictionary;
    readonly updateLocale: (locale: Locale) => void;
};

const listeners = new Set<() => void>();
let currentLocale: Locale = 'es';

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredLocale = (): Locale => {
    if (typeof window === 'undefined') {
        return 'es';
    }

    const stored = localStorage.getItem('locale');

    return stored && isSupportedLocale(stored) ? stored : 'es';
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function initializeLocale(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentLocale = getStoredLocale();

    if (!localStorage.getItem('locale')) {
        localStorage.setItem('locale', currentLocale);
    }

    setCookie('locale', currentLocale);
}

export function useLocale(): UseLocaleReturn {
    const locale: Locale = useSyncExternalStore(
        subscribe,
        () => currentLocale,
        () => 'es',
    );

    const updateLocale = (next: Locale): void => {
        currentLocale = next;

        localStorage.setItem('locale', next);
        setCookie('locale', next);

        notify();

        // El idioma también afecta mensajes generados en el backend
        // (validación, Fortify, etc.) — una recarga suave via Inertia
        // asegura que esos textos lleguen ya traducidos en la próxima
        // respuesta, sin perder el estado de navegación del cliente.
        window.location.reload();
    };

    return { locale, t: translations[locale], updateLocale } as const;
}
