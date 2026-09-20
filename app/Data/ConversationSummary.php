<?php

namespace App\Data;

readonly class ConversationSummary
{
    public function __construct(
        public int $id,
        public string $type,
        public string $name,
        public ?string $avatar,
        /** Sólo DMs — para poder aplicar overrides de presencia en vivo
         *  del lado del cliente (ver `useLivePresence`) sin adivinar a
         *  qué usuario corresponde la fila. */
        public ?int $otherUserId,
        /** @var 'available'|'away'|'busy'|'dnd'|'offline'|null */
        public ?string $presence,
        /** Estado personalizado del otro participante (sólo DMs) —
         *  independiente de `presence`, ver User::statusText(). */
        public ?string $statusEmoji,
        public ?string $statusText,
        /** Sólo group_chat/group/channel — cuántos participantes tiene. */
        public ?int $memberCount,
        public ?string $lastMessageBody,
        public ?string $lastMessageAt,
        public int $unreadCount,
        public bool $isMuted,
        public bool $isArchived,
        public bool $isFavorite = false,
        public bool $isCurrent = false,
    ) {
        //
    }
}
