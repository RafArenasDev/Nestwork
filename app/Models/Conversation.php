<?php

namespace App\Models;

use App\Enums\ConversationParticipantRole;
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
use Illuminate\Support\Facades\Storage;

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
 * @property int|null $pinned_message_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team $team
 * @property-read User $creator
 * @property-read Collection<int, Message> $messages
 * @property-read Collection<int, User> $participants
 * @property-read Collection<int, ConversationParticipant> $conversationParticipants
 * @property-read Message|null $pinnedMessage
 * @property-read ConversationParticipant|null $pivot Only set when loaded through User::conversations().
 */
#[Fillable(['team_id', 'type', 'name', 'is_public', 'avatar_path', 'description', 'is_ephemeral', 'ephemeral_ttl_seconds', 'default_message_ttl_seconds', 'created_by', 'pinned_message_id'])]
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
            ->withPivot(['joined_at', 'muted_at', 'archived_at', 'hidden_at', 'cleared_at', 'role', 'last_read_message_id'])
            ->withTimestamps();
    }

    /**
     * @return BelongsTo<Message, $this>
     */
    public function pinnedMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'pinned_message_id');
    }

    /**
     * Get the display name of the conversation for the given viewer.
     * DMs (y un minichat sin nombre puesto) no tienen nombre propio: se
     * arma con los otros participantes — uno solo (DM) es su nombre;
     * varios (minichat) se listan separados por coma.
     */
    public function displayNameFor(User $viewer): string
    {
        if ($this->name !== null) {
            return $this->name;
        }

        $others = $this->participants->where('id', '!=', $viewer->id);

        if ($others->isEmpty()) {
            return $viewer->name;
        }

        return $others->pluck('name')->implode(', ');
    }

    /** Avatar propio de un group_chat/group/channel (los DM usan el
     *  avatar del otro participante, resuelto aparte). */
    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null;
    }

    /** Rol del participante dado en ESTA conversación — null en DM/
     *  minichat (`isFlatChat()`, sin jerarquía) o si no es participante. */
    public function roleFor(User $user): ?ConversationParticipantRole
    {
        return $this->conversationParticipants
            ->firstWhere('user_id', $user->id)
            ?->role;
    }

    public function isAdmin(User $user): bool
    {
        return $this->created_by === $user->id || $this->roleFor($user) === ConversationParticipantRole::Admin;
    }
}
