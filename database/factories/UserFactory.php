<?php

namespace Database\Factories;

use App\Actions\Users\GenerateUniqueUsername;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->name();

        return [
            'name' => $name,
            'username' => app(GenerateUniqueUsername::class)->handle($name),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'last_seen_at' => fake()->dateTimeBetween('-1 week', 'now'),
        ];
    }
}
