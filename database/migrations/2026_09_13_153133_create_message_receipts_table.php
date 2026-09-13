<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ojo con escala: barato en dm/group chicos (una fila por
        // mensaje), puede explotar en channels grandes. El backend
        // decide en la Action si genera filas de "leído" según el
        // tamaño de la conversación (ver sección 3.2 del prompt v2) —
        // el schema no fuerza esa regla, solo la habilita.
        Schema::create('message_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->unique(['message_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_receipts');
    }
};
