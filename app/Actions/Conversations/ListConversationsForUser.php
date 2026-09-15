<?php

namespace App\Actions\Conversations;

use App\Data\ConversationSummary;
use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class ListConversationsForUser
{
    /**
     * @return Collection<int, ConversationSummary>
     */
    public function handle(User $user, Team $team, ?int $currentConversationId = null, bool $archivedOnly = false): Collection
    {
        $query = $user->conversations()
            ->where('conversations.team_id', $team->id)
            // "Eliminar conversación" (hidden_at): no aparece en NINGÚN
            // listado hasta que se busque a propósito — ni activo ni
            // archivado.
            ->wherePivotNull('hidden_at');

        if ($archivedOnly) {
            $query->wherePivotNotNull('archived_at');
        } else {
            $query->wherePivotNull('archived_at');
        }

        return $query
            ->with(['participants' => fn ($query) => $query->where('users.id', '!=', $user->id)])
            ->get()
            ->map(fn (Conversation $conversation) => $this->summarize($conversation, $user, $currentConversationId))
            ->sortByDesc(fn (ConversationSummary $summary) => $summary->lastMessageAt ?? '')
            ->values();
    }

    private function summarize(Conversation $conversation, User $user, ?int $currentConversationId): ConversationSummary
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

        return new ConversationSummary(
            id: $conversation->id,
            type: $conversation->type->value,
            name: $conversation->displayNameFor($user),
            avatar: $otherParticipant instanceof User ? $otherParticipant->avatar : null,
            presence: $conversation->type === ConversationType::Dm && $otherParticipant instanceof User
                ? $otherParticipant->presenceStatus()
                : null,
            lastMessageBody: $lastMessage?->body,
            lastMessageAt: $lastMessage instanceof Message ? $this->isoString($lastMessage->created_at) : null,
            unreadCount: $unreadCount,
            isMuted: $pivot->isMuted(),
            isArchived: $pivot->isArchived(),
            isCurrent: $conversation->id === $currentConversationId,
        );
    }

    private function isoString(?CarbonInterface $date): ?string
    {
        return $date?->toIso8601String();
    }
}
