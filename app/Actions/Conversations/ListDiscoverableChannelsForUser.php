<?php

namespace App\Actions\Conversations;

use App\Data\ConversationSummary;
use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Canales públicos del equipo a los que el usuario todavía NO se unió
 * — para la sección "Descubrir" del módulo Canales (`ChannelsController::join`).
 * Un canal privado (`is_public = false`) sólo se ve si ya te invitaron
 * a él (entonces vive en `channelConversations`, no acá).
 */
class ListDiscoverableChannelsForUser
{
    /**
     * @return Collection<int, ConversationSummary>
     */
    public function handle(User $user, Team $team): Collection
    {
        return Conversation::query()
            ->where('team_id', $team->id)
            ->where('type', ConversationType::Channel)
            ->where('is_public', true)
            ->whereDoesntHave('participants', fn ($query) => $query->where('users.id', $user->id))
            ->with('participants')
            ->get()
            ->map(fn (Conversation $conversation) => new ConversationSummary(
                id: $conversation->id,
                type: $conversation->type->value,
                name: $conversation->displayNameFor($user),
                avatar: $conversation->avatarUrl(),
                otherUserId: null,
                presence: null,
                statusEmoji: null,
                statusText: null,
                memberCount: $conversation->participants->count(),
                lastMessageBody: null,
                lastMessageAt: null,
                unreadCount: 0,
                isMuted: false,
                isArchived: false,
                isCurrent: false,
            ))
            ->values();
    }
}
