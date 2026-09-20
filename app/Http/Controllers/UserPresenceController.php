<?php

namespace App\Http\Controllers;

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

        $request->user()->forceFill([
            'status_preset' => $validated['preset'] ?? null,
        ])->save();

        return back();
    }
}
