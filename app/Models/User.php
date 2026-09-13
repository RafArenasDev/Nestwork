<?php

namespace App\Models;

use App\Concerns\HasTeams;
use App\Enums\AuthProvider;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $username
 * @property int|null $country_id
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string|null $password
 * @property AuthProvider $auth_provider
 * @property string|null $avatar
 * @property Carbon|null $last_seen_at
 * @property string|null $status_preset
 * @property string|null $status_emoji
 * @property string|null $status_text
 * @property Carbon|null $status_expires_at
 * @property-read 'available'|'away'|'busy'|'offline' $presence
 * @property string|null $remember_token
 * @property int|null $current_team_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Team|null $currentTeam
 * @property-read Collection<int, Team> $ownedTeams
 * @property-read Collection<int, Membership> $teamMemberships
 * @property-read Collection<int, Team> $teams
 * @property-read Collection<int, Conversation> $conversations
 * @property-read Country|null $country
 * @property-read Collection<int, Favorite> $favorites
 */
#[Fillable(['name', 'username', 'country_id', 'email', 'password', 'auth_provider', 'avatar', 'current_team_id', 'status_preset', 'status_emoji', 'status_text', 'status_expires_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasTeams, Notifiable;

    /** Para que `auth.user.presence` esté siempre disponible en el frontend (usado en el avatar propio del rail). */
    protected $appends = ['presence'];

    /**
     * @return Attribute<'available'|'away'|'busy'|'offline', never>
     */
    protected function presence(): Attribute
    {
        return Attribute::make(get: fn () => $this->presenceStatus());
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'auth_provider' => AuthProvider::class,
            'last_seen_at' => 'datetime',
            'status_expires_at' => 'datetime',
        ];
    }

    /**
     * "busy"/"dnd" manuales pisan la presencia automática; si expiraron
     * o nunca se configuraron, no aplica y se usa last_seen_at.
     */
    public function activeStatusPreset(): ?string
    {
        if ($this->status_preset === null) {
            return null;
        }

        if ($this->status_expires_at && $this->status_expires_at->isPast()) {
            return null;
        }

        return $this->status_preset;
    }

    /**
     * Presencia real: un preset manual (disponible/ausente/ocupado/no
     * molestar) pisa todo mientras no expire; si no hay uno activo, se
     * deriva de `last_seen_at`.
     *
     * @return 'available'|'away'|'busy'|'offline'
     */
    public function presenceStatus(): string
    {
        $preset = $this->activeStatusPreset();

        if ($preset === 'busy' || $preset === 'dnd') {
            return 'busy';
        }

        if ($preset === 'available') {
            return 'available';
        }

        if ($preset === 'away') {
            return 'away';
        }

        if (! $this->last_seen_at) {
            return 'offline';
        }

        $minutesAgo = $this->last_seen_at->diffInMinutes(now());

        return match (true) {
            $minutesAgo < 5 => 'available',
            $minutesAgo < 30 => 'away',
            default => 'offline',
        };
    }

    /**
     * @return BelongsToMany<Conversation, $this, ConversationParticipant, 'pivot'>
     */
    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class, 'conversation_participants')
            ->using(ConversationParticipant::class)
            ->withPivot(['joined_at', 'muted_at', 'archived_at', 'hidden_at', 'role', 'last_read_message_id'])
            ->withTimestamps();
    }

    /**
     * @return BelongsTo<Country, $this>
     */
    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    /**
     * @return HasMany<Favorite, $this>
     */
    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }
}
