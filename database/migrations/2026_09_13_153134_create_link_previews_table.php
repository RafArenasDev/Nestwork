<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cacheado por hash de URL: el job FetchLinkPreview sólo
        // scrapea OpenGraph la primera vez que alguien pega un link; el
        // mensaje sólo guarda `metadata.link_preview_id`.
        Schema::create('link_previews', function (Blueprint $table) {
            $table->id();
            $table->string('url_hash')->unique();
            $table->text('url');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('site_name')->nullable();
            $table->string('favicon_url')->nullable();
            $table->timestamp('fetched_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('link_previews');
    }
};
