<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $iso2
 * @property string $iso3
 * @property string $name
 * @property string|null $flag_url
 * @property string $locale
 */
#[Fillable(['iso2', 'iso3', 'name', 'flag_url', 'locale'])]
class Country extends Model
{
    /**
     * @return HasMany<State, $this>
     */
    public function states(): HasMany
    {
        return $this->hasMany(State::class);
    }

    /**
     * @return HasMany<City, $this>
     */
    public function cities(): HasMany
    {
        return $this->hasMany(City::class);
    }
}
