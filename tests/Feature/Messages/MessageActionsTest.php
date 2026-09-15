<?php

use App\Data\MessageData;
use App\Enums\TeamRole;
use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Models\Message;
use App\Models\Reaction;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Event;

test('a participant can react to a message', function () {
    Event::fake([MessageUpdated::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    $response = $this
        ->actingAs($other)
        ->postJson(route('messages.reactions.toggle', [$team, $conversation, $message]), [
            'emoji' => '👍',
        ]);

    $response->assertOk();
    $response->assertJson(['reactions' => [['emoji' => '👍', 'userId' => $other->id]]]);
    $this->assertDatabaseHas('reactions', [
        'message_id' => $message->id,
        'user_id' => $other->id,
        'emoji' => '👍',
    ]);

    Event::assertDispatched(MessageUpdated::class);
});

test('reacting with the same emoji again removes it (toggle)', function () {
    Event::fake([MessageUpdated::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    Reaction::create([
        'message_id' => $message->id,
        'user_id' => $other->id,
        'emoji' => '👍',
        'created_at' => now(),
    ]);

    $response = $this
        ->actingAs($other)
        ->postJson(route('messages.reactions.toggle', [$team, $conversation, $message]), [
            'emoji' => '👍',
        ]);

    $response->assertOk();
    $response->assertJson(['reactions' => []]);
    $this->assertDatabaseMissing('reactions', ['message_id' => $message->id, 'user_id' => $other->id]);
});

test('a non-participant cannot react to a message', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();
    $outsider = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);
    attachTeamMember($team, $outsider);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    $response = $this
        ->actingAs($outsider)
        ->postJson(route('messages.reactions.toggle', [$team, $conversation, $message]), [
            'emoji' => '👍',
        ]);

    $response->assertForbidden();
});

test('the author can edit their own message within the edit window', function () {
    Event::fake([MessageUpdated::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $sender->id,
        'body' => 'texto original',
        'created_at' => now(),
    ]);

    $response = $this
        ->actingAs($sender)
        ->patchJson(route('messages.update', [$team, $conversation, $message]), [
            'body' => 'texto corregido',
        ]);

    $response->assertOk();
    $response->assertJsonPath('message.body', 'texto corregido');
    $this->assertDatabaseHas('messages', [
        'id' => $message->id,
        'body' => 'texto corregido',
    ]);
    expect($message->refresh()->edited_at)->not->toBeNull();

    Event::assertDispatched(MessageUpdated::class);
});

test('a message cannot be edited past the edit window', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $sender->id,
        'created_at' => now()->subMinutes(MessageData::EDIT_WINDOW_MINUTES + 1),
    ]);

    $response = $this
        ->actingAs($sender)
        ->patchJson(route('messages.update', [$team, $conversation, $message]), [
            'body' => 'demasiado tarde',
        ]);

    $response->assertStatus(422);
    $this->assertDatabaseHas('messages', ['id' => $message->id, 'body' => $message->getOriginal('body')]);
});

test('a participant cannot edit a message they did not author', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    $response = $this
        ->actingAs($other)
        ->patchJson(route('messages.update', [$team, $conversation, $message]), [
            'body' => 'intento ajeno',
        ]);

    $response->assertForbidden();
});

test('a message can be forwarded to another conversation the user participates in', function () {
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();
    $third = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);
    attachTeamMember($team, $third);

    $sourceConversation = makeDmConversation($team, $sender, $other);
    $targetConversation = makeDmConversation($team, $sender, $third);

    $message = Message::factory()->create([
        'conversation_id' => $sourceConversation->id,
        'user_id' => $sender->id,
        'body' => 'mensaje para reenviar',
    ]);

    $response = $this
        ->actingAs($sender)
        ->postJson(route('messages.forward', [$team, $sourceConversation, $message]), [
            'conversation_ids' => [$targetConversation->id],
        ]);

    $response->assertOk();
    $response->assertJson(['forwarded' => 1]);

    $this->assertDatabaseHas('messages', [
        'conversation_id' => $targetConversation->id,
        'user_id' => $sender->id,
        'body' => 'mensaje para reenviar',
        'forwarded_from_message_id' => $message->id,
        'forwarded_from_conversation_id' => $sourceConversation->id,
    ]);

    Event::assertDispatched(MessageSent::class);
});

test('a message cannot be forwarded to a conversation the user does not participate in', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();
    $third = User::factory()->create();
    $fourth = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);
    attachTeamMember($team, $third);
    attachTeamMember($team, $fourth);

    $sourceConversation = makeDmConversation($team, $sender, $other);
    $foreignConversation = makeDmConversation($team, $third, $fourth);

    $message = Message::factory()->create([
        'conversation_id' => $sourceConversation->id,
        'user_id' => $sender->id,
    ]);

    $response = $this
        ->actingAs($sender)
        ->postJson(route('messages.forward', [$team, $sourceConversation, $message]), [
            'conversation_ids' => [$foreignConversation->id],
        ]);

    $response->assertJsonValidationErrors('conversation_ids.0');
    $this->assertDatabaseMissing('messages', ['conversation_id' => $foreignConversation->id]);
});
