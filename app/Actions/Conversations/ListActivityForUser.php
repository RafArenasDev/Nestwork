<?php

namespace App\Actions\Conversations;

use App\Data\ActivityItem;
use App\Models\Reaction;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * "Actividad" real — antes era literalmente la misma lista de
 * conversaciones que Chats/Inicio, sólo reordenada, sin mostrar
 * ninguna novedad puntual de verdad. Por ahora sólo cubre reacciones
 * recibidas en tus propios mensajes (dato que ya existe, sin tabla
 * nueva); menciones y ediciones ajenas quedan para cuando existan esos
 * conceptos. Actualizaciones de estado de compañeros NO están acá
 * todavía a propósito: requieren un historial de cambios que hoy no
 * se guarda (sólo el valor actual) — nueva tabla, pendiente de
 * proponerse aparte antes de construirla.
 */
class ListActivityForUser
{
    private const LIMIT = 50;

    /**
     * @return Collection<int, ActivityItem>
     */
    public function handle(User $user, Team $team): Collection
    {
        return Reaction::query()
            ->whereHas('message', fn ($query) => $query->where('user_id', $user->id))
            ->where('user_id', '!=', $user->id)
            ->whereHas('message.conversation', fn ($query) => $query->where('team_id', $team->id))
            ->with(['user', 'message.conversation'])
            ->latest('created_at')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Reaction $reaction) => new ActivityItem(
                id: 'reaction-'.$reaction->id,
                type: 'reaction',
                conversationId: $reaction->message->conversation_id,
                conversationName: $reaction->message->conversation->displayNameFor($user),
                messageId: $reaction->message_id,
                messageExcerpt: $reaction->message->is_hidden
                    ? 'Mensaje eliminado'
                    : Str::limit($reaction->message->body, 80),
                actorName: $reaction->user->name,
                actorAvatar: $reaction->user->avatar,
                emoji: $reaction->emoji,
                createdAt: $reaction->created_at->toIso8601String(),
            ))
            ->values();
    }
}
