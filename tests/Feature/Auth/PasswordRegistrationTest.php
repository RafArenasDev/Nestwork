<?php

use App\Enums\AuthProvider;
use App\Models\User;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register with email and password', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Camila Torres',
        'email' => 'camila@example.com',
        'password' => 'password',
        'country' => 'CO',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();

    $user = User::query()->where('email', 'camila@example.com')->firstOrFail();

    expect($user->name)->toBe('Camila Torres');
    expect($user->country)->toBe('CO');
    expect($user->auth_provider)->toBe(AuthProvider::Password);
    // Auto-join por dominio, igual que Google — nunca se pide crear/
    // nombrar un equipo durante el registro.
    expect($user->currentTeam)->not->toBeNull();

    $response->assertRedirect();
});

test('registration requires a unique email', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $response = $this->post(route('register.store'), [
        'name' => 'Someone Else',
        'email' => 'taken@example.com',
        'password' => 'password',
        'country' => 'CO',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('registration requires a country', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Camila Torres',
        'email' => 'camila@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('country');
    $this->assertGuest();
});

test('registration requires matching password confirmation', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Camila Torres',
        'email' => 'camila@example.com',
        'password' => 'password',
        'country' => 'CO',
        'password_confirmation' => 'different',
    ]);

    $response->assertSessionHasErrors('password');
    $this->assertGuest();
});

test('registering with an email already used by a google account is rejected', function () {
    // Vincular contraseña a una cuenta de Google existente es una
    // acción deliberada desde Ajustes > Seguridad (requiere estar ya
    // autenticado), no algo que se pueda hacer sólo escribiendo el
    // mismo email en el formulario de registro — si no, cualquiera
    // podría intentar "tomar" una cuenta ajena con una contraseña
    // propia sabiendo únicamente su email.
    User::factory()->create([
        'email' => 'camila@example.com',
        'auth_provider' => AuthProvider::Google,
        'password' => null,
    ]);

    $response = $this->post(route('register.store'), [
        'name' => 'Camila Torres',
        'email' => 'camila@example.com',
        'password' => 'password',
        'country' => 'CO',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});
