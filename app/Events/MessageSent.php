<?php

namespace App\Events;

use App\Data\AttachmentData;
use App\Data\MessageData;
use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Se dispara al crear un mensaje (`MessagesController::store`) y llega
 * tanto al hilo abierto (`conversation.{id}`, para pintar el mensaje en
 * vivo) como al canal privado de cada participante (`App.Models.User.
 * {id}`, ya usado por `presence-team`) — así el sidebar/contador de no
 * leídos se puede refrescar aunque el usuario esté en otra pantalla.
 */
class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public Message $message)
    {
        //
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('conversation.'.$this->message->conversation_id),
        ];

        foreach ($this->message->conversation->participants as $participant) {
            $channels[] = new PrivateChannel('App.Models.User.'.$participant->id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'MessageSent';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $viewer = $this->message->user;

        return [
            'conversationId' => $this->message->conversation_id,
            'message' => new MessageData(
                id: $this->message->id,
                body: $this->message->body,
                createdAt: $this->message->created_at->toIso8601String(),
                editedAt: $this->message->edited_at?->toIso8601String(),
                userId: $this->message->user_id,
                userName: $viewer->name,
                userAvatar: $viewer->avatar,
                // Se recalcula por cada destinatario en el frontend (el
                // payload no sabe "para quién" se está renderizando) —
                // acá siempre false, el cliente compara userId === auth.user.id.
                isMine: false,
                replyToId: $this->message->replyTo?->id,
                replyToUserName: $this->message->replyTo?->user->name,
                replyToBody: $this->message->replyTo?->body,
                status: 'sent',
                attachments: AttachmentData::collectionFor($this->message),
            ),
        ];
    }
}
