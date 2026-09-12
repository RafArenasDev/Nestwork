<?php

namespace App\Actions\Teams;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AssignUserToDomainTeam
{
    /**
     * Put a newly signed-up user into the team that matches their email
     * domain: public/free providers (gmail, outlook, ...) all share the
     * single guest team, everyone else gets (or joins) a team named after
     * their root email domain (subdomains like estudiantes.areandina.edu.co
     * and areandina.edu.co resolve to the same team).
     */
    public function handle(User $user): Team
    {
        return DB::transaction(function () use ($user) {
            $domain = Str::lower(Str::after($user->email, '@'));

            $team = in_array($domain, config('teams.guest_domains'), true)
                ? $this->guestTeam()
                : $this->domainTeam($this->rootDomain($domain));

            if (! $user->belongsToTeam($team)) {
                $team->memberships()->create([
                    'user_id' => $user->id,
                    'role' => $team->memberships()->exists() ? TeamRole::Member : TeamRole::Owner,
                ]);
            }

            $user->switchTeam($team);

            return $team;
        });
    }

    /**
     * Reduce a domain to its registrable "root": the last 2 labels, or
     * the last 3 when the last 2 form a known compound suffix (edu.co,
     * com.co, ...), so subdomains of the same institution share a team.
     */
    private function rootDomain(string $domain): string
    {
        $labels = explode('.', $domain);

        if (count($labels) < 3) {
            return $domain;
        }

        $lastTwo = implode('.', array_slice($labels, -2));

        if (in_array($lastTwo, config('teams.compound_suffixes'), true)) {
            return implode('.', array_slice($labels, -3));
        }

        return $lastTwo;
    }

    private function guestTeam(): Team
    {
        return Team::query()->firstOrCreate(
            ['slug' => config('teams.guest_team_slug')],
            ['name' => config('teams.guest_team_name'), 'is_personal' => false],
        );
    }

    private function domainTeam(string $domain): Team
    {
        return Team::query()->firstOrCreate(
            ['domain' => $domain],
            [
                // Nombre amigable por defecto (ej. "areandina.edu.co" ->
                // "Areandina") — el dominio completo ya se ve como
                // subtítulo en la UI. El dueño del equipo puede
                // renombrarlo después si el resultado no queda bien
                // (siglas como "utp" quedan "Utp", por ejemplo).
                'name' => Str::ucfirst(Str::before($domain, '.')),
                'slug' => str_replace('.', '-', $domain),
                'is_personal' => false,
            ],
        );
    }
}
