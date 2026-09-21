<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\CreateChannel;
use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class ChannelsController extends Controller
{
    public function store(Request $request, string $current_team, CreateChannel $createChannel): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_public' => ['required', 'boolean'],
            'member_ids' => ['array'],
            'member_ids.*' => ['integer', Rule::exists('users', 'id')],
        ]);

        $memberIds = User::query()
            ->whereIn('id', $validated['member_ids'] ?? [])
            ->get()
            ->filter(fn (User $member) => $member->id !== $user->id && $member->belongsToTeam($team))
            ->pluck('id')
            ->all();

        $conversation = $createChannel->handle(
            $user,
            $memberIds,
            $team,
            $validated['name'],
            (bool) $validated['is_public'],
            $validated['description'] ?? null,
        );

        return redirect()->route('messages.show', [$team->slug, $conversation]);
    }

    /** Unirse a un canal público — cualquier miembro del equipo puede
     *  hacerlo solo, sin invitación (ver `ListDiscoverableChannelsForUser`). */
    public function join(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->type === ConversationType::Channel && $conversation->is_public, 403);

        if (! $conversation->participants()->where('users.id', $user->id)->exists()) {
            $conversation->participants()->attach([
                $user->id => ['joined_at' => Carbon::now()],
            ]);
        }

        return redirect()->route('messages.show', [$team->slug, $conversation]);
    }
}
