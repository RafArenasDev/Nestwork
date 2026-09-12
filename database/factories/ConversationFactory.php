<?php

namespace Database\Factories;

use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Conversation>
 */
class ConversationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'type' => ConversationType::Dm,
            'name' => null,
            'created_by' => User::factory(),
        ];
    }

    public function group(string $name): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => ConversationType::Group,
            'name' => $name,
        ]);
    }
}
