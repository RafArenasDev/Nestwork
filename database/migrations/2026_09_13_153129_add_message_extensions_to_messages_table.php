<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('type')->default('text')->after('user_id');
            // Payload libre según `type` (code: language+code, call_log:
            // duración/participantes/estado, link preview id, etc.) —
            // jsonb, no BLOB: ver ADR en docs/DECISIONS.md.
            $table->jsonb('metadata')->nullable()->after('body');
            $table->foreignId('reply_to_message_id')->nullable()->after('metadata')
                ->constrained('messages')->nullOnDelete();
            $table->foreignId('forwarded_from_message_id')->nullable()->after('reply_to_message_id')
                ->constrained('messages')->nullOnDelete();
            $table->foreignId('forwarded_from_conversation_id')->nullable()->after('forwarded_from_message_id')
                ->constrained('conversations')->nullOnDelete();
            $table->boolean('is_hidden')->default(false)->after('forwarded_from_conversation_id');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('forwarded_from_conversation_id');
            $table->dropConstrainedForeignId('forwarded_from_message_id');
            $table->dropConstrainedForeignId('reply_to_message_id');
            $table->dropColumn(['type', 'metadata', 'is_hidden']);
        });
    }
};
