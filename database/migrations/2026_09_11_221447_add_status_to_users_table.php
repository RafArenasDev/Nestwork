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
            // Preset tipo Teams/Slack (available/away/busy/dnd) — la
            // presencia derivada de last_seen_at se usa mientras no haya
            // uno explícito. null = "sin preferencia manual".
            $table->string('status_preset')->nullable()->after('last_seen_at');
            // Estado personalizado tipo "🍔 Almorzando" — ambos van
            // juntos o ninguno, no se valida acá (se valida en la Action).
            $table->string('status_emoji')->nullable()->after('status_preset');
            $table->string('status_text')->nullable()->after('status_emoji');
            $table->timestamp('status_expires_at')->nullable()->after('status_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['status_preset', 'status_emoji', 'status_text', 'status_expires_at']);
        });
    }
};
