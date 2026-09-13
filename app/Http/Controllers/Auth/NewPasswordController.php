<?php

namespace App\Http\Controllers\Auth;

use App\Enums\AuthProvider;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('auth/reset-password', [
            'email' => $request->query('email'),
            'token' => $request->route('token'),
        ]);
    }

    public function store(ResetPasswordRequest $request): RedirectResponse
    {
        $status = Password::reset(
            $request->validated(),
            function (User $user, string $password) {
                // Restablecer contraseña también sirve para "vincular"
                // login por contraseña a una cuenta que solo usaba
                // Google — igual criterio que FirebaseSessionController
                // al revés.
                $user->forceFill([
                    'password' => $password,
                    'auth_provider' => $user->auth_provider === AuthProvider::Google
                        ? AuthProvider::Both
                        : $user->auth_provider,
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => __($status),
            ]);
        }

        return redirect()->route('login')->with('status', __($status));
    }
}
