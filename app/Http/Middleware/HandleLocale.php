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
        }

        return $next($request);
    }
}
