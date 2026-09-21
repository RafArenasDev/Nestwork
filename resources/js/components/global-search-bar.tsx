import { router, usePage } from '@inertiajs/react';
import { Check, ListFilter, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PresenceDot } from '@/components/presence-dot';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useInitials } from '@/hooks/use-initials';
import { search as searchRoute } from '@/routes';
import { show as showMessage } from '@/routes/messages';
import type {
    ActiveConversation,
    ConversationSummary,
} from '@/types/conversations';

type Scope = 'team' | 'conversation';
type ResultTypes = { conversations: boolean; messages: boolean };

/** El botón "Buscar en el chat" del header de una conversación
 *  (messages/index.tsx) dispara este evento en vez de tener su propio
 *  buscador — un solo buscador unificado, sólo cambia su alcance. */
export const FOCUS_CONVERSATION_SEARCH_EVENT =
    'nestwork:focus-conversation-search';

type MessageResult = {
    id: number;
    conversationId: number;
    conversationName: string;
    senderName: string;
    senderAvatar: string | null;
    excerpt: string;
    createdAt: string | null;
};

/**
 * Barra de búsqueda global del header del contenido — SIEMPRE visible
 * (pedido explícito), a diferencia del buscador de la sidebar (que sólo
 * filtra la lista del módulo activo). Conversaciones se filtran
 * client-side (ya viajan enteras en `conversations`); mensajes van al
 * backend (`SearchController`) porque el historial completo no está
 * cargado en el cliente.
 */
