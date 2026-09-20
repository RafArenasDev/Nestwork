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
        /** @var 'text'|'image'|'video'|'audio'|'file'|'code'|'system'|'call_log'|null */
        public ?string $lastMessageType,
        /** Sólo si el último mensaje es un adjunto sin texto — para el
         *  preview de la fila ("📄 informe.pdf" en vez de un cuerpo
         *  vacío). */
        public ?string $lastMessageAttachmentName,
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
