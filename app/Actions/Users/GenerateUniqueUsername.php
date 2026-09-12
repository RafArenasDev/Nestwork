<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class GenerateUniqueUsername
{
    /**
     * Slack-style "firstname.lastname" username, transliterated and
     * lowercased. Falls back to a numeric suffix (rafael.arenas2,
     * rafael.arenas3, ...) when the base is already taken — expected to
     * happen often in dev/testing, where the same person signs up with
     * several real inboxes (gmail, university email, ...).
     */
    public function handle(string $name): string
    {
        $base = $this->baseUsername($name);
        $username = $base;
        $suffix = 2;

        while (User::query()->where('username', $username)->exists()) {
            $username = "{$base}{$suffix}";
            $suffix++;
        }

        return $username;
    }

    private function baseUsername(string $name): string
    {
        /** @var Collection<int, string> $parts */
        $parts = collect(preg_split('/\s+/', trim($name)) ?: [])
            ->map(fn (string $part) => Str::slug(Str::ascii($part)))
            ->filter()
            ->values();

        if ($parts->isEmpty()) {
            return 'user';
        }

        if ($parts->count() === 1) {
            return $parts->first();
        }

        return $parts->first().'.'.$parts->last();
    }
}
