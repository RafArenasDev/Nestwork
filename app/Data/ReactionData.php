<?php

namespace App\Data;

use App\Models\Message;

/**
 * Fila cruda (emoji + autor), sin agrupar ni marcar "mine" — mismo
 * criterio que el resto del payload de mensajes (ver `isMine` en
 * MessageData): el servidor manda datos neutros y cada cliente agrupa
 * y decide qué es "propio" comparando `userId` contra su propio
 * usuario autenticado. Agrupar acá adentro obligaría a mandar un
 * payload distinto por cada participante conectado al mismo canal de
 * broadcast, que es justo lo que este patrón evita.
 */
readonly class ReactionData
{
    public function __construct(
        public string $emoji,
        public int $userId,
        public string $userName,
    ) {}

    /**
     * @return array<int, self>
     */
    public static function listFor(Message $message): array
    {
        return $message->reactions
            ->map(fn ($reaction) => new self(
                emoji: $reaction->emoji,
                userId: $reaction->user_id,
                userName: $reaction->user->name,
            ))
            ->all();
    }
}
