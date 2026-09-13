<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class HandleLocale
{
    /**
     * Locales the app actually ships translations for — see 2.1/CLAUDE.md
     * (ES/EN for now, more later). Anything else falls back to config default.
     */
    private const SUPPORTED_LOCALES = ['en', 'es'];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->cookie('locale');

        if (is_string($locale) && in_array($locale, self::SUPPORTED_LOCALES, true)) {
            App::setLocale($locale);

            return $next($request);
        }

        // Sin cookie explícita (nunca se guardó una preferencia, ej.
        // cuentas de Google que nunca pasaron por el registro con
        // país): se deriva del país del usuario autenticado en vez de
        // caer directo al locale por defecto de la app.
        $countryLocale = $request->user()?->country?->locale;

        if (is_string($countryLocale) && in_array($countryLocale, self::SUPPORTED_LOCALES, true)) {
            App::setLocale($countryLocale);

            return $next($request);
        }

        // Visitante invitado, sin cookie ni cuenta todavía (ej. primera
        // vez en /login o /register): se deriva del header
        // Accept-Language que manda el navegador (refleja el idioma del
        // SO/navegador, buen proxy del país sin depender de un servicio
        // de geolocalización por IP de pago). Sólo aplica mientras no
        // haya nada mejor (cookie o país de cuenta) — se sigue
        // guardando la cookie normalmente en cuanto el usuario elige
        // país en el registro (PasswordAuthController::store).
        $preferredLocale = $request->getPreferredLanguage(self::SUPPORTED_LOCALES);

        if (is_string($preferredLocale)) {
            App::setLocale($preferredLocale);
        }

        return $next($request);
    }
}
