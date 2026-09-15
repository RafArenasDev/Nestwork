<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\StartConversationWithUser;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\MessageDeletion;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ConversationsController extends Controller
{
    public function store(
        Request $request,
        string $current_team,
        StartConversationWithUser $startConversation,
    ): RedirectResponse {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team, 404);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

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
