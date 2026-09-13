<?php

use App\Enums\AuthProvider;
use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;

test('users can authenticate with email and password', function () {
    $user = User::factory()->create([
        'password' => 'password',
        'auth_provider' => AuthProvider::Password,
    ]);
    $team = Team::factory()->create();
    $team->members()->attach($user, ['role' => TeamRole::Owner->value]);
    $user->update(['current_team_id' => $team->id]);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect();
});

test('users cannot authenticate with an invalid password', function () {
    $user = User::factory()->create([
        'password' => 'password',
        'auth_provider' => AuthProvider::Password,
    ]);

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('google-only accounts have no password to authenticate with', function () {
    $user = User::factory()->create([
        'password' => null,
        'auth_provider' => AuthProvider::Google,
    ]);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'anything',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});
