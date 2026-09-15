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
 * Se dispara cuando un mensaje YA existente cambia (editar cuerpo,
 * reaccionar) — a diferencia de `MessageSent`, que sólo cubre la
 * creación. El frontend escucha `.MessageUpdated` en el mismo canal
 * `conversation.{id}` y reemplaza el mensaje en su lista local por id,
 * en vez de agregarlo — mismo patrón de "socket manda neutro, cada
 * cliente recalcula isMine" que ya usa MessageSent.
 */
class MessageUpdated implements ShouldBroadcastNow
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
        return [
            new PrivateChannel('conversation.'.$this->message->conversation_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessageUpdated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'conversationId' => $this->message->conversation_id,
            'message' => MessageData::fromMessage($this->message, null, null),
        ];
    }
}
