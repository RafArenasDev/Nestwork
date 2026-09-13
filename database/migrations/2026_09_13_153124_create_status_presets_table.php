<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('status_presets', function (Blueprint $table) {
            $table->id();
            // Clave estable usada por `users.status_preset` y por la
            // lógica de presencia en User::presenceStatus() — no
            // traducir/renombrar sin actualizar ambos lados.
            $table->string('key')->unique();
            $table->string('emoji');
            $table->string('label_es');
            $table->string('label_en');
            $table->unsignedInteger('default_duration_minutes')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('status_presets');
    }
};
