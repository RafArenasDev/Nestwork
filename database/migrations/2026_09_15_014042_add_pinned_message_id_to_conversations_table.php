<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            // Un solo mensaje fijado por conversación (alcance de esta
            // ronda) — suficiente para DMs; grupos/canales con varios
            // fijados a la vez queda para cuando existan esos módulos.
            $table->foreignId('pinned_message_id')->nullable()
                ->constrained('messages')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pinned_message_id');
        });
    }
};
