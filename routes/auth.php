<?php

use App\Http\Controllers\Auth\FirebaseSessionController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('login', [FirebaseSessionController::class, 'create'])->name('login');
    Route::post('auth/firebase', [FirebaseSessionController::class, 'store'])->name('firebase.login');
});

Route::post('logout', [FirebaseSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');
