<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_participants', function (Blueprint $table) {
            // Solo relevante para group/channel; null en dm.
            $table->string('role')->nullable()->after('user_id');
            // Distinto de archivar: no aparece en ningún listado hasta
            // que el usuario la busca explícitamente por el buscador.
            $table->timestamp('hidden_at')->nullable()->after('archived_at');
        });
    }

    public function down(): void
    {
        Schema::table('conversation_participants', function (Blueprint $table) {
            $table->dropColumn(['role', 'hidden_at']);
        });
    }
};
