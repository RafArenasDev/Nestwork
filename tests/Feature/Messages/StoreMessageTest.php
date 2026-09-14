<?php

use App\Enums\MessageType;
use App\Enums\TeamRole;
use App\Events\MessageSent;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;

test('a team member can post a message to a conversation they belong to', function () {
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    $team->members()->attach($sender, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($other, ['role' => TeamRole::Member->value]);

    $conversation = makeDmConversation($team, $sender, $other);

    $response = $this
        ->actingAs($sender)
        ->post(route('messages.store', [$team, $conversation]), [
            'body' => 'Hola, ¿cómo vas con eso?',
        ]);

    $response->assertRedirect(route('messages.show', [$team, $conversation]));

    $this->assertDatabaseHas('messages', [
        'conversation_id' => $conversation->id,
        'user_id' => $sender->id,
        'body' => 'Hola, ¿cómo vas con eso?',
    ]);

    Event::assertDispatched(MessageSent::class, function (MessageSent $event) use ($conversation) {
        return $event->message->conversation_id === $conversation->id
            && $event->message->body === 'Hola, ¿cómo vas con eso?';
    });
});

test('storing a message updates the sender own last read message id', function () {
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    $team->members()->attach($sender, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($other, ['role' => TeamRole::Member->value]);

    $conversation = makeDmConversation($team, $sender, $other);

    $this
        ->actingAs($sender)
        ->post(route('messages.store', [$team, $conversation]), [
            'body' => 'mensaje de prueba',
        ]);

    $message = Message::query()->where('conversation_id', $conversation->id)->firstOrFail();

    $pivot = $conversation->participants()->where('users.id', $sender->id)->first()?->pivot;

    expect($pivot->last_read_message_id)->toBe($message->id);
});

test('an empty message body fails validation', function () {
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    $team->members()->attach($sender, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($other, ['role' => TeamRole::Member->value]);

    $conversation = makeDmConversation($team, $sender, $other);

    $response = $this
        ->actingAs($sender)
        ->post(route('messages.store', [$team, $conversation]), [
            'body' => '',
        ]);

    $response->assertSessionHasErrors('body');
    $this->assertDatabaseCount('messages', 0);
    Event::assertNotDispatched(MessageSent::class);
});

test('a message body over the max length fails validation', function () {
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    $team->members()->attach($sender, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($other, ['role' => TeamRole::Member->value]);

    $conversation = makeDmConversation($team, $sender, $other);

    $response = $this
        ->actingAs($sender)
        ->post(route('messages.store', [$team, $conversation]), [
            'body' => str_repeat('a', 4001),
        ]);

    $response->assertSessionHasErrors('body');
    $this->assertDatabaseCount('messages', 0);
});

test('a message with only an attachment and no body succeeds', function () {
    Storage::fake('public');
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    $team->members()->attach($sender, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($other, ['role' => TeamRole::Member->value]);

    $conversation = makeDmConversation($team, $sender, $other);

    $response = $this
        ->actingAs($sender)
        ->post(route('messages.store', [$team, $conversation]), [
            'attachment' => UploadedFile::fake()->image('foto.jpg', 800, 600),
        ]);

    $response->assertRedirect(route('messages.show', [$team, $conversation]));

    $message = Message::query()->where('conversation_id', $conversation->id)->firstOrFail();

    expect($message->type)->toBe(MessageType::Image);

    $this->assertDatabaseHas('attachments', [
        'message_id' => $message->id,
        'type' => 'image',
        'original_name' => 'foto.jpg',
        'width' => 800,
        'height' => 600,
    ]);

    $attachment = $message->attachments()->firstOrFail();
    Storage::disk('public')->assertExists($attachment->path);
});

test('a message with neither body nor attachment fails validation', function () {
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    $team->members()->attach($sender, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($other, ['role' => TeamRole::Member->value]);

    $conversation = makeDmConversation($team, $sender, $other);

    $response = $this
        ->actingAs($sender)
        ->post(route('messages.store', [$team, $conversation]), []);

    $response->assertSessionHasErrors('body');
    $this->assertDatabaseCount('messages', 0);
});

test('a team member who is not a participant of the conversation gets a 403', function () {
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();
    $outsider = User::factory()->create();

    $team->members()->attach($sender, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($other, ['role' => TeamRole::Member->value]);
    // Outsider belongs to the team (passes EnsureTeamMembership) but is
    // not a participant of this specific conversation.
    $team->members()->attach($outsider, ['role' => TeamRole::Member->value]);

    $conversation = makeDmConversation($team, $sender, $other);

    $response = $this
        ->actingAs($outsider)
        ->post(route('messages.store', [$team, $conversation]), [
            'body' => 'no debería poder enviar esto',
        ]);

    $response->assertForbidden();
    $this->assertDatabaseCount('messages', 0);
});

test('reply_to_message_id must belong to the same conversation', function () {
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    $team->members()->attach($sender, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($other, ['role' => TeamRole::Member->value]);

    $conversation = makeDmConversation($team, $sender, $other);
    $otherConversation = makeDmConversation($team, $sender, $other);

    $foreignMessage = Message::factory()->create([
        'conversation_id' => $otherConversation->id,
        'user_id' => $sender->id,
    ]);

    $response = $this
        ->actingAs($sender)
        ->post(route('messages.store', [$team, $conversation]), [
            'body' => 'respondiendo a un mensaje de otra conversación',
            'reply_to_message_id' => $foreignMessage->id,
        ]);

    $response->assertSessionHasErrors('reply_to_message_id');
    $this->assertDatabaseCount('messages', 1); // only the foreign message exists
});

test('a valid reply_to_message_id within the same conversation succeeds', function () {
    Event::fake([MessageSent::class]);

    $team = Team::factory()->create();
    $sender = User::factory()->create();
    $other = User::factory()->create();

    $team->members()->attach($sender, ['role' => TeamRole::Owner->value]);
    $team->members()->attach($other, ['role' => TeamRole::Member->value]);

    $conversation = makeDmConversation($team, $sender, $other);

    $original = Message::factory()->create([
        'conversation_id' => $conversation->id,
        'user_id' => $other->id,
    ]);

    $response = $this
        ->actingAs($sender)
        ->post(route('messages.store', [$team, $conversation]), [
            'body' => 'respondiendo a tu mensaje',
            'reply_to_message_id' => $original->id,
        ]);

    $response->assertRedirect(route('messages.show', [$team, $conversation]));

    $this->assertDatabaseHas('messages', [
        'conversation_id' => $conversation->id,
        'reply_to_message_id' => $original->id,
    ]);
});
