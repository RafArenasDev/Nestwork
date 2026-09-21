import { useSyncExternalStore } from 'react';

/**
 * "Etiquetas" tipo secciones de Slack (ej. "API-Chat", "Frontend") —
 * agrupan chats/grupos/canales elegidos a mano, cruzando los tres
 * tipos. Es un pedido explícito de diseño/visual para esta ronda —
 * vive en localStorage (mismo patrón que use-customization.tsx) a
 * propósito: agregar una tabla real (con quién puede ver/editar cada
 * etiqueta en equipo) es una decisión de backend que todavía no se
 * propuso ni aprobó. Si el usuario confirma que esto debe ser
 * compartido con el equipo, ese es el momento de proponer el modelo.
 */
export type ConversationTag = {
    id: string;
    name: string;
    conversationIds: number[];
};

type TagsState = { tags: ConversationTag[] };

const DEFAULT_STATE: TagsState = { tags: [] };
const STORAGE_KEY = 'nestwork-conversation-tags';
const listeners = new Set<() => void>();
let current: TagsState = DEFAULT_STATE;

function readStored(): TagsState {
    if (typeof window === 'undefined') {
        return DEFAULT_STATE;
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        return raw
            ? { ...DEFAULT_STATE, ...(JSON.parse(raw) as TagsState) }
            : DEFAULT_STATE;
    } catch {
        return DEFAULT_STATE;
    }
}

function persist(next: TagsState): void {
    current = next;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Cuota llena o localStorage bloqueado (privado/incógnito) — la
        // sesión sigue andando con el estado en memoria, sin persistir.
    }

    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

function getSnapshot(): TagsState {
    return current;
}

function getServerSnapshot(): TagsState {
    return DEFAULT_STATE;
}

export function initializeConversationTags(): void {
    current = readStored();
}

export function createConversationTag(name: string): void {
    const trimmed = name.trim();

    if (trimmed === '') {
        return;
    }

    persist({
        tags: [
            ...current.tags,
            { id: crypto.randomUUID(), name: trimmed, conversationIds: [] },
        ],
    });
}

export function deleteConversationTag(tagId: string): void {
    persist({ tags: current.tags.filter((tag) => tag.id !== tagId) });
}

export function toggleConversationInTag(
    tagId: string,
    conversationId: number,
): void {
    persist({
        tags: current.tags.map((tag) => {
            if (tag.id !== tagId) {
                return tag;
            }

            return {
                ...tag,
                conversationIds: tag.conversationIds.includes(conversationId)
                    ? tag.conversationIds.filter((id) => id !== conversationId)
                    : [...tag.conversationIds, conversationId],
            };
        }),
    });
}

export function useConversationTags(): ConversationTag[] {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).tags;
}
