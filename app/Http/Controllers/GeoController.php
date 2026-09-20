<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Models\Country;
use App\Models\State;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * País/departamento/ciudad para el panel de Perfil — 245 países caben
 * enteros en una respuesta, pero estados (~4.6k) y sobre todo ciudades
 * (~77k) no, así que esos dos sólo salen filtrados por su padre (y
 * ciudades además por texto de búsqueda, mismo patrón que
 * SearchController).
 */
class GeoController extends Controller
{
    public function countries(): JsonResponse
    {
        return response()->json([
            'countries' => Country::query()
                ->orderBy('name')
                ->get(['id', 'name', 'iso2']),
        ]);
    }

    public function states(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country_id' => ['required', 'integer'],
        ]);

        return response()->json([
            'states' => State::query()
                ->where('country_id', $validated['country_id'])
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function cities(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country_id' => ['required', 'integer'],
            'state_id' => ['nullable', 'integer'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $query = trim((string) ($validated['q'] ?? ''));

        $cities = City::query()
            ->where('country_id', $validated['country_id'])
            ->when(
                $validated['state_id'] ?? null,
                fn ($q) => $q->where('state_id', $validated['state_id']),
            )
            ->when($query !== '', fn ($q) => $q->where('name', 'like', '%'.$query.'%'))
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name']);

        return response()->json(['cities' => $cities]);
    }
}
