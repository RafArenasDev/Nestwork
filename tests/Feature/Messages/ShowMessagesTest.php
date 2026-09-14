<?php

use App\Enums\TeamRole;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a participant can view a conversation', function () {
    $team = Team::factory()->create();
    $viewer = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $viewer, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $viewer, $other);

    $response = $this
        ->actingAs($viewer)
        ->get(route('messages.show', [$team, $conversation]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('messages/index')
        ->where('conversation.id', $conversation->id),
    );
});

test('a team member who is not a participant cannot view the conversation', function () {
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
        ->get(route('messages.show', [$team, $conversation]));

    $response->assertForbidden();
});

test('a conversation belonging to another team returns 404', function () {
    $team = Team::factory()->create();
    $otherTeam = Team::factory()->create();

    $viewer = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $viewer, TeamRole::Owner);
    attachTeamMember($team, $other);
    attachTeamMember($otherTeam, $viewer);

    $conversation = makeDmConversation($team, $viewer, $other);

    $response = $this
        ->actingAs($viewer)
        ->get(route('messages.show', [$otherTeam, $conversation]));

    $response->assertNotFound();
});

test('only the most recent messages up to the initial limit are returned', function () {
    $team = Team::factory()->create();
    $viewer = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $viewer, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $viewer, $other);

    $total = 160;

    for ($i = 1; $i <= $total; $i++) {
        Message::factory()->create([
            'conversation_id' => $conversation->id,
            'user_id' => $other->id,
            'body' => "mensaje {$i}",
        ]);
    }

    $allMessageIds = Message::query()
        ->where('conversation_id', $conversation->id)
        ->orderBy('id')
        ->pluck('id');

    $expectedOldestKeptId = $allMessageIds->slice(-150)->first();
    $expectedNewestId = $allMessageIds->last();

    $response = $this
        ->actingAs($viewer)
        ->get(route('messages.show', [$team, $conversation]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('messages/index')
        ->has('messages', 150)
        ->where('messages.0.id', $expectedOldestKeptId)
        ->where('messages.149.id', $expectedNewestId),
    );
});

test('the sender own messages are marked read once the other participant has read up to that point', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $reader = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $reader);

    $conversation = makeDmConversation($team, $sender, $reader);

    $first = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);
    $second = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);
    $third = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    // The reader has only read up to the second message so far.
    $conversation->participants()->updateExistingPivot($reader->id, [
        'last_read_message_id' => $second->id,
    ]);

    $response = $this
        ->actingAs($sender)
        ->get(route('messages.show', [$team, $conversation]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('messages/index')
        ->where('messages.0.id', $first->id)
        ->where('messages.0.status', 'read')
        ->where('messages.1.id', $second->id)
        ->where('messages.1.status', 'read')
        ->where('messages.2.id', $third->id)
        ->where('messages.2.status', 'sent'),
    );
});

test('own messages show as sent when the other participant has not read anything yet', function () {
    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $reader = User::factory()->create();

    attachTeamMember($team, $sender, TeamRole::Owner);
    attachTeamMember($team, $reader);

    $conversation = makeDmConversation($team, $sender, $reader);

    $message = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $sender->id]);

    $response = $this
        ->actingAs($sender)
        ->get(route('messages.show', [$team, $conversation]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('messages.0.id', $message->id)
        ->where('messages.0.status', 'sent'),
    );
});

test('viewing a conversation does NOT mark it as read for the viewer', function () {
    // Marcado real de "leído" sólo ocurre por interacción explícita en
    // el cliente (ver MarkReadMessageTest) — abrir el chat únicamente
    // carga y muestra los mensajes, para que el badge/estilo de
    // no-leído no se cierre solo con la visita.
    $team = Team::factory()->create();
    $viewer = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $viewer, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $viewer, $other);

    Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $other->id]);

    $this
        ->actingAs($viewer)
        ->get(route('messages.show', [$team, $conversation]));

    $pivot = $conversation->participants()->where('users.id', $viewer->id)->first()?->pivot;

    expect($pivot->last_read_message_id)->toBeNull();
});

test('the conversation payload exposes the viewer previous last_read_message_id', function () {
    $team = Team::factory()->create();
    $viewer = User::factory()->create();
    $other = User::factory()->create();

    attachTeamMember($team, $viewer, TeamRole::Owner);
    attachTeamMember($team, $other);

    $conversation = makeDmConversation($team, $viewer, $other);

    $firstBatch = Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $other->id]);

    $conversation->participants()->updateExistingPivot($viewer->id, [
        'last_read_message_id' => $firstBatch->id,
    ]);

    Message::factory()->create(['conversation_id' => $conversation->id, 'user_id' => $other->id]);

    $response = $this
        ->actingAs($viewer)
        ->get(route('messages.show', [$team, $conversation]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('conversation.viewerLastReadMessageId', $firstBatch->id),
    );
});
