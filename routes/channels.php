<?php

use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Presencia en vivo por equipo — quién está conectado ahora mismo. Sólo
// miembros del equipo pueden unirse; el payload es lo que ven los demás
// en los eventos here/joining/leaving de Echo.
Broadcast::channel('presence-team.{team}', function (User $user, Team $team) {
    if (! $user->belongsToTeam($team)) {
        return null;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar' => $user->avatar,
    ];
});
