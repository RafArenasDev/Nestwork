<?php

namespace App\Models;

use App\Enums\AttachmentType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Guarda solo metadata + ruta del objeto — nunca el archivo en la BD
 * (ver ADR "NO usar BLOB" en docs/DECISIONS.md).
 *
 * @property int $id
 * @property int $message_id
 * @property AttachmentType $type
 * @property string $disk
 * @property string $path
 * @property string $original_name
 * @property string $mime_type
 * @property int $size_bytes
 * @property int|null $duration_seconds
 * @property int|null $width
 * @property int|null $height
 * @property string|null $thumbnail_path
 * @property bool $is_hidden
 * @property-read Message $message
 */
#[Fillable(['message_id', 'type', 'disk', 'path', 'original_name', 'mime_type', 'size_bytes', 'duration_seconds', 'width', 'height', 'thumbnail_path', 'is_hidden'])]
class Attachment extends Model
{
    protected function casts(): array
    {
        return [
            'type' => AttachmentType::class,
            'is_hidden' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Message, $this>
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }
}
