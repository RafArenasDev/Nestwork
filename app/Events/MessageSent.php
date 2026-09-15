<?php

namespace App\Events;

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
        return [
            'conversationId' => $this->message->conversation_id,
            // viewerUserId null: se recalcula por cada destinatario en
            // el frontend (el payload no sabe "para quién" se está
            // renderizando) — el cliente compara userId === auth.user.id.
            'message' => MessageData::fromMessage($this->message, null, null),
        ];
    }
}
