<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Cacheada por `url_hash` — el job `FetchLinkPreview` la crea la primera
 * vez que alguien pega un link; los mensajes solo referencian
 * `metadata.link_preview_id`, no repiten el scrape.
 *
 * @property int $id
 * @property string $url_hash
 * @property string $url
 * @property string|null $title
 * @property string|null $description
 * @property string|null $image_url
 * @property string|null $site_name
 * @property string|null $favicon_url
 * @property Carbon|null $fetched_at
 * @property Carbon|null $expires_at
 */
#[Fillable(['url_hash', 'url', 'title', 'description', 'image_url', 'site_name', 'favicon_url', 'fetched_at', 'expires_at'])]
class LinkPreview extends Model
{
    protected function casts(): array
    {
        return [
            'fetched_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }
}
