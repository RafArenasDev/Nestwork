<?php

namespace App\Http\Controllers;

use App\Events\UserPresenceUpdated;
use App\Models\StatusPreset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * PRESENCIA (disponible/ausente/ocupado/no molestar, o null =
 * "Automático") — independiente del estado personalizado (emoji +
 * texto), que vive en UserStatusController. No vence sola: se queda
 * puesta hasta que el usuario la cambie a mano.
 */
class UserPresenceController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'preset' => ['nullable', Rule::in(StatusPreset::PRESENCE_KEYS)],
        ]);

        $user = $request->user();

        $user->forceFill([
            'status_preset' => $validated['preset'] ?? null,
        ])->save();

        // Sin esto, el cambio sólo lo ve quien lo hizo — nadie más se
        // entera hasta que su propia pantalla recargue por otro motivo
        // (ver App\Events\UserPresenceUpdated).
        broadcast(new UserPresenceUpdated($user))->toOthers();

        return back();
    }
}
