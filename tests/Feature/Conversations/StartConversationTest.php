<?php

use App\Enums\ConversationType;
use App\Enums\TeamRole;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;

test('a user cannot start a conversation with themselves', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);

    $response = $this
        ->actingAs($user)
        ->post(route('conversations.store', $team), [
            'user_id' => $user->id,
        ]);

    $response->assertSessionHasErrors('user_id');
    $this->assertDatabaseCount('conversations', 0);
});

test('a user cannot start a conversation with someone outside their team', function () {
    $team = Team::factory()->create();
    $otherTeam = Team::factory()->create();

    $user = User::factory()->create();
    $stranger = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($otherTeam, $stranger, TeamRole::Owner);

    $response = $this
        ->actingAs($user)
        ->post(route('conversations.store', $team), [
            'user_id' => $stranger->id,
        ]);

    $response->assertSessionHasErrors('user_id');
    $this->assertDatabaseCount('conversations', 0);
});

test('starting a conversation with a teammate redirects to the new conversation', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();
    $teammate = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $teammate);

    $response = $this
        ->actingAs($user)
        ->post(route('conversations.store', $team), [
            'user_id' => $teammate->id,
        ]);

    $conversation = Conversation::query()->where('team_id', $team->id)->firstOrFail();

    $response->assertRedirect(route('messages.show', [$team, $conversation]));

    expect($conversation->type)->toBe(ConversationType::Dm);
    expect($conversation->participants()->pluck('users.id')->sort()->values()->all())
        ->toBe(collect([$user->id, $teammate->id])->sort()->values()->all());
});

test('starting a conversation with an existing DM reuses it instead of creating a duplicate', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();
    $teammate = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $teammate);

    $existing = makeDmConversation($team, $user, $teammate);

    $response = $this
        ->actingAs($user)
        ->post(route('conversations.store', $team), [
            'user_id' => $teammate->id,
        ]);

    $response->assertRedirect(route('messages.show', [$team, $existing]));
    $this->assertDatabaseCount('conversations', 1);
});
