<?php

use App\Actions\Teams\AssignUserToDomainTeam;
use App\Enums\TeamRole;
use App\Models\User;

test('users with a public email domain share the guest team', function () {
    $first = User::factory()->create(['email' => 'first@gmail.com']);
    $second = User::factory()->create(['email' => 'second@outlook.com']);

    $action = app(AssignUserToDomainTeam::class);

    $firstTeam = $action->handle($first);
    $secondTeam = $action->handle($second);

    expect($firstTeam->id)->toBe($secondTeam->id);
    expect($firstTeam->slug)->toBe(config('teams.guest_team_slug'));
    expect($firstTeam->name)->toBe(config('teams.guest_team_name'));

    $this->assertDatabaseCount('teams', 1);
});

test('the first user of a custom domain becomes the team owner', function () {
    $user = User::factory()->create(['email' => 'ada@acme.com']);

    $team = app(AssignUserToDomainTeam::class)->handle($user);

    expect($team->domain)->toBe('acme.com');
    expect($user->teamRole($team))->toBe(TeamRole::Owner);
});

test('a second user of an already existing custom domain team becomes a member, not an owner', function () {
    $owner = User::factory()->create(['email' => 'ada@acme.com']);
    $second = User::factory()->create(['email' => 'grace@acme.com']);

    $action = app(AssignUserToDomainTeam::class);

    $ownerTeam = $action->handle($owner);
    $secondTeam = $action->handle($second);

    expect($secondTeam->id)->toBe($ownerTeam->id);
    expect($second->teamRole($secondTeam))->toBe(TeamRole::Member);

    $this->assertDatabaseCount('teams', 1);
});

test('subdomains under a compound suffix resolve to the same root domain team', function () {
    $student = User::factory()->create(['email' => 'juan@estudiantes.areandina.edu.co']);
    $teacher = User::factory()->create(['email' => 'maria@profesores.areandina.edu.co']);

    $action = app(AssignUserToDomainTeam::class);

    $studentTeam = $action->handle($student);
    $teacherTeam = $action->handle($teacher);

    expect($studentTeam->id)->toBe($teacherTeam->id);
    expect($studentTeam->domain)->toBe('areandina.edu.co');
});

test('calling handle twice for the same user does not duplicate their membership', function () {
    $user = User::factory()->create(['email' => 'ada@acme.com']);

    $action = app(AssignUserToDomainTeam::class);
    $team = $action->handle($user);
    $action->handle($user);

    $this->assertDatabaseCount('team_members', 1);
    expect($user->teamRole($team))->toBe(TeamRole::Owner);
});
