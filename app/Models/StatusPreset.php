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
    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
        ];
    }
}
