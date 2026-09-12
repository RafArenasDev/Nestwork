<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Países, departamentos/estados y ciudades desde countriesnow.space —
 * API pública, gratuita, sin key (no es un JSON quemado en el repo).
 * Se corre automáticamente al migrar (ver la migración de `countries`).
 *
 * countriesnow no expone la jerarquía completa estado→ciudad en un solo
 * endpoint: las ciudades vienen listadas por país (no por estado), así
 * que `cities.state_id` queda null por ahora — la relación queda
 * modelada y lista para cuando se resuelva ese vínculo (ver
 * docs/DECISIONS.md).
 */
class CountriesSeeder extends Seeder
{
    private const BASE_URL = 'https://countriesnow.space/api/v0.1';

    /** dr5hn/countries-states-cities-database no aplica acá (ver
     *  arriba) — esta lista sólo decide qué locale (es/en, los dos
     *  únicos que soporta la app hoy) se setea automáticamente al
     *  registrarse con ese país. */
    private const SPANISH_SPEAKING = [
        'ES', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO',
        'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ', 'PR',
    ];

    public function run(): void
    {
        try {
            $this->seedCountriesAndStates();
            $this->seedCities();
        } catch (\Throwable $e) {
            Log::warning('CountriesSeeder: no se pudo poblar países/ciudades desde countriesnow.space, se continúa sin ellos.', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function seedCountriesAndStates(): void
    {
        /** @var array<int, array{iso2: string, iso3: string, name: string, states: array<int, array{name: string, state_code: string|null}>}> $states */
        $states = Http::timeout(30)->get(self::BASE_URL.'/countries/states')->throw()->json('data');
        /** @var array<int, array{iso2: string, flag: string}> $flags */
        $flags = Http::timeout(30)->get(self::BASE_URL.'/countries/flag/images')->throw()->json('data');

        $flagByIso2 = collect($flags)->keyBy('iso2');

        foreach ($states as $entry) {
            $iso2 = $entry['iso2'];

            $countryId = DB::table('countries')->insertGetId([
                'iso2' => $iso2,
                'iso3' => $entry['iso3'],
                'name' => $entry['name'],
                'flag_url' => $flagByIso2->get($iso2)['flag'] ?? null,
                'locale' => in_array($iso2, self::SPANISH_SPEAKING, true) ? 'es' : 'en',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $stateRows = collect($entry['states'])
                ->map(fn (array $state) => [
                    'country_id' => $countryId,
                    'name' => $state['name'],
                    'code' => $state['state_code'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
                ->all();

            foreach (array_chunk($stateRows, 200) as $chunk) {
                DB::table('states')->insert($chunk);
            }
        }
    }

    private function seedCities(): void
    {
        /** @var array<int, array{iso2: string, cities: array<int, string>}> $countries */
        $countries = Http::timeout(60)->get(self::BASE_URL.'/countries')->throw()->json('data');

        $countryIdByIso2 = Country::query()->pluck('id', 'iso2');

        foreach ($countries as $entry) {
            $countryId = $countryIdByIso2->get($entry['iso2']);

            if (! $countryId) {
                continue;
            }

            $cityRows = collect($entry['cities'])
                ->map(fn (string $name) => [
                    'country_id' => $countryId,
                    'name' => $name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
                ->all();

            foreach (array_chunk($cityRows, 500) as $chunk) {
                DB::table('cities')->insert($chunk);
            }
        }
    }
}
