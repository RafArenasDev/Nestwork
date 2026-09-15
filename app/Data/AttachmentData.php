<?php

namespace App\Data;

use App\Models\Message;
use Illuminate\Support\Facades\Storage;

readonly class AttachmentData
{
    public function __construct(
        public int $id,
        /** @var 'image'|'video'|'audio'|'document' */
        public string $type,
        public string $url,
        public string $originalName,
        public string $mimeType,
        public int $sizeBytes,
        public ?int $width = null,
        public ?int $height = null,
        /** Primera página/hoja convertida a imagen (PDF/Word/Excel vía
         *  GenerateAttachmentPreviewJob) — null mientras no se generó
         *  (adjuntos recién subidos) o si el tipo no aplica (zip, txt,
         *  ejecutables, etc.). */
        public ?string $thumbnailUrl = null,
    ) {
        //
    }

    /**
     * Un solo lugar para "cómo se arma el DTO de un attachment" — lo
     * usan tanto la carga normal de mensajes (MessagesController) como
     * el broadcast en vivo (MessageSent), para que nunca queden
     * desincronizados.
     *
     * @return array<int, self>
     */
    public static function collectionFor(Message $message): array
    {
        return $message->attachments
            ->map(fn ($attachment) => new self(
                id: $attachment->id,
                type: $attachment->type->value,
                url: Storage::disk($attachment->disk)->url($attachment->path),
                originalName: $attachment->original_name,
                mimeType: $attachment->mime_type,
                sizeBytes: $attachment->size_bytes,
                width: $attachment->width,
                height: $attachment->height,
                thumbnailUrl: $attachment->thumbnail_path
                    ? Storage::disk($attachment->disk)->url($attachment->thumbnail_path)
                    : null,
            ))
            ->all();
    }
}
