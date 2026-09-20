<?php

namespace App\Actions\Conversations;

use App\Data\ConversationSummary;
use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Favorite;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class ListConversationsForUser
{
    /**
     * @param  array<int, ConversationType>|null  $types  Null = todos los tipos (usado por el badge de no-leídos global). Chats pasa [Dm, GroupChat]; Grupos [Group]; Canales [Channel].
     * @param  bool  $favoritesOnly  Sólo conversaciones marcadas como favoritas (cualquier tipo) — alimenta el sidebar de "Inicio", que antes mostraba exactamente la misma lista que "Chats" (ver Favorite, tabla migrada desde 2026-09-13 y nunca usada hasta ahora).
     * @return Collection<int, ConversationSummary>
     */
    public function handle(User $user, Team $team, ?int $currentConversationId = null, bool $archivedOnly = false, ?array $types = null, bool $favoritesOnly = false): Collection
    {
        $favoriteConversationIds = Favorite::query()
            ->where('user_id', $user->id)
            ->where('favoritable_type', Conversation::class)
            ->pluck('favoritable_id');

        $query = $user->conversations()
            ->where('conversations.team_id', $team->id)
            // "Eliminar conversación" (hidden_at): no aparece en NINGÚN
            // listado hasta que se busque a propósito — ni activo ni
            // archivado.
            ->wherePivotNull('hidden_at')
            ->when($types, fn ($query) => $query->whereIn('conversations.type', array_map(fn ($type) => $type->value, $types)))
            ->when($favoritesOnly, fn ($query) => $query->whereIn('conversations.id', $favoriteConversationIds));

        if ($archivedOnly) {
            $query->wherePivotNotNull('archived_at');
        } else {
            $query->wherePivotNull('archived_at');
        }

        return $query
            ->with(['participants' => fn ($query) => $query->where('users.id', '!=', $user->id)])
            ->get()
            ->map(fn (Conversation $conversation) => $this->summarize($conversation, $user, $currentConversationId, $favoriteConversationIds))
            ->sortByDesc(fn (ConversationSummary $summary) => $summary->lastMessageAt ?? '')
            ->values();
    }

    /**
     * @param  Collection<int, int>  $favoriteConversationIds
     */
    private function summarize(Conversation $conversation, User $user, ?int $currentConversationId, Collection $favoriteConversationIds): ConversationSummary
    {
        $pivot = $conversation->pivot;

        abort_unless($pivot instanceof ConversationParticipant, 500);

        $lastMessage = Message::query()
            ->where('conversation_id', $conversation->id)
            ->latest('id')
            ->first();

        $unreadCount = Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', '!=', $user->id)
            ->when(
                $pivot->last_read_message_id,
                fn ($query, $lastReadId) => $query->where('id', '>', $lastReadId),
            )
            ->count();

        $otherParticipant = $conversation->participants->first();
        $isDm = $conversation->type === ConversationType::Dm;

        return new ConversationSummary(
            id: $conversation->id,
            type: $conversation->type->value,
            name: $conversation->displayNameFor($user),
            avatar: $isDm && $otherParticipant instanceof User ? $otherParticipant->avatar : $conversation->avatarUrl(),
            otherUserId: $isDm && $otherParticipant instanceof User ? $otherParticipant->id : null,
            presence: $isDm && $otherParticipant instanceof User ? $otherParticipant->presenceStatus() : null,
            statusEmoji: $isDm && $otherParticipant instanceof User ? $otherParticipant->status_emoji : null,
            statusText: $isDm && $otherParticipant instanceof User ? $otherParticipant->status_text : null,
            memberCount: $isDm ? null : $conversation->participants()->count(),
            lastMessageBody: $lastMessage?->body,
            lastMessageAt: $lastMessage instanceof Message ? $this->isoString($lastMessage->created_at) : null,
            unreadCount: $unreadCount,
            isMuted: $pivot->isMuted(),
            isArchived: $pivot->isArchived(),
            isFavorite: $favoriteConversationIds->contains($conversation->id),
            isCurrent: $conversation->id === $currentConversationId,
        );
    }

    private function isoString(?CarbonInterface $date): ?string
    {
        return $date?->toIso8601String();
    }
}
