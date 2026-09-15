<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // Tope de ediciones (MessageData::MAX_EDITS) además de la
            // ventana de tiempo — pedido explícito: no solo un plazo,
            // también un número máximo de veces dentro de ese plazo.
            $table->unsignedTinyInteger('edit_count')->default(0)->after('edited_at');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('edit_count');
        });
    }
};
