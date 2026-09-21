<?php

namespace App\Actions\Conversations;

use App\Enums\ConversationParticipantRole;
use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * "Canal" — sólo el admin/creador publica en la línea principal, el
 * resto responde en hilos (`ConversationType::restrictsTopLevelPostingToAdmin()`,
 * aplicado en `MessagesController::store`). Público (`is_public`):
 * cualquier miembro del equipo puede unirse solo, sin invitación —
 * ver `ChannelsController::join`.
 */
class CreateChannel
{
    /**
     * @param  array<int, int>  $memberUserIds
     */
    public function handle(User $creator, array $memberUserIds, Team $team, string $name, bool $isPublic, ?string $description = null): Conversation
    {
        $conversation = Conversation::query()->create([
            'team_id' => $team->id,
            'type' => ConversationType::Channel,
            'name' => $name,
            'description' => $description,
            'is_public' => $isPublic,
            'created_by' => $creator->id,
        ]);

        $joinedAt = Carbon::now();
        $rows = [
            $creator->id => ['joined_at' => $joinedAt, 'role' => ConversationParticipantRole::Admin],
        ];

        foreach (array_unique($memberUserIds) as $userId) {
            if ($userId !== $creator->id) {
                $rows[$userId] = ['joined_at' => $joinedAt, 'role' => ConversationParticipantRole::Member];
            }
        }

        $conversation->participants()->attach($rows);

        return $conversation;
    }
}
