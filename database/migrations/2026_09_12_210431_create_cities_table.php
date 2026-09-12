<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('country_id')->constrained()->cascadeOnDelete();
            // Nullable: la fuente de datos abierta que alimenta esta
            // tabla lista ciudades por país, no por departamento/estado
            // — se deja el vínculo listo para cuando se resuelva esa
            // relación (ver docs/DECISIONS.md).
            $table->foreignId('state_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cities');
    }
};
