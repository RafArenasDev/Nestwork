<?php

namespace App\Data;

use App\Models\Message;
use Carbon\CarbonInterface;

readonly class MessageData
{
    /** Ventana de edición: pasado este tiempo desde el envío, "Editar"
     *  deja de estar disponible tanto en el frontend (oculta la opción)
     *  como en el backend (rechaza el PATCH aunque alguien lo intente
     *  a mano) — un solo número, no dos copias que puedan desalinearse. */
    public const int EDIT_WINDOW_MINUTES = 15;

    /** Además del plazo, un tope de ediciones DENTRO de ese plazo —
     *  pedido explícito: no solo tiempo, también cantidad de veces. */
    public const int MAX_EDITS = 5;

    /**
     * @param  array<int, AttachmentData>  $attachments
     * @param  array<int, ReactionData>  $reactions
     */
    public function __construct(
        public int $id,
        public string $body,
        public string $createdAt,
        public ?string $editedAt,
        public int $userId,
        public string $userName,
        public ?string $userAvatar,
        public bool $isMine,
        public ?int $replyToId = null,
        public ?string $replyToUserName = null,
        public ?string $replyToBody = null,
        /** @var 'sent'|'read' */
        public string $status = 'sent',
        public array $attachments = [],
        public array $reactions = [],
        public bool $isForwarded = false,
        public ?string $editableUntil = null,
        public int $editsRemaining = self::MAX_EDITS,
        public bool $isDeleted = false,
        /** Privado del viewer — siempre false en payloads de broadcast
         *  (no hace falta sincronizarlo entre participantes). */
        public bool $isSaved = false,
    ) {
        //
    }

    /** `created_at` llega como `CarbonImmutable` (config por defecto de
     *  este proyecto) — `CarbonInterface` cubre ambas variantes en vez
     *  de asumir la mutable. */
    public static function editWindowEndsAt(Message $message): CarbonInterface
    {
        return $message->created_at->addMinutes(self::EDIT_WINDOW_MINUTES);
    }

    /**
     * Punto único de armado de un mensaje hacia el frontend — lo usan
     * tanto la carga inicial (`loadMessages`, con el viewer real y su
     * `readThreshold`) como los eventos de broadcast (`MessageSent`/
     * `MessageUpdated`, con `$viewerUserId = null` porque un mismo
     * payload de socket llega a TODOS los participantes conectados al
     * canal — cada cliente recalcula `isMine` comparando `userId` con
     * su propio usuario, igual que ya hacía antes de este refactor).
     */
    public static function fromMessage(Message $message, ?int $viewerUserId, ?int $readThreshold): self
    {
        $isMine = $viewerUserId !== null && $message->user_id === $viewerUserId;

        return new self(
            id: $message->id,
            // Eliminado: nunca se manda el cuerpo real a nadie (ni al
            // propio autor) — restaurar es una acción a ciegas, el
            // backend valida sólo user_id, no hace falta previsualizar.
            body: $message->is_hidden ? '' : $message->body,
            createdAt: $message->created_at->toIso8601String(),
            editedAt: $message->edited_at?->toIso8601String(),
            userId: $message->user_id,
            userName: $message->user->name,
            userAvatar: $message->user->avatar,
            isMine: $isMine,
            replyToId: $message->replyTo?->id,
            replyToUserName: $message->replyTo?->user->name,
            replyToBody: $message->replyTo?->body,
            status: $isMine
                ? ($readThreshold !== null && $readThreshold >= $message->id ? 'read' : 'sent')
                : 'sent',
            attachments: $message->is_hidden ? [] : AttachmentData::collectionFor($message),
            reactions: ReactionData::listFor($message),
            isForwarded: $message->forwarded_from_message_id !== null,
            editableUntil: self::editWindowEndsAt($message)->toIso8601String(),
            editsRemaining: max(0, self::MAX_EDITS - $message->edit_count),
            isDeleted: $message->is_hidden,
            isSaved: $viewerUserId !== null && $message->savedBy->contains('user_id', $viewerUserId),
        );
    }
}
