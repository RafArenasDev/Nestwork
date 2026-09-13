<?php

use App\Enums\TeamRole;
use App\Models\Conversation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}

/**
 * Attach a user to a team with the given role (defaults to Member), for
 * tests that need a team member without caring about the full team
 * onboarding flow.
 */
function attachTeamMember(Team $team, User $user, TeamRole $role = TeamRole::Member): void
{
    $team->members()->attach($user, ['role' => $role->value]);
}

/**
 * Create a DM conversation between two users on the given team and
 * attach both as participants, mirroring what
 * App\Actions\Conversations\StartConversationWithUser does.
 */
function makeDmConversation(Team $team, User $a, User $b): Conversation
{
    $conversation = Conversation::factory()->create(['team_id' => $team->id, 'created_by' => $a->id]);

    $conversation->participants()->attach([
        $a->id => ['joined_at' => now()],
        $b->id => ['joined_at' => now()],
    ]);

    return $conversation;
}