export function GlobalSearchBar() {
    const page = usePage();
    const currentTeam = page.props.currentTeam;
    const conversations = page.props.conversations ?? [];
    // Sólo presente en messages/show — habilita el filtro "Esta
    // conversación" (buscar dentro del chat/grupo/canal abierto en vez
    // de en todo el equipo).
    const openConversation = page.props.conversation as
        | ActiveConversation
        | null
        | undefined;
    const getInitials = useInitials();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [scope, setScope] = useState<Scope>('team');
    const [types, setTypes] = useState<ResultTypes>({
        conversations: true,
        messages: true,
    });
    const [messageResults, setMessageResults] = useState<MessageResult[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const requestId = useRef(0);

    useEffect(() => {
        function handleFocusRequest() {
            if (!openConversation) {
                return;
            }

            setScope('conversation');
            setOpen(true);
            inputRef.current?.focus();
        }

        window.addEventListener(
            FOCUS_CONVERSATION_SEARCH_EVENT,
            handleFocusRequest,
        );

        return () =>
            window.removeEventListener(
                FOCUS_CONVERSATION_SEARCH_EVENT,
                handleFocusRequest,
            );
    }, [openConversation]);

    // El filtro de alcance sólo tiene sentido con un chat abierto — si
    // se navega fuera de un chat mientras estaba en "Esta conversación",
    // vuelve a "Todo el equipo" en vez de quedar en un estado inválido.
    useEffect(() => {
        if (!openConversation && scope === 'conversation') {
            setScope('team');
        }
    }, [openConversation, scope]);

    const conversationResults = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase('es');

        if (
            normalized.length < 2 ||
            !types.conversations ||
            scope === 'conversation'
        ) {
            return [];
        }

        return conversations
            .filter((conversation) =>
                conversation.name.toLocaleLowerCase('es').includes(normalized),
            )
            .slice(0, 5);
    }, [conversations, query, types.conversations, scope]);

    useEffect(() => {
        const normalized = query.trim();

        if (normalized.length < 2 || !currentTeam || !types.messages) {
            setMessageResults([]);
            setLoading(false);

            return;
        }

        setLoading(true);
        const thisRequest = ++requestId.current;
        const timeout = setTimeout(() => {
            fetch(
                searchRoute([currentTeam.slug], {
                    query: {
                        q: normalized,
                        ...(scope === 'conversation' && openConversation
                            ? { conversation_id: openConversation.id }
                            : {}),
                    },
                }).url,
                { headers: { Accept: 'application/json' } },
            )
                .then((response) => response.json())
                .then((data: { messages: MessageResult[] }) => {
                    if (requestId.current === thisRequest) {
                        setMessageResults(data.messages);
                        setLoading(false);
                    }
                })
                .catch(() => {
                    if (requestId.current === thisRequest) {
                        setLoading(false);
                    }
                });
        }, 250);

        return () => clearTimeout(timeout);
    }, [query, currentTeam, scope, openConversation, types.messages]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);

        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const goToConversation = (conversation: ConversationSummary) => {
        if (!currentTeam) {
            return;
        }

        router.visit(showMessage([currentTeam.slug, conversation.id]).url, {
            preserveUrl: true,
            preserveScroll: true,
            only: [
                'conversation',
                'messages',
                'conversations',
                'archivedConversations',
            ],
        });
        setOpen(false);
        setQuery('');
    };

    const goToMessage = (result: MessageResult) => {
        if (!currentTeam) {
            return;
        }

        router.visit(
            showMessage([currentTeam.slug, result.conversationId], {
                query: { message: result.id },
            }).url,
            {
                preserveUrl: true,
                preserveScroll: true,
                only: [
                    'conversation',
                    'messages',
                    'conversations',
                    'archivedConversations',
                    'jumpToMessageId',
                ],
            },
        );
        setOpen(false);
        setQuery('');
    };

    const hasQuery = query.trim().length >= 2;
    const hasResults =
        conversationResults.length > 0 || messageResults.length > 0;
    const filtersActive =
        scope === 'conversation' || !types.conversations || !types.messages;
    const placeholder =
        scope === 'conversation' && openConversation
            ? `Buscar en ${openConversation.name}…`
            : 'Buscar conversaciones, grupos, canales y mensajes…';

    return (
        <div
            ref={containerRef}
            className="relative z-20 mx-auto w-full max-w-2xl"
        >
            <div className="global-search-input">
                <Search aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    aria-label="Buscar conversaciones y mensajes"
                />
                {query && (
                    <button
                        type="button"
                        aria-label="Limpiar búsqueda"
                        onClick={() => {
                            setQuery('');
                            setMessageResults([]);
                        }}
                        className="global-search-clear"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            aria-label="Filtros de búsqueda"
                            data-active={filtersActive || undefined}
                            className="global-search-filter"
                        >
                            <ListFilter className="size-3.5" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="end"
                        className="glass-popover w-auto p-3"
                    >
                        <div className="global-search-filter-panel">
                            <div>
                                <span className="global-search-filter-section-label">
                                    Buscar en
                                </span>
                                <button
                                    type="button"
                                    className="global-search-filter-option"
                                    onClick={() => setScope('team')}
                                >
                                    <Check
                                        className={`size-3.5 ${scope === 'team' ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    Todo el equipo
                                </button>
                                <button
                                    type="button"
                                    disabled={!openConversation}
                                    className="global-search-filter-option disabled:opacity-40"
                                    onClick={() => setScope('conversation')}
                                >
                                    <Check
                                        className={`size-3.5 ${scope === 'conversation' ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    Esta conversación
                                </button>
                            </div>
                            <div>
                                <span className="global-search-filter-section-label">
                                    Tipo de resultado
                                </span>
                                <button
                                    type="button"
                                    className="global-search-filter-option"
                                    onClick={() =>
                                        setTypes((prev) => ({
                                            ...prev,
                                            conversations: !prev.conversations,
                                        }))
                                    }
                                >
                                    <Check
                                        className={`size-3.5 ${types.conversations ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    Conversaciones, grupos y canales
                                </button>
                                <button
                                    type="button"
                                    className="global-search-filter-option"
                                    onClick={() =>
                                        setTypes((prev) => ({
                                            ...prev,
                                            messages: !prev.messages,
                                        }))
                                    }
                                >
                                    <Check
                                        className={`size-3.5 ${types.messages ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    Mensajes
                                </button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {open && hasQuery && (
                <div className="glass-popover global-search-results">
                    {conversationResults.length > 0 && (
                        <div className="global-search-group">
                            <span className="global-search-group-label">
                                Conversaciones
                            </span>
                            {conversationResults.map((conversation) => (
                                <button
                                    key={conversation.id}
                                    type="button"
                                    className="global-search-row"
                                    onClick={() =>
                                        goToConversation(conversation)
                                    }
                                >
                                    <span className="relative inline-flex shrink-0">
                                        <Avatar className="size-8">
                                            {conversation.avatar && (
                                                <AvatarImage
                                                    src={conversation.avatar}
                                                    alt={conversation.name}
                                                />
                                            )}
                                            <AvatarFallback className="text-[10px]">
                                                {getInitials(conversation.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {conversation.presence && (
                                            <PresenceDot
                                                presence={conversation.presence}
                                                surfaceTone="var(--popover)"
                                            />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                        {conversation.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {messageResults.length > 0 && (
                        <div className="global-search-group">
                            <span className="global-search-group-label">
                                Mensajes
                            </span>
                            {messageResults.map((result) => (
                                <button
                                    key={result.id}
                                    type="button"
                                    className="global-search-row global-search-row--message"
                                    onClick={() => goToMessage(result)}
                                >
                                    <Avatar className="size-8 shrink-0">
                                        {result.senderAvatar && (
                                            <AvatarImage
                                                src={result.senderAvatar}
                                                alt={result.senderName}
                                            />
                                        )}
                                        <AvatarFallback className="text-[10px]">
                                            {getInitials(result.senderName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="min-w-0 flex-1 text-left">
                                        <span className="flex items-center gap-1.5 text-sm">
                                            <span className="font-medium">
                                                {result.senderName}
                                            </span>
                                            <span className="text-muted-foreground truncate text-xs">
                                                en {result.conversationName}
                                            </span>
                                        </span>
                                        <span className="text-muted-foreground block truncate text-xs">
                                            {result.excerpt}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && !hasResults && (
                        <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                            Sin resultados para "{query.trim()}".
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
