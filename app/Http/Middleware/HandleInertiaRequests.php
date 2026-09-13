<?php

namespace App\Http\Middleware;

use App\Actions\Conversations\ListConversationsForUser;
use App\Data\StatusPresetOption;
use App\Data\TeamMemberOption;
use App\Models\StatusPreset;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // ThemeToggle necesita esto para el render inicial (SSR y
            // cliente): antes leía `document.documentElement` directo,
            // pero `document` no existe durante el render SSR de
            // Inertia — el server siempre asumía "oscuro" sin importar
            // la cookie real, y React tiraba un warning de hydration
            // mismatch apenas el cliente corregía al valor real.
            'appearance' => $request->cookie('appearance') ?? 'system',
            'currentTeam' => fn () => $user?->currentTeam ? $user->toUserTeam($user->currentTeam) : null,
            'teams' => fn () => $user?->toUserTeams(includeCurrent: true) ?? [],
            // Compartida en todas las páginas (no solo messages/*) para
            // que la lista del mini-sidebar (AppSidebar) siempre tenga
            // datos reales, sin importar en qué módulo esté el usuario.
            // Una página específica (messages/show) puede sobrescribirla
            // con su propia versión (con currentConversationId marcado).
            'conversations' => fn () => $user && $user->currentTeam
                ? app(ListConversationsForUser::class)->handle($user, $user->currentTeam)
                : [],
            // Mismo dato pero solo lo archivado — alimenta la pestaña
            // "Archivado" del mini-rail con datos reales.
            'archivedConversations' => fn () => $user && $user->currentTeam
                ? app(ListConversationsForUser::class)->handle($user, $user->currentTeam, archivedOnly: true)
                : [],
            // Para el modal de "Nuevo chat" en el mini-sidebar de
            // Mensajes — compartido globalmente por la misma razón que
            // `conversations`.
            'teamMembers' => fn () => $user && $user->currentTeam
                ? $user->currentTeam->members()
                    ->where('users.id', '!=', $user->id)
                    ->orderBy('name')
                    ->get()
                    ->map(fn (User $member) => new TeamMemberOption(
                        id: $member->id,
                        name: $member->name,
                        username: $member->username,
                        avatar: $member->avatar,
                    ))
                : [],
            // Catálogo de estados del dropdown de perfil (sección 3.2/10
            // del prompt v2) — reemplaza los arrays que antes vivían
            // quemados en curved-nav-rail.tsx.
            'statusPresets' => fn () => StatusPreset::query()
                ->where('is_enabled', true)
                ->orderBy('sort_order')
                ->get()
                ->map(fn (StatusPreset $preset) => new StatusPresetOption(
                    key: $preset->key,
                    emoji: $preset->emoji,
                    label: App::getLocale() === 'en' ? $preset->label_en : $preset->label_es,
                    defaultDurationMinutes: $preset->default_duration_minutes,
                )),
        ];
    }
}
