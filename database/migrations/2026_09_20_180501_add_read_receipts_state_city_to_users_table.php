<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // "Confirmación de lectura" (Ajustes > Privacidad) — mismo
            // criterio que Teams: si la apagas, los demás dejan de ver
            // el check de "visto" en lo que les envías.
            $table->boolean('read_receipts_enabled')->default(true)->after('status_expires_at');
            // País ya existía (country_id); departamento/estado y
            // ciudad completan la jerarquía que ya trae la app (tablas
            // states/cities), sin usarla todavía en ningún lado.
            $table->foreignId('state_id')->nullable()->after('country_id')->constrained()->nullOnDelete();
            $table->foreignId('city_id')->nullable()->after('state_id')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('state_id');
            $table->dropConstrainedForeignId('city_id');
            $table->dropColumn('read_receipts_enabled');
        });
    }
};
