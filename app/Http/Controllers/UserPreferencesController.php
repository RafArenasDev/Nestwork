<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Preferencias de cuenta que SÍ afectan a otros usuarios (por eso viven
 * en el servidor, no en localStorage como sonido/vista previa de
 * notificaciones) — hoy sólo confirmación de lectura, mismo criterio
 * que Teams (Ajustes > Privacidad).
 */
class UserPreferencesController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'read_receipts_enabled' => ['required', 'boolean'],
        ]);

        $request->user()->forceFill($validated)->save();

        return back();
    }
}
