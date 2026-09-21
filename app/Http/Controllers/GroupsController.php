<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\CreateGroup;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GroupsController extends Controller
{
    public function store(Request $request, string $current_team, CreateGroup $createGroup): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'member_ids' => ['required', 'array', 'min:1'],
            'member_ids.*' => ['integer', Rule::exists('users', 'id')],
        ]);

        $memberIds = User::query()
            ->whereIn('id', $validated['member_ids'])
            ->get()
            ->filter(fn (User $member) => $member->id !== $user->id && $member->belongsToTeam($team))
            ->pluck('id')
            ->all();

        abort_if($memberIds === [], 422, 'Elige al menos un miembro válido del equipo.');

        $conversation = $createGroup->handle(
            $user,
            $memberIds,
            $team,
            $validated['name'],
            $validated['description'] ?? null,
        );

        return redirect()->route('messages.show', [$team->slug, $conversation]);
    }
}
