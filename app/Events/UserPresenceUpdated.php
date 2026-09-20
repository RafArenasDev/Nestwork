<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Se dispara cada vez que cambia la presencia (disponible/ausente/
 * ocupado/no molestar/automático) o el estado personalizado (emoji +
 * texto) de un usuario (`UserPresenceController`/`UserStatusController`)
 * — antes ninguno de los dos hacía broadcast, así que un cambio sólo lo
 * veía quien lo hizo, nunca los demás miembros del equipo en vivo (el
 * bug real reportado: "el estado no se refleja al instante").
 *
 * Se manda a TODOS los equipos del usuario (no sólo el actual) por si
 * tiene más de una pestaña/equipo abierto en otro lado.
 */
class UserPresenceUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public User $user)
    {
        //
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        // El canal usa binding implícito de Team (`routes/channels.php`),
        // y `Team::getRouteKeyName()` es "slug" — armar esto con el id
        // numérico hace que la suscripción real (que sí llega por slug,
        // ver use-live-presence.tsx) nunca resuelva el modelo y el
        // handshake de Reverb devuelva 403 en /broadcasting/auth.
        return $this->user->teams
            ->map(fn ($team) => new PresenceChannel('team.'.$team->slug))
            ->all();
    }

    public function broadcastAs(): string
    {
        return 'PresenceUpdated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'userId' => $this->user->id,
            'presence' => $this->user->presenceStatus(),
            'statusEmoji' => $this->user->status_emoji,
            'statusText' => $this->user->status_text,
        ];
    }
}
