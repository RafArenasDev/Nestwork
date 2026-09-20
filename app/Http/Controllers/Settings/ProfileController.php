<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(): Response
    {
        return Inertia::render('settings/profile');
    }

    /**
     * Update the user's profile information — `back()` en vez de
     * `to_route('profile.edit')`: el modal de Ajustes (perfil ya no
     * vive sólo en /settings/profile) llama este mismo endpoint y no
     * puede sacar al usuario del chat donde estaba.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return back();
    }

    /**
     * Foto de perfil — reemplaza el archivo anterior si era uno
     * subido acá (nunca borra una URL externa, ej. avatar de Google).
     */
    public function updateAvatar(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'avatar' => ['required', File::image()->max(2 * 1024)],
        ]);

        $user = $request->user();
        $previousPath = $user->avatar;

        $path = $validated['avatar']->store('avatars', 'public');
        $user->update(['avatar' => Storage::disk('public')->url($path)]);

        if ($previousPath && str_contains($previousPath, '/storage/avatars/')) {
            Storage::disk('public')->delete('avatars/'.basename($previousPath));
        }

        return back();
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
