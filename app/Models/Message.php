<?php

namespace App\Models;

use App\Enums\MessageType;
use Database\Factories\MessageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $conversation_id
 * @property int $user_id
 * @property MessageType $type
 * @property string $body
 * @property array<string, mixed>|null $metadata
 * @property int|null $reply_to_message_id
 * @property int|null $forwarded_from_message_id
 * @property int|null $forwarded_from_conversation_id
 * @property bool $is_hidden
 * @property Carbon|null $edited_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Conversation $conversation
 * @property-read User $user
 * @property-read Message|null $replyTo
 * @property-read Message|null $forwardedFromMessage
 * @property-read Conversation|null $forwardedFromConversation
 * @property-read Collection<int, Attachment> $attachments
 * @property-read Collection<int, Reaction> $reactions
 * @property-read Collection<int, MessageReceipt> $receipts
 * @property-read Collection<int, MessageDeletion> $deletions
 */
#[Fillable(['conversation_id', 'user_id', 'type', 'body', 'metadata', 'reply_to_message_id', 'forwarded_from_message_id', 'forwarded_from_conversation_id', 'is_hidden', 'edited_at'])]
class Message extends Model
{
    /** @use HasFactory<MessageFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => MessageType::class,
            'metadata' => 'array',
            'is_hidden' => 'boolean',
            'edited_at' => 'datetime',
        ];
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

    /**
     * @return BelongsTo<Message, $this>
     */
    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_message_id');
    }

    /**
     * @return BelongsTo<Message, $this>
     */
    public function forwardedFromMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'forwarded_from_message_id');
    }

    /**
     * @return BelongsTo<Conversation, $this>
     */
    public function forwardedFromConversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'forwarded_from_conversation_id');
    }

    /**
     * @return HasMany<Attachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    /**
     * @return HasMany<Reaction, $this>
     */
    public function reactions(): HasMany
    {
        return $this->hasMany(Reaction::class);
    }

    /**
     * @return HasMany<MessageReceipt, $this>
     */
    public function receipts(): HasMany
    {
        return $this->hasMany(MessageReceipt::class);
    }

    /**
     * @return HasMany<MessageDeletion, $this>
     */
    public function deletions(): HasMany
    {
        return $this->hasMany(MessageDeletion::class);
    }
}
