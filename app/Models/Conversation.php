<?php

namespace App\Models;

use App\Enums\ConversationType;
use Database\Factories\ConversationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $team_id
 * @property ConversationType $type
 * @property string|null $name
 * @property bool $is_public
 * @property string|null $avatar_path
 * @property string|null $description
 * @property bool $is_ephemeral
 * @property int|null $ephemeral_ttl_seconds
 * @property int|null $default_message_ttl_seconds
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read User $creator
 * @property-read Collection<int, Message> $messages
 * @property-read Collection<int, User> $participants
 * @property-read Collection<int, ConversationParticipant> $conversationParticipants
 * @property-read ConversationParticipant|null $pivot Only set when loaded through User::conversations().
 */
#[Fillable(['team_id', 'type', 'name', 'is_public', 'avatar_path', 'description', 'is_ephemeral', 'ephemeral_ttl_seconds', 'default_message_ttl_seconds', 'created_by'])]
class Conversation extends Model
{
    /** @use HasFactory<ConversationFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => ConversationType::class,
            'is_public' => 'boolean',
            'is_ephemeral' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * @return HasMany<ConversationParticipant, $this>
     */
    public function conversationParticipants(): HasMany
    {
        return $this->hasMany(ConversationParticipant::class);
    }

    /**
     * @return BelongsToMany<User, $this, ConversationParticipant, 'pivot'>
     */
    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_participants')
            ->using(ConversationParticipant::class)
            ->withPivot(['joined_at', 'muted_at', 'archived_at', 'hidden_at', 'role', 'last_read_message_id'])
            ->withTimestamps();
    }

    /**
     * Get the display name of the conversation for the given viewer.
     * DMs have no name of their own — it's the other participant's name.
     */
    public function displayNameFor(User $viewer): string
    {
        if ($this->name !== null) {
            return $this->name;
        }

        $other = $this->participants->firstWhere('id', '!=', $viewer->id);

        return $other instanceof User ? $other->name : $viewer->name;
    }
}
