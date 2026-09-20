<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/**
 * `last_seen_at` sólo se tocaba al iniciar sesión (`FirebaseSessionController`/
 * `PasswordAuthController`) — nunca durante el uso real. Como
 * `User::presenceStatus()` deriva "disponible/ausente/desconectado" de
 * esa columna cuando no hay un preset manual, un usuario activo se veía
 * "ausente" a los 5 minutos de haber iniciado sesión y "desconectado" a
 * los 30, aunque siguiera escribiendo en ese momento.
 *
 * Refresco throttleado (no en cada request — sería una escritura de BD
 * por cada navegación/polling) a lo sumo una vez por minuto, suficiente
 * para que nunca pase el umbral de 5 minutos mientras hay actividad
 * real.
 */
class TouchLastSeen
{
    private const THROTTLE_SECONDS = 60;

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && (! $user->last_seen_at || $user->last_seen_at->diffInSeconds(now()) >= self::THROTTLE_SECONDS)) {
            $user->forceFill(['last_seen_at' => Carbon::now()])->saveQuietly();
        }

        return $next($request);
    }
}
