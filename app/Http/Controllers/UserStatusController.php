<?php

namespace App\Http\Controllers;

use App\Models\StatusPreset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class UserStatusController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'preset' => ['nullable', Rule::in(
                StatusPreset::query()->where('is_enabled', true)->pluck('key')->all()
            )],
            'emoji' => ['nullable', 'string', 'max:8'],
            'text' => ['nullable', 'string', 'max:100'],
            // Minutos hasta que el estado se borre solo — null/ausente
            // significa "sin vencimiento" (mismo criterio que antes de
            // este campo). El modelo ya sabe leer status_expires_at
            // (ver User::activeStatusPreset()), esto sólo lo alimenta.
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:10080'],
        ]);

        $request->user()->forceFill([
            'status_preset' => $validated['preset'] ?? null,
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
            'status_preset' => null,
            'status_emoji' => null,
            'status_text' => null,
            'status_expires_at' => null,
        ])->save();

        return back();
    }
}
