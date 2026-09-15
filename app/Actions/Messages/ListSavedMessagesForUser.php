<?php

namespace App\Actions\Messages;

use App\Data\SavedMessageSummary;
use App\Models\Message;
use App\Models\SavedMessage;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Collection;

class ListSavedMessagesForUser
{
    /**
     * @return Collection<int, SavedMessageSummary>
     */
    public function handle(User $user, Team $team): Collection
    {
        return SavedMessage::query()
            ->where('user_id', $user->id)
            ->whereHas(
                'message.conversation',
                fn ($query) => $query->where('team_id', $team->id)
                    ->whereHas('participants', fn ($query) => $query->where('users.id', $user->id)),
            )
            // Si mientras tanto lo eliminó sólo para sí mismo, ya no
            // tiene acceso al mensaje en el chat — tampoco debe verlo acá.
            ->whereDoesntHave('message.deletions', fn ($query) => $query->where('user_id', $user->id))
            ->with(['message.user', 'message.conversation.participants', 'message.attachments'])
            ->latest('created_at')
            ->get()
            ->map(fn (SavedMessage $saved) => $this->summarize($saved, $user))
            ->values();
    }

    private function summarize(SavedMessage $saved, User $user): SavedMessageSummary
    {
        $message = $saved->message;
        $conversation = $message->conversation;

        return new SavedMessageSummary(
            messageId: $message->id,
            conversationId: $conversation->id,
            conversationName: $conversation->displayNameFor($user),
            senderName: $message->user->name,
            senderAvatar: $message->user->avatar,
            excerpt: $this->excerptFor($message),
            messageCreatedAt: $message->created_at->toIso8601String(),
            savedAt: $saved->created_at->toIso8601String(),
            isMine: $message->user_id === $user->id,
        );
    }

    private function excerptFor(Message $message): string
    {
        if ($message->is_hidden) {
            return 'Mensaje eliminado';
        }

        if ($message->body !== '') {
            return $message->body;
        }

        return $message->attachments->isNotEmpty() ? '📎 Adjunto' : '';
    }
}
