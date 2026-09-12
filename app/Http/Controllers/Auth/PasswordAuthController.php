<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Teams\AssignUserToDomainTeam;
use App\Actions\Users\GenerateUniqueUsername;
use App\Enums\AuthProvider;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Responses\Concerns\RedirectsToCurrentTeam;
use App\Models\Country;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordAuthController extends Controller
{
    use RedirectsToCurrentTeam;

    /**
     * Show the registration page — misma pantalla que login (panel
     * deslizante), sólo cambia qué lado arranca activo.
     */
    public function create(): Response
    {
        return Inertia::render('auth/login', [
            'initialPanel' => 'register',
            'countries' => Country::query()
                ->orderBy('name')
                ->get(['iso2', 'name', 'flag_url']),
        ]);
    }

    /**
     * Register a new email+password account.
     */
    public function store(
        RegisterRequest $request,
        AssignUserToDomainTeam $assignUserToDomainTeam,
        GenerateUniqueUsername $generateUniqueUsername,
    ): RedirectResponse {
        $name = $request->validated('name');
        $countryCode = strtoupper((string) $request->validated('country'));

        $user = User::create([
            'name' => $name,
            'username' => $generateUniqueUsername->handle($name),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'country' => $countryCode,
            'email_verified_at' => now(),
            'auth_provider' => AuthProvider::Password,
        ]);

        // Mismo auto-join por dominio que Google — nunca se pide crear
        // o nombrar un equipo durante el registro.
        $assignUserToDomainTeam->handle($user);

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        // El idioma se deriva del país elegido — nunca se le pregunta
        // en el registro. Queda editable después desde Ajustes.
        $locale = Country::query()->where('iso2', $countryCode)->value('locale');

        if ($locale) {
            Cookie::queue('locale', $locale, 60 * 24 * 365);
        }

        return redirect()->intended(
            $this->redirectPathForCurrentTeam($request, '/dashboard')
        );
    }

    /**
     * Log in with email and password.
     */
    public function login(LoginRequest $request): RedirectResponse
    {
        $credentials = $request->validated();

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! $user->password || ! Auth::attempt($credentials, remember: true)) {
            throw ValidationException::withMessages([
                'email' => __('These credentials do not match our records.'),
            ]);
        }

        $request->session()->regenerate();

        $request->user()->forceFill(['last_seen_at' => now()])->save();

        return redirect()->intended(
            $this->redirectPathForCurrentTeam($request, '/dashboard')
        );
    }
}
