<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            // Solo aplica cuando type = 'channel'.
            $table->boolean('is_public')->default(false)->after('name');
            $table->string('avatar_path')->nullable()->after('is_public');
            $table->text('description')->nullable()->after('avatar_path');
            $table->boolean('is_ephemeral')->default(false)->after('description');
            $table->unsignedInteger('ephemeral_ttl_seconds')->nullable()->after('is_ephemeral');
            $table->unsignedInteger('default_message_ttl_seconds')->nullable()->after('ephemeral_ttl_seconds');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn([
                'is_public',
                'avatar_path',
                'description',
                'is_ephemeral',
                'ephemeral_ttl_seconds',
                'default_message_ttl_seconds',
            ]);
        });
    }
};
