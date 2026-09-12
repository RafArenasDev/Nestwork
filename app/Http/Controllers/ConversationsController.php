<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\StartConversationWithUser;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
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
