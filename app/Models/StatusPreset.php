<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $key
 * @property string $emoji
 * @property string $label_es
 * @property string $label_en
 * @property int|null $default_duration_minutes
 * @property int $sort_order
 * @property bool $is_enabled
 */
#[Fillable(['key', 'emoji', 'label_es', 'label_en', 'default_duration_minutes', 'sort_order', 'is_enabled'])]
class StatusPreset extends Model
{
    /**
     * Los únicos keys que representan PRESENCIA (disponible/ausente/
     * ocupado/no molestar) — pisan `User::presenceStatus()`. Cualquier
     * otro key (almorzando, en una reunión, etc.) es un estado
     * personalizado con emoji+texto: no afecta la presencia, sólo la
     * completa (ver User::presenceStatus() y HandleInertiaRequests).
     *
     * @var list<string>
     */
    public const PRESENCE_KEYS = ['available', 'away', 'busy', 'dnd', 'invisible'];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
        ];
    }
}
