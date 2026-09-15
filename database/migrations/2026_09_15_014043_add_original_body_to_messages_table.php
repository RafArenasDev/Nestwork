<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // "Eliminar" mueve el body acá cifrado (cast `encrypted`,
            // ver Message::casts) y deja `body` vacío + `is_hidden`
            // true — el registro nunca se borra ni queda en texto
            // plano. Sólo el autor puede restaurar (MessagesController
            // valida user_id, no hace falta más permiso que ese).
            $table->text('original_body')->nullable()->after('body');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('original_body');
        });
    }
};
