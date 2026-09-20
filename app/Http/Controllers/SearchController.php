<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\MessageDeletion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SearchController extends Controller
{
    private const LIMIT = 8;

    /**
     * Búsqueda global por mensajes (la barra siempre visible del header
     * del contenido) — conversaciones y personas ya viajan enteras en
     * `conversations`/`teamMembers` (props de cada página), así que eso
     * se filtra client-side; esto es lo único que de verdad necesita ir
     * al backend: el texto de mensajes no cargados en pantalla.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team, 404);

        $query = trim((string) $request->string('q'));

        if (mb_strlen($query) < 2) {
            return response()->json(['messages' => []]);
        }

        // Alcance opcional: "esta conversación" (filtro del buscador
        // global) restringe la búsqueda de mensajes a un solo chat en
        // vez de todo el equipo — sigue exigiendo participación real,
        // igual que la búsqueda sin alcance.
        $conversationId = $request->integer('conversation_id') ?: null;

        $messages = Message::query()
            ->whereHas('conversation', fn ($q) => $q->where('team_id', $team->id))
            ->whereHas('conversation.participants', fn ($q) => $q->where('users.id', $user->id))
            ->when($conversationId, fn ($q) => $q->where('conversation_id', $conversationId))
            ->whereNotIn('id', MessageDeletion::query()->where('user_id', $user->id)->select('message_id'))
            ->where('is_hidden', false)
            ->where('body', 'like', '%'.$query.'%')
            ->with(['user', 'conversation.participants'])
            ->orderByDesc('id')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Message $message) => [
                'id' => $message->id,
                'conversationId' => $message->conversation_id,
                'conversationName' => $message->conversation->displayNameFor($user),
                'senderName' => $message->user->name,
                'senderAvatar' => $message->user->avatar,
                'excerpt' => Str::limit($message->body, 140),
                'createdAt' => $message->created_at?->toIso8601String(),
            ])
            ->values();

        return response()->json(['messages' => $messages]);
    }
}
