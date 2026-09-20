<?php

namespace App\Actions\Conversations;

use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * "Minichat": grupo informal de varios integrantes dentro de Chats —
 * sin admin, todos con los mismos permisos (`role` queda null en los
 * participantes, igual que en un DM). Distinto de `CreateGroup`
 * (módulo aparte, con admin/configuración).
 */
class CreateGroupChat
{
    /**
     * @param  array<int, int>  $otherUserIds
     */
    public function handle(User $creator, array $otherUserIds, Team $team, ?string $name = null): Conversation
    {
        $conversation = Conversation::query()->create([
            'team_id' => $team->id,
            'type' => ConversationType::GroupChat,
            'name' => $name,
            'created_by' => $creator->id,
        ]);

        $joinedAt = Carbon::now();
        $rows = [$creator->id => ['joined_at' => $joinedAt]];

        foreach (array_unique($otherUserIds) as $userId) {
            if ($userId !== $creator->id) {
                $rows[$userId] = ['joined_at' => $joinedAt];
            }
        }

        $conversation->participants()->attach($rows);

        return $conversation;
    }
}
