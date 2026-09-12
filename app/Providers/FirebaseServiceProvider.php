<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Kreait\Firebase\Auth as FirebaseAuth;
use Kreait\Firebase\Factory;

class FirebaseServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(FirebaseAuth::class, function () {
            $factory = (new Factory)
                ->withServiceAccount(base_path(config('firebase.credentials')))
                ->withProjectId(config('firebase.project_id'));

            return $factory->createAuth();
        });
    }
}
