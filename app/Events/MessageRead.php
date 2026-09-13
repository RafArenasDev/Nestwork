<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Se dispara al llegar al fondo de un chat (MessagesController::markRead)
 * — le avisa a los DEMÁS participantes (típicamente quien envió los
 * mensajes) que este usuario ya leyó hasta cierto mensaje, para que sus
 * checks de "leído" se actualicen en vivo sin recargar.
 */
class MessageRead implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public Conversation $conversation,
        public int $readerId,
        public ?int $lastReadMessageId,
    ) {
        //
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.'.$this->conversation->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessageRead';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'conversationId' => $this->conversation->id,
            'readerId' => $this->readerId,
            'lastReadMessageId' => $this->lastReadMessageId,
        ];
    }
}
