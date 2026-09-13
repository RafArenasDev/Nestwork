<?php

use App\Enums\TeamRole;
use App\Events\MessageRead;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Event;

test('a participant marking a conversation as read updates their last_read_message_id pivot', function () {
    Event::fake([MessageRead::class]);

    $team = Team::factory()->create();
    $reader = User::factory()->create();
    $sender = User::factory()->create();

    attachTeamMember($team, $reader, TeamRole::Owner);
    attachTeamMember($team, $sender);

    $conversation = makeDmConversation($team, $sender, $reader);

    $messages = Message::factory()->count(3)->create([
        'conversation_id' => $conversation->id,
        'user_id' => $sender->id,
    ]);
    $lastMessage = $messages->last();

    $response = $this
        ->actingAs($reader)
        ->patchJson(route('messages.read', [$team, $conversation]));

    $response->assertOk();
    $response->assertJson(['lastReadMessageId' => $lastMessage->id]);

    $pivot = $conversation->participants()->where('users.id', $reader->id)->first()?->pivot;

    expect($pivot->last_read_message_id)->toBe($lastMessage->id);
});

test('marking as read broadcasts MessageRead with the reader id and last read message id', function () {
    Event::fake([MessageRead::class]);

    $team = Team::factory()->create();
    $reader = User::factory()->create();
    $sender = User::factory()->create();

    attachTeamMember($team, $reader, TeamRole::Owner);
    attachTeamMember($team, $sender);

    $conversation = makeDmConversation($team, $sender, $reader);

    $message = Message::factory()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $sender->id,
    ]);

    $this
        ->actingAs($reader)
        ->patchJson(route('messages.read', [$team, $conversation]));

    Event::assertDispatched(MessageRead::class, function (MessageRead $event) use ($conversation, $reader, $message) {
        return $event->conversation->id === $conversation->id
            && $event->readerId === $reader->id
            && $event->lastReadMessageId === $message->id;
    });
});

test('marking as read with no messages yet sets last_read_message_id to null', function () {
    Event::fake([MessageRead::class]);

    $team = Team::factory()->create();
    $reader = User::factory()->create();
    $sender = User::factory()->create();

    attachTeamMember($team, $reader, TeamRole::Owner);
    attachTeamMember($team, $sender);

    $conversation = makeDmConversation($team, $sender, $reader);

    $response = $this
        ->actingAs($reader)
        ->patchJson(route('messages.read', [$team, $conversation]));

    $response->assertOk();
    $response->assertJson(['lastReadMessageId' => null]);
});

test('marking as read requires the user to be a participant of the conversation', function () {
    Event::fake([MessageRead::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $reader = User::factory()->create();
    $outsider = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $reader);
    // Outsider belongs to the team but never joined this conversation.
    attachTeamMember($team, $outsider);

    $conversation = makeDmConversation($team, $sender, $reader);

    $response = $this
        ->actingAs($outsider)
        ->patchJson(route('messages.read', [$team, $conversation]));

    $response->assertForbidden();
    Event::assertNotDispatched(MessageRead::class);
});

test('marking as read on a conversation from another team returns 404', function () {
    Event::fake([MessageRead::class]);

    $team = Team::factory()->create();
    $otherTeam = Team::factory()->create();

    $reader = User::factory()->create();
    $sender = User::factory()->create();

    attachTeamMember($team, $reader, TeamRole::Owner);
    attachTeamMember($team, $sender);
    // Reader must also belong to the other team for EnsureTeamMembership
    // to let the request through to the controller's own 404 check.
    attachTeamMember($otherTeam, $reader);

    $conversation = makeDmConversation($team, $sender, $reader);

    $response = $this
        ->actingAs($reader)
        ->patchJson(route('messages.read', [$otherTeam, $conversation]));

    $response->assertNotFound();
});
