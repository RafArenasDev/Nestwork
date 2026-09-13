<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // FK real a `countries` (no un string ISO2 suelto) — así se
            // puede hacer join limpio y, más adelante, traer
            // estados/ciudades del mismo país sin repetir el dato.
            $table->foreignId('country_id')->nullable()->after('username')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('country_id');
        });
    }
};
