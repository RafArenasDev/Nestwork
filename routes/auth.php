<?php

use App\Http\Controllers\Auth\FirebaseSessionController;
use App\Http\Controllers\Auth\PasswordAuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('login', [FirebaseSessionController::class, 'create'])->name('login');
    Route::post('auth/firebase', [FirebaseSessionController::class, 'store'])->name('firebase.login');

    Route::get('register', [PasswordAuthController::class, 'create'])->name('register');
    Route::post('register', [PasswordAuthController::class, 'store'])->name('register.store');
    Route::post('login', [PasswordAuthController::class, 'login'])->name('login.store');
});

Route::post('logout', [FirebaseSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');
