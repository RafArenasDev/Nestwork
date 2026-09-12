<?php

namespace App\Data;

readonly class MessageData
{
    public function __construct(
        public int $id,
        public string $body,
        public string $createdAt,
        public ?string $editedAt,
        public int $userId,
        public string $userName,
        public ?string $userAvatar,
        public bool $isMine,
        /** @var 'sent'|'read' */
        public string $status = 'sent',
    ) {
        //
    }
}
