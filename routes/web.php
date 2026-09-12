<?php

use App\Http\Controllers\ConversationsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MessagesController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Controllers\UserStatusController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('login'))->name('home');

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        Route::get('messages', [MessagesController::class, 'index'])->name('messages.index');
        Route::get('messages/{conversation}', [MessagesController::class, 'show'])->name('messages.show');
        Route::post('messages/{conversation}', [MessagesController::class, 'store'])->name('messages.store');

        Route::post('conversations', [ConversationsController::class, 'store'])->name('conversations.store');
        Route::patch('conversations/{conversation}/archive', [ConversationsController::class, 'toggleArchive'])->name('conversations.toggle-archive');
        Route::patch('conversations/{conversation}/mute', [ConversationsController::class, 'toggleMute'])->name('conversations.toggle-mute');
    });

Route::middleware(['auth'])->group(function () {
    Route::post('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');

    Route::patch('user/status', [UserStatusController::class, 'update'])->name('user-status.update');
    Route::delete('user/status', [UserStatusController::class, 'destroy'])->name('user-status.destroy');
});

require __DIR__.'/auth.php';
require __DIR__.'/settings.php';
