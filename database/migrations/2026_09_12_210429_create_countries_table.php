<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->string('iso2', 2)->unique();
            $table->string('iso3', 3)->unique();
            $table->string('name');
            $table->string('flag_url')->nullable();
            // Sólo 'es'/'en' por ahora (los dos únicos locales que
            // soporta la app) — usado para setear el idioma del usuario
            // automáticamente a partir del país elegido en el registro,
            // sin preguntárselo (ver docs/DECISIONS.md).
            $table->string('locale', 5)->default('en');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('countries');
    }
};
