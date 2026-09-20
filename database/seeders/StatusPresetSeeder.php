<?php

namespace Database\Seeders;

use App\Models\StatusPreset;
use Illuminate\Database\Seeder;

/**
 * Catálogo de estados sugeridos (sección 3.2/10 de
 * PROMPT-MEJORAS-NESTWORK-v2.md) — reemplaza los arrays STATUS_PRESETS/
 * CUSTOM_STATUSES que antes estaban quemados en curved-nav-rail.tsx.
 *
 * Los keys available/away/busy/dnd son especiales: User::presenceStatus()
 * los usa por string literal para derivar el punto de presencia — no
 * renombrar sin actualizar ese método también.
 */
class StatusPresetSeeder extends Seeder
{
    /**
     * @var list<array{key: string, emoji: string, label_es: string, label_en: string, default_duration_minutes: int|null, sort_order: int}>
     */
    private const PRESETS = [
        ['key' => 'available', 'emoji' => '🟢', 'label_es' => 'Disponible', 'label_en' => 'Available', 'default_duration_minutes' => null, 'sort_order' => 1],
        ['key' => 'away', 'emoji' => '🟡', 'label_es' => 'Ausente', 'label_en' => 'Away', 'default_duration_minutes' => null, 'sort_order' => 2],
        ['key' => 'busy', 'emoji' => '🔴', 'label_es' => 'Ocupado', 'label_en' => 'Busy', 'default_duration_minutes' => null, 'sort_order' => 3],
        ['key' => 'dnd', 'emoji' => '⛔', 'label_es' => 'No molestar', 'label_en' => 'Do not disturb', 'default_duration_minutes' => null, 'sort_order' => 4],
        ['key' => 'invisible', 'emoji' => '⚪', 'label_es' => 'Aparecer sin conexión', 'label_en' => 'Appear offline', 'default_duration_minutes' => null, 'sort_order' => 5],
        ['key' => 'lunch', 'emoji' => '🍔', 'label_es' => 'Almorzando', 'label_en' => 'At lunch', 'default_duration_minutes' => 60, 'sort_order' => 6],
        ['key' => 'commuting', 'emoji' => '🚗', 'label_es' => 'En camino', 'label_en' => 'Commuting', 'default_duration_minutes' => 30, 'sort_order' => 7],
        ['key' => 'meeting', 'emoji' => '📅', 'label_es' => 'En una reunión', 'label_en' => 'In a meeting', 'default_duration_minutes' => 60, 'sort_order' => 8],
        ['key' => 'vacation', 'emoji' => '🏖️', 'label_es' => 'De vacaciones', 'label_en' => 'On vacation', 'default_duration_minutes' => null, 'sort_order' => 9],
        ['key' => 'sick', 'emoji' => '🤒', 'label_es' => 'Enfermo', 'label_en' => 'Sick', 'default_duration_minutes' => null, 'sort_order' => 10],
        ['key' => 'offline_soon', 'emoji' => '🌙', 'label_es' => 'Fuera de línea', 'label_en' => 'Signing off', 'default_duration_minutes' => null, 'sort_order' => 11],
    ];

    public function run(): void
    {
        foreach (self::PRESETS as $preset) {
            StatusPreset::query()->updateOrCreate(
                ['key' => $preset['key']],
                [...$preset, 'is_enabled' => true],
            );
        }
    }
}
