<?php

namespace App\Actions\Conversations;

use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Carbon;

class StartConversationWithUser
{
    /**
     * Find the existing DM between the two users on this team, or create it.
     */
    public function handle(User $user, User $other, Team $team): Conversation
    {
        $existing = Conversation::query()
            ->where('team_id', $team->id)
            ->where('type', ConversationType::Dm)
            ->whereHas('participants', fn ($query) => $query->where('users.id', $user->id))
            ->whereHas('participants', fn ($query) => $query->where('users.id', $other->id))
            ->first();

        if ($existing) {
            return $existing;
        }

        $conversation = Conversation::query()->create([
            'team_id' => $team->id,
            'type' => ConversationType::Dm,
            'name' => null,
            'created_by' => $user->id,
        ]);

        $joinedAt = Carbon::now();

        $conversation->participants()->attach([
            $user->id => ['joined_at' => $joinedAt],
            $other->id => ['joined_at' => $joinedAt],
        ]);

        return $conversation;
    }
}
