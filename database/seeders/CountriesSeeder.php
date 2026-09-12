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

    private const FLAGCDN_CODES_URL = 'https://flagcdn.com/en/codes.json';

    /** Español es el default de la app — sólo estos países (de habla
     *  inglesa) setean 'en' automáticamente. Nunca al revés: nada de
     *  "todo en inglés salvo unos pocos en español", que era el sesgo
     *  original y quedó explícitamente corregido a pedido del usuario. */
    private const ENGLISH_SPEAKING = [
        'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA', 'JM', 'TT', 'BZ', 'GY',
        'BS', 'BB', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'MT', 'SG',
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

        /** @var array<string, string> $flagCodes lowercase iso2 => country name */
        $flagCodes = Http::timeout(30)->get(self::FLAGCDN_CODES_URL)->throw()->json();

        foreach ($states as $entry) {
            $iso2 = $entry['iso2'];

            // Cruce por nombre entre dos endpoints de countriesnow dejaba
            // ~24 países sin bandera (territorios históricos/disueltos
            // como "Netherlands Antilles" que no son un país ISO 3166
            // vigente). En vez de sembrar un país que no puede tener
            // bandera, se excluye — flagcdn es la fuente de verdad de
            // qué países son seleccionables acá.
            if (! array_key_exists(strtolower($iso2), $flagCodes)) {
                continue;
            }

            $countryId = DB::table('countries')->insertGetId([
                'iso2' => $iso2,
                'iso3' => $entry['iso3'],
                'name' => $entry['name'],
                'flag_url' => 'https://flagcdn.com/'.strtolower($iso2).'.svg',
                'locale' => in_array($iso2, self::ENGLISH_SPEAKING, true) ? 'en' : 'es',
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
