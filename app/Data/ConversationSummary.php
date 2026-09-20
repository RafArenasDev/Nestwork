<?php

namespace App\Data;

readonly class ConversationSummary
{
    public function __construct(
        public int $id,
        public string $type,
        public string $name,
        public ?string $avatar,
        /** @var 'available'|'away'|'busy'|'dnd'|'offline'|null */
        public ?string $presence,
        /** Estado personalizado del otro participante (sólo DMs) —
         *  independiente de `presence`, ver User::statusText(). */
        public ?string $statusEmoji,
        public ?string $statusText,
        public ?string $lastMessageBody,
        public ?string $lastMessageAt,
        public int $unreadCount,
        public bool $isMuted,
        public bool $isArchived,
        public bool $isCurrent = false,
    ) {
        //
    }
}
