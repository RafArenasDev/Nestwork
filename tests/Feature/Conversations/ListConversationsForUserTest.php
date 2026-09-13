<?php

use App\Actions\Conversations\ListConversationsForUser;
use App\Enums\TeamRole;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;

test('unread count only considers messages from other users past last_read_message_id', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $user, $other);

    $readMessage = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $other->id]);

    $conversation->participants()->updateExistingPivot($user->id, [
        'last_read_message_id' => $readMessage->id,
    ]);

    // Two unread messages from the other participant.
    Message::factory()->count(2)->create(['conversation_id' => $conversation->id, 'user_id' => $other->id]);

    // The user's own messages must never count as unread for themselves.
    Message::factory()->count(5)->create(['conversation_id' => $conversation->id, 'user_id' => $user->id]);

    $summaries = app(ListConversationsForUser::class)->handle($user, $team);

    expect($summaries)->toHaveCount(1);
    expect($summaries->first()->unreadCount)->toBe(2);
});

test('unread count counts all messages from the other user when nothing has been read yet', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $user, $other);

    Message::factory()->count(4)->create(['conversation_id' => $conversation->id, 'user_id' => $other->id]);

    $summaries = app(ListConversationsForUser::class)->handle($user, $team);

    expect($summaries->first()->unreadCount)->toBe(4);
});

test('isCurrent matches the passed current conversation id', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();
    $other = User::factory()->create();
    $another = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $other);
    attachTeamMember($team, $another);

    $conversation = makeDmConversation($team, $user, $other);
    $otherConversation = makeDmConversation($team, $user, $another);

    $summaries = app(ListConversationsForUser::class)->handle($user, $team, $conversation->id);

    $current = $summaries->firstWhere('id', $conversation->id);
    $notCurrent = $summaries->firstWhere('id', $otherConversation->id);

    expect($current->isCurrent)->toBeTrue();
    expect($notCurrent->isCurrent)->toBeFalse();
});

test('isCurrent is false for every conversation when no current id is passed', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $other);

    makeDmConversation($team, $user, $other);

    $summaries = app(ListConversationsForUser::class)->handle($user, $team);

    expect($summaries->every(fn ($summary) => $summary->isCurrent === false))->toBeTrue();
});

test('archived conversations are excluded by default and included with archivedOnly', function () {
    $team = Team::factory()->create();
    $user = User::factory()->create();
    $other = User::factory()->create();
    $another = User::factory()->create();

    attachTeamMember($team, $user, TeamRole::Owner);
    attachTeamMember($team, $other);
    attachTeamMember($team, $another);

    $activeConversation = makeDmConversation($team, $user, $other);
    $archivedConversation = makeDmConversation($team, $user, $another);

    $user->conversations()->updateExistingPivot($archivedConversation->id, [
        'archived_at' => now(),
    ]);

    $activeOnly = app(ListConversationsForUser::class)->handle($user, $team);
    expect($activeOnly->pluck('id')->all())->toBe([$activeConversation->id]);

    $archivedOnly = app(ListConversationsForUser::class)->handle($user, $team, archivedOnly: true);
    expect($archivedOnly->pluck('id')->all())->toBe([$archivedConversation->id]);
});
