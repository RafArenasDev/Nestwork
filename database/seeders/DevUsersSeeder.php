<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Two real-email dev accounts for manual two-browser testing (login,
 * profile, and later chat between them). Emails come from config/dev_users.php
 * (backed by .env, not versioned) — this repo is public, and hardcoding real
 * personal addresses in a seeder would leak them into git history forever.
 * Only runs locally, never against staging/production.
 */
class DevUsersSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        $password = Hash::make((string) config('dev_users.password'));

        $this->createDevUser(
            name: (string) config('dev_users.user_1.name'),
            email: (string) config('dev_users.user_1.email'),
            password: $password,
        );

        $this->createDevUser(
            name: (string) config('dev_users.user_2.name'),
            email: (string) config('dev_users.user_2.email'),
            password: $password,
        );
    }

    private function createDevUser(string $name, string $email, string $password): void
    {
        User::factory()->create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'email_verified_at' => now(),
        ]);
    }
}
