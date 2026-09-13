<?php

use Database\Seeders\CountriesSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Puebla países/estados/ciudades desde una API abierta gratuita
     * (countriesnow.space) — ver CountriesSeeder. En el entorno de
     * tests se salta la llamada de red real (haría la suite lenta y
     * dependiente de un tercero) y en su lugar siembra un puñado fijo
     * de países, suficiente para que `country` sea validable en los
     * tests de registro.
     */
    public function up(): void
    {
        if (app()->environment('testing')) {
            $this->seedTestingFixtures();

            return;
        }

        (new CountriesSeeder)->run();
    }

    public function down(): void
    {
        DB::table('cities')->truncate();
        DB::table('states')->truncate();
        DB::table('countries')->truncate();
    }

    private function seedTestingFixtures(): void
    {
        $now = now();

        DB::table('countries')->insert([
            ['iso2' => 'CO', 'iso3' => 'COL', 'name' => 'Colombia', 'flag_url' => null, 'locale' => 'es', 'created_at' => $now, 'updated_at' => $now],
            ['iso2' => 'MX', 'iso3' => 'MEX', 'name' => 'México', 'flag_url' => null, 'locale' => 'es', 'created_at' => $now, 'updated_at' => $now],
            ['iso2' => 'US', 'iso3' => 'USA', 'name' => 'United States', 'flag_url' => null, 'locale' => 'en', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
};
