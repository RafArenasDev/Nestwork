<?php

namespace App\Data;

readonly class SavedMessageSummary
{
    public function __construct(
        public int $messageId,
        public int $conversationId,
        public string $conversationName,
        public string $senderName,
        public ?string $senderAvatar,
        public string $excerpt,
        public string $messageCreatedAt,
        public string $savedAt,
        public bool $isMine,
    ) {
        //
    }
}
