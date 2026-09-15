<?php

use App\Enums\TeamRole;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;

test('deleting a message for everyone encrypts the body and hides it for all participants', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $sender->id,
        'body' => 'texto secreto',
    ]);

    $response = $this
        ->actingAs($sender)
        ->deleteJson(route('messages.destroy', [$team, $conversation, $message]));

    $response->assertOk();

    $message->refresh();
    expect($message->is_hidden)->toBeTrue();
    expect($message->body)->toBe('');
    expect($message->original_body)->toBe('texto secreto');

    // Nunca en texto plano en la columna cruda de la BD.
    $raw = DB::table('messages')->where('id', $message->id)->value('original_body');
    expect($raw)->not->toContain('texto secreto');
});

test('a participant cannot delete for everyone a message they did not author', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    $response = $this
        ->actingAs($other)
        ->deleteJson(route('messages.destroy', [$team, $conversation, $message]));

    $response->assertForbidden();
});

test('hiding a message for me removes it only from my own message list', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    $this
        ->actingAs($other)
        ->postJson(route('messages.hide', [$team, $conversation, $message]))
        ->assertOk();

    $this->assertDatabaseHas('message_deletions', [
        'message_id' => $message->id,
        'user_id' => $other->id,
    ]);

    $otherView = $this->actingAs($other)->get(route('messages.show', [$team, $conversation]));
    $otherView->assertInertia(fn ($page) => $page->where('messages', fn ($messages) => collect($messages)->doesntContain(fn ($m) => $m['id'] === $message->id)));

    $senderView = $this->actingAs($sender)->get(route('messages.show', [$team, $conversation]));
    $senderView->assertInertia(fn ($page) => $page->where('messages', fn ($messages) => collect($messages)->contains(fn ($m) => $m['id'] === $message->id)));
});

test('toggling save marks and unmarks a message as saved for the viewer', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    $this->actingAs($other)
        ->postJson(route('messages.save.toggle', [$team, $conversation, $message]))
        ->assertOk()
        ->assertJson(['saved' => true]);

    $this->assertDatabaseHas('saved_messages', ['user_id' => $other->id, 'message_id' => $message->id]);

    $this->actingAs($other)
        ->postJson(route('messages.save.toggle', [$team, $conversation, $message]))
        ->assertOk()
        ->assertJson(['saved' => false]);

    $this->assertDatabaseMissing('saved_messages', ['user_id' => $other->id, 'message_id' => $message->id]);
});

test('pinning a message sets it as the conversation pinned message, and toggling again unpins it', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);
    $message = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    $this->actingAs($sender)
        ->postJson(route('messages.pin.toggle', [$team, $conversation, $message]))
        ->assertOk()
        ->assertJson(['pinnedMessageId' => $message->id]);

    expect($conversation->refresh()->pinned_message_id)->toBe($message->id);

    $this->actingAs($sender)
        ->postJson(route('messages.pin.toggle', [$team, $conversation, $message]))
        ->assertOk()
        ->assertJson(['pinnedMessageId' => null]);

    expect($conversation->refresh()->pinned_message_id)->toBeNull();
});

test('clearing the chat with scope today hides only messages created today for the requester', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);

    $yesterday = Message::factory()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $sender->id,
        'created_at' => now()->subDay(),
    ]);
    $today = Message::factory()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $sender->id,
        'created_at' => now(),
    ]);

    $this->actingAs($other)
        ->patch(route('conversations.clear', [$team, $conversation]), ['scope' => 'today']);

    $this->assertDatabaseHas('message_deletions', ['message_id' => $today->id, 'user_id' => $other->id]);
    $this->assertDatabaseMissing('message_deletions', ['message_id' => $yesterday->id, 'user_id' => $other->id]);
});

test('clearing the chat with scope all sets cleared_at for the requester only', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);

    $this->actingAs($other)
        ->patch(route('conversations.clear', [$team, $conversation]), ['scope' => 'all']);

    $otherPivot = $conversation->participants()->where('users.id', $other->id)->first()->pivot;
    $senderPivot = $conversation->participants()->where('users.id', $sender->id)->first()->pivot;

    expect($otherPivot->cleared_at)->not->toBeNull();
    expect($senderPivot->cleared_at)->toBeNull();
});

test('deleting the conversation hides it and clears the requester history without affecting the other participant', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $sender, $other);

    $this->actingAs($other)
        ->patch(route('conversations.toggle-hidden', [$team, $conversation]));

    $otherPivot = $conversation->participants()->where('users.id', $other->id)->first()->pivot;
    $senderPivot = $conversation->participants()->where('users.id', $sender->id)->first()->pivot;

    expect($otherPivot->hidden_at)->not->toBeNull();
    expect($otherPivot->cleared_at)->not->toBeNull();
    expect($senderPivot->hidden_at)->toBeNull();
    expect($senderPivot->cleared_at)->toBeNull();
});
