<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Estado PERSONALIZADO (emoji + texto libre, con vencimiento
 * opcional) — independiente de la presencia (disponible/ausente/
 * ocupado/no molestar), que vive en UserPresenceController. Cambiar
 * uno nunca toca al otro: acá nunca se lee ni se escribe
 * `status_preset`.
 */
class UserStatusController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'emoji' => ['nullable', 'string', 'max:8'],
            'text' => ['nullable', 'string', 'max:100'],
            // Minutos hasta que el estado se borre solo — null/ausente
            // significa "sin vencimiento". El modelo lee
            // `status_expires_at` para tratar el texto/emoji como
            // vencidos (ver User::statusText()/statusEmoji()).
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:10080'],
        ]);

        $request->user()->forceFill([
            'status_emoji' => $validated['emoji'] ?? null,
            'status_text' => $validated['text'] ?? null,
            'status_expires_at' => isset($validated['duration_minutes'])
                ? Carbon::now()->addMinutes($validated['duration_minutes'])
                : null,
        ])->save();

        return back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->user()->forceFill([
            'status_emoji' => null,
            'status_text' => null,
            'status_expires_at' => null,
        ])->save();

        return back();
    }
}
