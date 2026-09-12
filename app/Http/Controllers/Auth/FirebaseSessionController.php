<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Teams\AssignUserToDomainTeam;
use App\Actions\Users\GenerateUniqueUsername;
use App\Http\Controllers\Controller;
use App\Http\Responses\Concerns\RedirectsToCurrentTeam;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Kreait\Firebase\Auth as FirebaseAuth;
use Kreait\Firebase\Exception\Auth\FailedToVerifyToken;

class FirebaseSessionController extends Controller
{
    use RedirectsToCurrentTeam;

    /**
     * Show the sign-in page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'status' => $request->session()->get('status'),
            'teamInvitation' => $this->teamInvitation($request),
        ]);
    }

    /**
     * Verify the Firebase ID token from the Google sign-in popup and
     * start (or create) the user's session.
     */
    public function store(
        Request $request,
        FirebaseAuth $firebaseAuth,
        AssignUserToDomainTeam $assignUserToDomainTeam,
        GenerateUniqueUsername $generateUniqueUsername,
    ): RedirectResponse {
        $request->validate(['id_token' => ['required', 'string']]);

        $idToken = (string) $request->input('id_token');

        if ($idToken === '') {
            throw ValidationException::withMessages([
                'id_token' => 'No pudimos verificar tu sesión de Google. Intenta de nuevo.',
            ]);
        }

        try {
            $verifiedToken = $firebaseAuth->verifyIdToken($idToken);
        } catch (FailedToVerifyToken) {
            throw ValidationException::withMessages([
                'id_token' => 'No pudimos verificar tu sesión de Google. Intenta de nuevo.',
            ]);
        }

        $claims = $verifiedToken->claims();
        $email = Str::lower((string) $claims->get('email'));

        if ($email === '') {
            throw ValidationException::withMessages([
                'id_token' => 'Tu cuenta de Google no tiene un correo asociado.',
            ]);
        }

        // Sin esto, alguien podría autenticarse con un correo que no le
        // pertenece de verdad (Google entrega el claim igual, solo marca
        // email_verified=false) y tomar la cuenta de otra persona, ya que
        // el email es lo único que usamos para identificar/crear usuarios.
        if ($claims->get('email_verified') !== true) {
            throw ValidationException::withMessages([
                'id_token' => 'Tu correo de Google no está verificado.',
            ]);
        }

        $user = User::query()->where('email', $email)->first();
        $isNewUser = $user === null;

        if ($isNewUser) {
            $name = (string) ($claims->get('name') ?: Str::before($email, '@'));

            $user = User::create([
                'name' => $name,
                'username' => $generateUniqueUsername->handle($name),
                'email' => $email,
                'avatar' => $claims->get('picture'),
                'email_verified_at' => now(),
            ]);
        }

        $user->forceFill(['last_seen_at' => now()])->save();

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        if ($isNewUser) {
            $assignUserToDomainTeam->handle($user);
        }

        return redirect()->intended(
            $this->redirectPathForCurrentTeam($request, '/dashboard')
        );
    }

    /**
     * Log the user out.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->user()?->forceFill(['last_seen_at' => now()])->save();

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    /**
     * Get the pending team invitation context for the login page.
     *
     * @return array{code: string, teamName: string}|null
     */
    private function teamInvitation(Request $request): ?array
    {
        $invitationCode = $request->query('invitation');

        if (! is_string($invitationCode)) {
            return null;
        }

        $invitation = TeamInvitation::query()
            ->with('team')
            ->where('code', $invitationCode)
            ->whereNull('accepted_at')
            ->where(fn ($query) => $query
                ->whereNull('expires_at')
                ->orWhere('expires_at', '>=', now()))
            ->first();

        if (! $invitation) {
            return null;
        }

        return [
            'code' => $invitation->code,
            'teamName' => $invitation->team->name,
        ];
    }
}
