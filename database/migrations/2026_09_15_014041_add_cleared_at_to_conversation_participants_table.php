<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_participants', function (Blueprint $table) {
            // "Limpiar chat": oculta el historial anterior a esta marca
            // SOLO para este participante — los demás lo siguen viendo
            // igual. loadMessages() filtra por created_at > cleared_at
            // en vez de borrar filas (nadie más pierde nada).
            $table->timestamp('cleared_at')->nullable()->after('hidden_at');
        });
    }

    public function down(): void
    {
        Schema::table('conversation_participants', function (Blueprint $table) {
            $table->dropColumn('cleared_at');
        });
    }
};
