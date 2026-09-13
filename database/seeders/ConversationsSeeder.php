<?php

namespace Database\Seeders;

use App\Actions\Teams\AssignUserToDomainTeam;
use App\Actions\Users\GenerateUniqueUsername;
use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\Country;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Usuarios, equipos, conversaciones y mensajes reales para probar el
 * chat con datos de verdad — sin lorem ipsum, sin placeholders. Corre
 * la misma lógica que usa el login real (AssignUserToDomainTeam,
 * GenerateUniqueUsername), así que también sirve para validar que esa
 * lógica funciona con volumen. Solo en local.
 */
class ConversationsSeeder extends Seeder
{
    /**
     * name (+ domain, o email explícito para las 3 cuentas reales del
     * dev — mismo nombre, no puede autogenerarse o dos colisionan en
     * el mismo email). Mezcla dominios públicos (van a "Invitados") e
     * institucionales (cada uno con su propio equipo). `country` es
     * opcional (iso2) — por defecto Colombia; se usa para probar el
     * flujo con al menos un usuario angloparlante (locale derivado en
     * inglés).
     *
     * @var list<array{name: string, domain: string|null, email: string|null, country?: string}>
     */
    private const SEED_USERS = [
        // Cuentas reales del dev — las únicas 3 con acceso real para
        // loguearse de verdad vía Google. Nombres distintos a propósito
        // (aunque las 3 son la misma persona): con las 3 llamadas
        // "Rafael Arenas" era imposible distinguir en un chat quién es
        // quién sólo mirando el nombre — confundía las pruebas.
        ['name' => 'Jose Restrepo', 'domain' => null, 'email' => 'rafarenas.dev@gmail.com'],
        ['name' => 'Rafael Arenas', 'domain' => null, 'email' => 'rjar326@gmail.com'],
        ['name' => 'Rafa Arenas R', 'domain' => null, 'email' => 'rarenas5@estudiantes.areandina.edu.co'],

        // "Invitados" — mayoría gmail (dominio más común a probar), con
        // un par de outlook/hotmail/yahoo para confirmar que también
        // caen en el mismo equipo compartido.
        ['name' => 'Camila Torres', 'domain' => 'gmail.com', 'email' => null],
        ['name' => 'Andrés Felipe Ríos', 'domain' => 'gmail.com', 'email' => null],
        ['name' => 'Valentina Suárez', 'domain' => 'gmail.com', 'email' => null],
        ['name' => 'Julián Castaño', 'domain' => 'gmail.com', 'email' => null],
        ['name' => 'Marcela Duque', 'domain' => 'gmail.com', 'email' => null],
        ['name' => 'Santiago Gómez', 'domain' => 'outlook.com', 'email' => null],
        ['name' => 'Laura Jiménez', 'domain' => 'hotmail.com', 'email' => null],
        ['name' => 'Diego Hernández', 'domain' => 'yahoo.com', 'email' => null],
        ['name' => 'Chris Johnson', 'domain' => 'gmail.com', 'email' => null, 'country' => 'US'],

        // "Areandina" — solo para poder armar un grupo de prueba; nombres
        // genéricos a propósito (no de personas reales) aunque el
        // dominio institucional sea real, para que quede claro que son
        // cuentas de prueba y no alguien de la universidad.
        ['name' => 'Miembro Areandina 1', 'domain' => 'estudiantes.areandina.edu.co', 'email' => null],
        ['name' => 'Miembro Areandina 2', 'domain' => 'estudiantes.areandina.edu.co', 'email' => null],
        ['name' => 'Miembro Areandina 3', 'domain' => 'areandina.edu.co', 'email' => null],
    ];

    private const GROUP_NAMES = [
        'Equipo Producto',
        'Proyecto Final',
        'General',
    ];

    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        $assignToDomainTeam = new AssignUserToDomainTeam;
        $generateUsername = new GenerateUniqueUsername;
        $countryIds = Country::query()
            ->whereIn('iso2', ['CO', 'US'])
            ->pluck('id', 'iso2');

        foreach (self::SEED_USERS as $seedUser) {
            $email = $seedUser['email'] ?? $this->emailFor($seedUser['name'], $seedUser['domain']);

            $user = User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => $seedUser['name'],
                    'username' => $generateUsername->handle($seedUser['name']),
                    'country_id' => $countryIds[$seedUser['country'] ?? 'CO'],
                    'email_verified_at' => now(),
                    'last_seen_at' => fake()->dateTimeBetween('-3 days', 'now'),
                ],
            );

            if ($user->wasRecentlyCreated) {
                $assignToDomainTeam->handle($user);
            }
        }

        Team::query()->with('members')->get()->each(
            fn (Team $team) => $this->seedConversationsForTeam($team)
        );
    }

    private function seedConversationsForTeam(Team $team): void
    {
        $members = $team->members;

        if ($members->count() < 2) {
            return;
        }

        // Una DM entre cada par consecutivo de miembros — suficiente
        // para probar listas de conversaciones sin explotar en
        // combinatoria con equipos grandes.
        for ($i = 0; $i < $members->count() - 1; $i++) {
            $this->seedConversation(
                team: $team,
                type: ConversationType::Dm,
                name: null,
                participants: [$members[$i], $members[$i + 1]],
            );
        }

        if ($members->count() >= 3) {
            $groupName = self::GROUP_NAMES[array_rand(self::GROUP_NAMES)];

            $this->seedConversation(
                team: $team,
                type: ConversationType::Group,
                name: $groupName,
                participants: $members->all(),
            );
        }
    }

    /**
     * @param  array<int, User>  $participants
     */
    private function seedConversation(Team $team, ConversationType $type, ?string $name, array $participants): void
    {
        $creator = $participants[0];

        $conversation = Conversation::query()->create([
            'team_id' => $team->id,
            'type' => $type,
            'name' => $name,
            'created_by' => $creator->id,
        ]);

        $joinedAt = now()->subDays(random_int(3, 30));

        foreach ($participants as $index => $participant) {
            $conversation->participants()->attach($participant->id, [
                'joined_at' => $joinedAt,
                // El primer participante tiene todo leído; el resto
                // deja mensajes sin leer para probar el contador.
                'archived_at' => null,
                'muted_at' => $index === 2 ? now()->subDays(1) : null,
            ]);
        }

        $messageCount = random_int(12, 30);
        $timestamp = Carbon::now()->subDays(random_int(1, 10))->subHours(random_int(0, 12));
        $lastMessage = null;

        for ($i = 0; $i < $messageCount; $i++) {
            $sender = $participants[$i % count($participants)];
            $timestamp = $timestamp->clone()->addMinutes(random_int(2, 240));

            $lastMessage = Message::factory()->create([
                'conversation_id' => $conversation->id,
                'user_id' => $sender->id,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);
        }

        // El primer participante queda al día; los demás con mensajes
        // pendientes (para los badges de no leídos). $messageCount
        // siempre es ≥12, así que el loop de arriba siempre corrió al
        // menos una vez y $lastMessage nunca queda null acá.
        $conversation->participants()->updateExistingPivot($participants[0]->id, [
            'last_read_message_id' => $lastMessage->id,
        ]);
    }

    private function emailFor(string $name, ?string $domain): string
    {
        $slug = str(str($name)->ascii())
            ->lower()
            ->replace(' ', '.')
            ->replaceMatches('/[^a-z0-9.]/', '');

        return "{$slug}@{$domain}";
    }
}
