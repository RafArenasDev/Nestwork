<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\Concerns\RedirectsToCurrentTeam;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationNotificationController extends Controller
{
    use RedirectsToCurrentTeam;

    public function store(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(
                $this->redirectPathForCurrentTeam($request, '/dashboard')
            );
        }

        $request->user()->sendEmailVerificationNotification();

        return back()->with('status', __('auth.verification_sent'));
    }
}
