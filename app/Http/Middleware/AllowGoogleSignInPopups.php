<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Firebase's Google sign-in popup polls window.closed on the opener to
 * detect when the user finishes/cancels. Chrome's default
 * Cross-Origin-Opener-Policy blocks that check (harmless but noisy in
 * the console); this header explicitly allows it.
 */
class AllowGoogleSignInPopups
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

        return $response;
    }
}
