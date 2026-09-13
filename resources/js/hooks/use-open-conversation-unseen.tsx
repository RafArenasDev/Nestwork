import { useSyncExternalStore } from 'react';

/**
 * Cuántos mensajes sin leer hay AHORA MISMO en el chat que el usuario
 * tiene abierto (mientras está desplazado leyendo historial más
 * arriba) — el mismo número que ya alimenta el botón flotante "N
 * mensajes nuevos sin leer" en messages/index.tsx. Vive fuera de React
 * (mismo patrón que use-appearance.tsx) porque Thread y AppSidebar son
 * hermanos bajo AppSidebarLayout, sin ancestro común más cercano que
 * comparta estado: esto evita esperar el viaje de ida y vuelta al
 * backend (PATCH read + partial reload de Inertia) sólo para que el
 * badge del sidebar aparezca o se borre — Thread ya sabe el número al
 * instante, así que el sidebar lo lee directo de acá.
 */
type OpenConversationUnseen = {
    readonly conversationId: number | null;
    readonly count: number;
};

const listeners = new Set<() => void>();
let state: OpenConversationUnseen = { conversationId: null, count: 0 };

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function setOpenConversationUnseen(
    conversationId: number,
    count: number,
): void {
    state = { conversationId, count };
    notify();
}

/** Al cerrar el chat o desmontar Thread — así una conversación cerrada
 *  nunca se queda "pegada" mostrando el último conteo que tuvo. */
export function clearOpenConversationUnseen(conversationId: number): void {
    if (state.conversationId !== conversationId) {
        return;
    }

    state = { conversationId: null, count: 0 };
    notify();
}

export function useOpenConversationUnseen(): OpenConversationUnseen {
    return useSyncExternalStore(
        subscribe,
        () => state,
        () => ({ conversationId: null, count: 0 }),
    );
}
