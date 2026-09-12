<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\ListConversationsForUser;
use App\Data\MessageData;
use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MessagesController extends Controller
{
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

        $messages = $conversation->messages()
            ->with('user')
            ->orderBy('id')
            ->get()
            ->map(fn (Message $message) => new MessageData(
                id: $message->id,
                body: $message->body,
                createdAt: $message->created_at->toIso8601String(),
                editedAt: $message->edited_at?->toIso8601String(),
                userId: $message->user_id,
                userName: $message->user->name,
                userAvatar: $message->user->avatar,
                isMine: $message->user_id === $user->id,
                status: $message->user_id === $user->id
                    ? ($readThreshold !== null && $readThreshold >= $message->id ? 'read' : 'sent')
                    : 'sent',
            ));

        $conversation->participants()->updateExistingPivot($user->id, [
            'last_read_message_id' => $messages->last()?->id,
        ]);

        $pivot = $conversation->participants()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot;

        abort_unless($pivot instanceof ConversationParticipant, 500);

        $otherParticipant = $conversation->participants()
            ->where('users.id', '!=', $user->id)
            ->first();

        return Inertia::render('messages/index', [
            'conversations' => $this->listConversations->handle($user, $team, $conversation->id),
            // Si la conversación abierta está archivada, no aparece en
            // la lista de arriba (se filtra) — necesita su propio
            // "isCurrent" acá para que la gotera también aplique en la
            // pestaña Archivado.
            'archivedConversations' => $this->listConversations->handle($user, $team, $conversation->id, archivedOnly: true),
            'conversation' => [
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
            ],
            'messages' => $messages,
        ]);
    }

    public function store(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
        ]);

        $message = $conversation->messages()->create([
            'user_id' => $user->id,
            'body' => $validated['body'],
        ]);

        $conversation->participants()->updateExistingPivot($user->id, [
            'last_read_message_id' => $message->id,
        ]);

        return back();
    }
}
