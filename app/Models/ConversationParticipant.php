<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $conversation_id
 * @property int $user_id
 * @property Carbon $joined_at
 * @property Carbon|null $muted_at
 * @property Carbon|null $archived_at
 * @property int|null $last_read_message_id
 * @property-read Conversation $conversation
 * @property-read User $user
 */
#[Fillable(['conversation_id', 'user_id', 'joined_at', 'muted_at', 'archived_at', 'last_read_message_id'])]
class ConversationParticipant extends Pivot
{
    protected $table = 'conversation_participants';

    public $incrementing = true;

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'muted_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    public function isMuted(): bool
    {
        return $this->muted_at !== null;
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    /**
     * @return BelongsTo<Conversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
