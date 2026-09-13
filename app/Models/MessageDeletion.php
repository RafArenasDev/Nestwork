<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * "Eliminar sólo para mí" — @see Message para "eliminar para todos".
 *
 * @property int $id
 * @property int $message_id
 * @property int $user_id
 * @property Carbon $deleted_at
 * @property-read Message $message
 * @property-read User $user
 */
#[Fillable(['message_id', 'user_id', 'deleted_at'])]
class MessageDeletion extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Message, $this>
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
