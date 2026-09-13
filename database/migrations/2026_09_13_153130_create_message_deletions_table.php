<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Eliminar sólo para mí" — separado de `messages.deleted_at`,
        // que es "eliminar para todos". El backend filtra por esta tabla
        // al listar mensajes para el usuario dueño de la fila.
        Schema::create('message_deletions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('deleted_at');

            $table->unique(['message_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_deletions');
    }
};
