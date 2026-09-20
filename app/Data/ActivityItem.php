<?php

namespace App\Data;

readonly class ActivityItem
{
    public function __construct(
        public string $id,
        /** @var 'reaction' */
        public string $type,
        public int $conversationId,
        public string $conversationName,
        public int $messageId,
        public string $messageExcerpt,
        public string $actorName,
        public ?string $actorAvatar,
        public ?string $emoji,
        public string $createdAt,
    ) {
        //
    }
}
