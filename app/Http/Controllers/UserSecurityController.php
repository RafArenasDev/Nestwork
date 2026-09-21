<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Ajustes > Seguridad — hoy sólo "cerrar sesión en todos los
 * dispositivos" (borra las demás filas de `sessions`, driver
 * 'database'). Eliminar cuenta reusa profile.destroy, no hace falta
 * duplicarlo acá.
 */
class UserSecurityController extends Controller
{
    public function logoutOtherDevices(Request $request): RedirectResponse
    {
        DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        return back();
    }
}
