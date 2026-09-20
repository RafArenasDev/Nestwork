<?php

namespace App\Actions\Conversations;

use App\Enums\ConversationParticipantRole;
use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * "Grupo" formal — quien lo crea queda como admin (puede configurar
 * nombre/descripción/miembros más adelante); el resto entra como
 * member. Mensajería libre + hilos (`ConversationType::supportsThreads()`).
 */
class CreateGroup
{
    /**
     * @param  array<int, int>  $memberUserIds
     */
    public function handle(User $creator, array $memberUserIds, Team $team, string $name, ?string $description = null): Conversation
    {
        $conversation = Conversation::query()->create([
            'team_id' => $team->id,
            'type' => ConversationType::Group,
            'name' => $name,
            'description' => $description,
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
