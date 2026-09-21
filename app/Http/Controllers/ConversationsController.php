<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\CreateGroupChat;
use App\Actions\Conversations\StartConversationWithUser;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Favorite;
use App\Models\MessageDeletion;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ConversationsController extends Controller
{
    /**
     * Un solo destinatario ⇒ DM (o el DM existente, si ya había uno).
     * Varios ⇒ minichat nuevo siempre (a diferencia del DM, no busca
     * uno existente con el mismo grupo de gente — pedirlo así sería
     * ambiguo apenas alguien más arma otro grupo con las mismas
     * personas). Ambos viven en "Chats", nunca en el módulo Grupos.
     */
    public function store(
        Request $request,
        string $current_team,
        StartConversationWithUser $startConversation,
        CreateGroupChat $createGroupChat,
    ): RedirectResponse {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team, 404);

        $validated = $request->validate([
            'user_id' => ['required_without:user_ids', 'nullable', 'integer', Rule::exists('users', 'id')],
            'user_ids' => ['required_without:user_id', 'nullable', 'array', 'min:2'],
            'user_ids.*' => ['integer', Rule::exists('users', 'id')],
            'name' => ['nullable', 'string', 'max:100'],
        ]);

        if (isset($validated['user_ids'])) {
            $memberIds = User::query()
                ->whereIn('id', $validated['user_ids'])
                ->get()
                ->filter(fn (User $member) => $member->id !== $user->id && $member->belongsToTeam($team))
                ->pluck('id')
                ->all();

            if (count($memberIds) < 2) {
                throw ValidationException::withMessages([
                    'user_ids' => 'Elige al menos dos personas del equipo.',
                ]);
            }

            $conversation = $createGroupChat->handle($user, $memberIds, $team, $validated['name'] ?? null);

            return redirect()->route('messages.show', [$team->slug, $conversation]);
        }

        $other = User::query()->findOrFail((int) $validated['user_id']);

        if ($other->id === $user->id || ! $other->belongsToTeam($team)) {
            throw ValidationException::withMessages([
                'user_id' => 'No puedes iniciar un chat con ese usuario.',
            ]);
        }

        $conversation = $startConversation->handle($user, $other, $team);

        return redirect()->route('messages.show', [$team->slug, $conversation]);
    }

    public function toggleArchive(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);

        $pivot = $this->participantPivot($conversation, $user->id);

        $conversation->participants()->updateExistingPivot($user->id, [
            'archived_at' => $pivot->isArchived() ? null : now(),
        ]);

        return back();
    }

    /** "Inicio" muestra los favoritos, no la misma lista completa que
     *  Chats/Grupos/Canales (ver ListConversationsForUser::$favoritesOnly) —
     *  cualquier tipo de conversación se puede marcar. */
    public function toggleFavorite(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        $this->participantPivot($conversation, $user->id);

        $favorite = Favorite::query()
            ->where('user_id', $user->id)
            ->where('favoritable_type', Conversation::class)
            ->where('favoritable_id', $conversation->id)
            ->first();

        if ($favorite) {
            $favorite->delete();
        } else {
            Favorite::query()->create([
                'user_id' => $user->id,
                'favoritable_type' => Conversation::class,
                'favoritable_id' => $conversation->id,
            ]);
        }

        return back();
    }

    public function toggleMute(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);

        $pivot = $this->participantPivot($conversation, $user->id);

        $conversation->participants()->updateExistingPivot($user->id, [
            'muted_at' => $pivot->isMuted() ? null : now(),
        ]);

        return back();
    }

    /** "Marcar como no leído" — vuelve a contar TODO lo que mandaron
     *  los demás como no leído, sin tocar nada del lado del otro
     *  participante (mismo criterio que Gmail/WhatsApp). */
    public function markUnread(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        $this->participantPivot($conversation, $user->id);

        $conversation->participants()->updateExistingPivot($user->id, [
            'last_read_message_id' => null,
        ]);

        return back();
    }

    /**
     * "Eliminar conversación" — distinto de archivar (ver
     * migración `hidden_at`): desaparece de TODOS los listados
     * (activos y archivados) hasta que el usuario la busque a propósito
     * por el buscador. Además, borra el historial visual PARA MÍ (igual
     * que "Limpiar chat > Todo" — ver `cleared_at`): si la vuelvo a
     * abrir no veo ningún mensaje anterior a este momento. El otro
     * participante conserva absolutamente todo, sin ningún cambio.
     */
    public function toggleHidden(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);

        $pivot = $this->participantPivot($conversation, $user->id);
        $hiding = ! $pivot->isHidden();

        $conversation->participants()->updateExistingPivot($user->id, [
            'hidden_at' => $hiding ? now() : null,
            'cleared_at' => $hiding ? now() : $pivot->cleared_at,
        ]);

        return redirect()->route('messages.index', $current_team);
    }

    /**
     * "Limpiar chat": dos alcances — "today" oculta SOLO los mensajes
     * de hoy (reutiliza `message_deletions`, fila por mensaje — el
     * volumen de un solo día es siempre chico); "all" oculta TODO el
     * historial hasta ahora de una sola vez vía `cleared_at` (barato,
     * no inserta una fila por mensaje). En ambos casos es SOLO para
     * quien lo pide — el otro participante sigue viendo todo igual, y
     * los mensajes nuevos después de esto vuelven a aparecer normal.
     */
    public function clearChat(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);

        $this->participantPivot($conversation, $user->id);

        $validated = $request->validate([
            'scope' => ['required', 'string', 'in:today,all'],
        ]);

        if ($validated['scope'] === 'today') {
            $todayIds = $conversation->messages()
                ->whereDate('created_at', now()->toDateString())
                ->pluck('id');

            $rows = $todayIds->map(fn (int $messageId) => [
                'message_id' => $messageId,
                'user_id' => $user->id,
                'deleted_at' => now(),
            ]);

            MessageDeletion::query()->upsert(
                $rows->all(),
                ['message_id', 'user_id'],
                ['deleted_at'],
            );
        } else {
            $conversation->participants()->updateExistingPivot($user->id, [
                'cleared_at' => now(),
            ]);
        }

        return back();
    }

    private function participantPivot(Conversation $conversation, int $userId): ConversationParticipant
    {
        $pivot = $conversation->participants()
            ->where('users.id', $userId)
            ->first()
            ?->pivot;

        abort_unless($pivot instanceof ConversationParticipant, 403);

        return $pivot;
    }
}
