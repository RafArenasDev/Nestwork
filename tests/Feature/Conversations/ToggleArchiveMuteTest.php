<?php

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;

test('toggling archive flips the pivot value for the acting user only', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $user, $other);

    $response = $this
        ->actingAs($user)
        ->patch(route('conversations.toggle-archive', [$team, $conversation]));

    $response->assertRedirect();

    $userPivot = $conversation->participants()->where('users.id', $user->id)->first()->pivot;
    $otherPivot = $conversation->participants()->where('users.id', $other->id)->first()->pivot;

    expect($userPivot->archived_at)->not->toBeNull();
    expect($otherPivot->archived_at)->toBeNull();

    // Toggling again flips it back off.
    $this->actingAs($user)->patch(route('conversations.toggle-archive', [$team, $conversation]));

    $userPivot = $conversation->participants()->where('users.id', $user->id)->first()->pivot;
    expect($userPivot->archived_at)->toBeNull();
});

test('toggling mute flips the pivot value for the acting user only', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $user, $other);

    $response = $this
        ->actingAs($user)
        ->patch(route('conversations.toggle-mute', [$team, $conversation]));

    $response->assertRedirect();

    $userPivot = $conversation->participants()->where('users.id', $user->id)->first()->pivot;
    $otherPivot = $conversation->participants()->where('users.id', $other->id)->first()->pivot;

    expect($userPivot->muted_at)->not->toBeNull();
    expect($otherPivot->muted_at)->toBeNull();
});

test('toggling archive on a conversation the user does not belong to returns 403', function () {
    $team = Team::factory()->create();
    $a = User::factory()->create();
    $b = User::factory()->create();
    $outsider = User::factory()->create();

    attachTeamMember($team, $a, TeamRole::Owner);
    attachTeamMember($team, $b);
    attachTeamMember($team, $outsider);

    $conversation = makeDmConversation($team, $a, $b);

    $response = $this
        ->actingAs($outsider)
        ->patch(route('conversations.toggle-archive', [$team, $conversation]));

    $response->assertForbidden();
});

test('toggling mute on a conversation from another team returns 404', function () {
    $team = Team::factory()->create();
    $otherTeam = Team::factory()->create();

    $user = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $other);
    attachTeamMember($otherTeam, $user);

    $conversation = makeDmConversation($team, $user, $other);

    $response = $this
        ->actingAs($user)
        ->patch(route('conversations.toggle-mute', [$otherTeam, $conversation]));

    $response->assertNotFound();
});
