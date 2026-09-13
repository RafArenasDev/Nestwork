<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\ListConversationsForUser;
use App\Data\MessageData;
use App\Enums\ConversationType;
use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MessagesController extends Controller
{
    private const INITIAL_MESSAGE_LIMIT = 150;

    public function __construct(private readonly ListConversationsForUser $listConversations)
    {
        //
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team, 404);

        return Inertia::render('messages/index', [
            'conversations' => $this->listConversations->handle($user, $team),
            'conversation' => null,
            'messages' => [],
        ]);
    }

    public function show(Request $request, string $current_team, Conversation $conversation): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($user->belongsToTeam($team) && $conversation->participants()->where('users.id', $user->id)->exists(), 403);

        return Inertia::render('messages/index', [
            // Closures: Inertia sólo las evalúa cuando el prop fue
            // realmente pedido (visita completa o partial reload que lo
            // incluya en `only`). CRÍTICO para 'messages': es la única
            // que marca la conversación como leída — el refresco de
            // fondo del sidebar (badge de no-leídos, `.MessageSent` en
            // app-sidebar-layout.tsx) pide sólo `only:
            // ['conversations','archivedConversations']`, así que con
            // esto NUNCA dispara el marcado-como-leído. Antes era un
            // array plano ya resuelto arriba, y por eso cada mensaje
            // nuevo marcaba la conversación abierta como leída al
            // instante (aunque el usuario estuviera desplazado leyendo
            // historial), y el badge del chat seleccionado jamás llegaba
            // a mostrarse.
            'messages' => fn () => $this->loadMessagesAndMarkRead($conversation, $user),
            'conversation' => fn () => $this->buildConversationPayload($conversation, $user),
            'conversations' => fn () => $this->listConversations->handle($user, $team, $conversation->id),
            // Si la conversación abierta está archivada, no aparece en
            // la lista de arriba (se filtra) — necesita su propio
            // "isCurrent" acá para que la gotera también aplique en la
            // pestaña Archivado.
            'archivedConversations' => fn () => $this->listConversations->handle($user, $team, $conversation->id, archivedOnly: true),
        ]);
    }

    /**
     * @return Collection<int, MessageData>
     */
    private function loadMessagesAndMarkRead(Conversation $conversation, User $user)
    {
        // "Leído" real: sólo si TODOS los demás participantes ya marcaron
        // last_read_message_id — para un DM es uno solo, para un grupo
        // exige que el más rezagado también lo haya visto.
        $otherLastReadIds = $conversation->participants()
            ->where('users.id', '!=', $user->id)
            ->get()
            ->pluck('pivot.last_read_message_id');

        $readThreshold = $otherLastReadIds->isNotEmpty() && $otherLastReadIds->every(fn (?int $id) => $id !== null)
            ? $otherLastReadIds->min()
            : null;

        // Tope de seguridad mientras no existe paginación por cursor
        // (sección 4.1/Fase F del prompt v2): sin esto, una conversación
        // de miles de mensajes (el seeder de demo ya deja algunas así)
        // cargaba la tabla ENTERA en cada visita — lento en el backend
        // y pesado de renderizar en el frontend. `INITIAL_MESSAGE_LIMIT`
        // trae sólo los más recientes; "cargar más hacia arriba" queda
        // pendiente de esa fase.
        $messages = $conversation->messages()
            ->with(['user', 'replyTo.user'])
            ->orderByDesc('id')
            ->limit(self::INITIAL_MESSAGE_LIMIT)
            ->get()
            ->sortBy('id')
            ->values()
            ->map(fn (Message $message) => new MessageData(
                id: $message->id,
                body: $message->body,
                createdAt: $message->created_at->toIso8601String(),
                editedAt: $message->edited_at?->toIso8601String(),
                userId: $message->user_id,
                userName: $message->user->name,
                userAvatar: $message->user->avatar,
                isMine: $message->user_id === $user->id,
                replyToId: $message->replyTo?->id,
                replyToUserName: $message->replyTo?->user->name,
                replyToBody: $message->replyTo?->body,
                status: $message->user_id === $user->id
                    ? ($readThreshold !== null && $readThreshold >= $message->id ? 'read' : 'sent')
                    : 'sent',
            ));

        $conversation->participants()->updateExistingPivot($user->id, [
            'last_read_message_id' => $messages->last()?->id,
        ]);

        return $messages;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildConversationPayload(Conversation $conversation, User $user): array
    {
        $pivot = $conversation->participants()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot;

        abort_unless($pivot instanceof ConversationParticipant, 500);

        $otherParticipant = $conversation->participants()
            ->where('users.id', '!=', $user->id)
            ->first();

        return [
            'id' => $conversation->id,
            'name' => $conversation->displayNameFor($user),
            'type' => $conversation->type->value,
            'avatar' => $otherParticipant instanceof User ? $otherParticipant->avatar : null,
            'otherUserId' => $conversation->type === ConversationType::Dm && $otherParticipant instanceof User
                ? $otherParticipant->id
                : null,
            'presence' => $conversation->type === ConversationType::Dm && $otherParticipant instanceof User
                ? $otherParticipant->presenceStatus()
                : null,
            'isArchived' => $pivot->isArchived(),
            'isMuted' => $pivot->isMuted(),
        ];
    }

    public function store(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
            'reply_to_message_id' => [
                'nullable',
                'integer',
                Rule::exists('messages', 'id')->where('conversation_id', $conversation->id),
            ],
        ]);

        $message = $conversation->messages()->create([
            'user_id' => $user->id,
            'body' => $validated['body'],
            'reply_to_message_id' => $validated['reply_to_message_id'] ?? null,
        ]);

        $conversation->participants()->updateExistingPivot($user->id, [
            'last_read_message_id' => $message->id,
        ]);

        broadcast(new MessageSent($message))->toOthers();

        // No usar back(): la sesión registra como "URL anterior" la última
        // petición GET real, que es messages.show — pero el navegador se
        // quedó en /messages (preserveUrl, sección "nada de IDs en la
        // URL"). Redirigir explícito a messages.show devuelve las props
        // correctas (conversation/messages) sin depender de ese estado.
        return redirect()->route('messages.show', [$current_team, $conversation]);
    }

    /**
     * Ping silencioso al llegar al fondo del chat en vivo: NO es una
     * visita Inertia (nada de props/render) — sólo actualiza
     * last_read_message_id y dispara MessageRead para que los demás
     * participantes vean sus checks de "leído" en tiempo real.
     */
    public function markRead(Request $request, string $current_team, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);

        $lastMessageId = $conversation->messages()->max('id');

        $conversation->participants()->updateExistingPivot($user->id, [
            'last_read_message_id' => $lastMessageId,
        ]);

        broadcast(new MessageRead($conversation, $user->id, $lastMessageId));

        return response()->json(['lastReadMessageId' => $lastMessageId]);
    }
}
