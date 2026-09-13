<?php

namespace App\Console\Commands;

use App\Actions\Teams\AssignUserToDomainTeam;
use App\Actions\Users\GenerateUniqueUsername;
use App\Enums\AuthProvider;
use App\Enums\ConversationParticipantRole;
use App\Enums\ConversationType;
use App\Models\Conversation;
use App\Models\Country;
use App\Models\Message;
use App\Models\Reaction;
use App\Models\Team;
use App\Models\User;
use Database\Factories\MessageFactory;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Sección 14 de PROMPT-MEJORAS-NESTWORK-v2.md: volumen real de datos para
 * poder probar scroll infinito, salto a fecha, búsqueda y paginación con
 * algo más que 10 mensajes de ejemplo. Complementa a `ConversationsSeeder`
 * (que sigue siendo el seeder "base" con las 3 cuentas reales del dev) en
 * vez de reemplazarlo — este comando es opt-in, no corre en
 * `migrate:fresh --seed` porque insertar miles de mensajes en cada reset
 * de BD sería demasiado lento para el día a día.
 *
 * Todos los usuarios generados comparten la misma contraseña conocida
 * (ver self::DEMO_PASSWORD) para poder loguearse de verdad una vez activo
 * el login por email+contraseña (Fase A).
 */
class SeedDemoData extends Command
{
    protected $signature = 'nestwork:seed-demo {--users=80 : Cantidad de usuarios falsos a crear} {--messages=5000 : Cantidad aproximada de mensajes a distribuir}';

    protected $description = 'Genera usuarios, equipos, conversaciones y mensajes de volumen real para probar la UI con datos de verdad (no 10 mensajes de ejemplo).';

    /** Contraseña conocida y documentada para todos los usuarios de demo. */
    public const DEMO_PASSWORD = 'Nestwork2026!';

    /**
     * Dominios institucionales falsos — uno grande a propósito (Acme
     * Studio) para garantizar al menos un team con 20+ miembros y poder
     * sembrar un channel de esa escala; el resto quedan más chicos.
     *
     * @var list<array{name: string, domain: string, share: float}>
     */
    private const COMPANY_DOMAINS = [
        ['name' => 'Acme Studio', 'domain' => 'acmestudio.test', 'share' => 0.35],
        ['name' => 'Vertex Labs', 'domain' => 'vertexlabs.test', 'share' => 0.10],
        ['name' => 'Bluepeak', 'domain' => 'bluepeak.test', 'share' => 0.08],
        ['name' => 'Northstar Digital', 'domain' => 'northstardigital.test', 'share' => 0.07],
        ['name' => 'Solventis', 'domain' => 'solventis.test', 'share' => 0.10],
    ];

    /** El resto de usuarios cae acá (comparte el team "Invitados"). */
    private const GUEST_EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com'];

    private const GROUP_NAMES = ['Equipo Producto', 'Proyecto Final', 'Marketing', 'Soporte', 'Diseño', 'Backend', 'Frontend'];

    private const CHANNEL_NAMES = ['General', 'Anuncios', 'Aleatorio'];

    public function handle(): int
    {
        $targetUsers = max(1, (int) $this->option('users'));
        $targetMessages = max(1, (int) $this->option('messages'));

        $this->info("Generando ~{$targetUsers} usuarios y ~{$targetMessages} mensajes…");

        $countryIds = Country::query()->pluck('id', 'iso2');
        $defaultCountryId = $countryIds['CO'] ?? $countryIds->first();

        $users = $this->createUsers($targetUsers, $defaultCountryId);
        $this->info("{$users->count()} usuarios creados/asignados a sus teams.");

        $teams = Team::query()->with('members')->get()->filter(fn (Team $team) => $team->members->count() >= 2);
        $conversations = collect();

        foreach ($teams as $team) {
            $conversations = $conversations->merge($this->seedConversationsForTeam($team));
        }

        $this->info("{$conversations->count()} conversaciones creadas (dm/group/channel).");

        $totalInserted = $this->seedMessages($conversations, $targetMessages);

        $this->info("{$totalInserted} mensajes insertados.");
        $this->info('Contraseña de todos los usuarios de demo: '.self::DEMO_PASSWORD);

        return self::SUCCESS;
    }

    /**
     * @return Collection<int, User>
     */
    private function createUsers(int $count, ?int $defaultCountryId): Collection
    {
        $assignToDomainTeam = new AssignUserToDomainTeam;
        $generateUsername = new GenerateUniqueUsername;
        $hashedPassword = Hash::make(self::DEMO_PASSWORD);

        $emails = $this->planEmails($count);
        $users = collect();

        foreach ($emails as $email) {
            $name = fake()->name();

            $user = User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'username' => $generateUsername->handle($name),
                    'password' => $hashedPassword,
                    'auth_provider' => AuthProvider::Password,
                    'country_id' => $defaultCountryId,
                    'email_verified_at' => now(),
                    'last_seen_at' => fake()->dateTimeBetween('-2 weeks', 'now'),
                ],
            );

            if ($user->wasRecentlyCreated) {
                $assignToDomainTeam->handle($user);
            }

            $users->push($user);
        }

        return $users;
    }

    /**
     * Reparte $count usuarios entre los dominios de empresa (según
     * `share`) y un pool de proveedores públicos (van todos al team
     * "Invitados" compartido).
     *
     * @return list<string>
     */
    private function planEmails(int $count): array
    {
        $emails = [];

        foreach (self::COMPANY_DOMAINS as $company) {
            $n = (int) round($count * $company['share']);

            for ($i = 0; $i < $n; $i++) {
                $emails[] = fake()->unique()->userName().'@'.$company['domain'];
            }
        }

        $remaining = max(0, $count - count($emails));

        for ($i = 0; $i < $remaining; $i++) {
            $domain = self::GUEST_EMAIL_DOMAINS[array_rand(self::GUEST_EMAIL_DOMAINS)];
            $emails[] = fake()->unique()->userName().'@'.$domain;
        }

        return $emails;
    }

    /**
     * @return Collection<int, Conversation>
     */
    private function seedConversationsForTeam(Team $team): Collection
    {
        $members = $team->members;
        $created = collect();

        // DMs: pares aleatorios, tope para no explotar en combinatoria
        // con teams grandes.
        $dmPairCount = min(20, intdiv($members->count(), 2) + 3);

        for ($i = 0; $i < $dmPairCount; $i++) {
            $pair = $members->random(2);
            $created->push($this->createConversation(
                team: $team,
                type: ConversationType::Dm,
                name: null,
                participants: $pair->values()->all(),
            ));
        }

        // Groups de 3-8 personas.
        if ($members->count() >= 3) {
            $groupCount = min(4, intdiv($members->count(), 6) + 1);

            for ($i = 0; $i < $groupCount; $i++) {
                $size = min($members->count(), random_int(3, 8));
                $participants = $members->random($size);

                $created->push($this->createConversation(
                    team: $team,
                    type: ConversationType::Group,
                    name: self::GROUP_NAMES[array_rand(self::GROUP_NAMES)],
                    participants: $participants->values()->all(),
                ));
            }
        }

        // Channel público, abierto a todo el team cuando alcanza escala
        // real (20+) — sección 3/17 del prompt v2.
        if ($members->count() >= 15) {
            $created->push($this->createConversation(
                team: $team,
                type: ConversationType::Channel,
                name: self::CHANNEL_NAMES[array_rand(self::CHANNEL_NAMES)],
                participants: $members->values()->all(),
                isPublic: true,
                description: "Canal general de {$team->name}",
            ));
        }

        return $created;
    }

    /**
     * @param  array<int, User>  $participants
     */
    private function createConversation(Team $team, ConversationType $type, ?string $name, array $participants, bool $isPublic = false, ?string $description = null): Conversation
    {
        $creator = $participants[0];

        $conversation = Conversation::query()->create([
            'team_id' => $team->id,
            'type' => $type,
            'name' => $name,
            'is_public' => $isPublic,
            'description' => $description,
            'created_by' => $creator->id,
        ]);

        $joinedAt = now()->subDays(random_int(30, 300));

        foreach ($participants as $index => $participant) {
            $conversation->participants()->attach($participant->id, [
                'joined_at' => $joinedAt,
                'role' => $type === ConversationType::Dm
                    ? null
                    : ($index === 0 ? ConversationParticipantRole::Admin : ConversationParticipantRole::Member),
                'archived_at' => null,
                'muted_at' => null,
            ]);
        }

        return $conversation;
    }

    /**
     * Crea mensajes distribuidos en los últimos 6-12 meses, con algunas
     * respuestas (reply_to) y reacciones sembradas al azar. Cada
     * conversación se inserta en una sola transacción (el mayor costo de
     * miles de inserts uno por uno es el autocommit por fila, no
     * Eloquent en sí).
     *
     * @param  Collection<int, Conversation>  $conversations
     */
    private function seedMessages(Collection $conversations, int $targetMessages): int
    {
        if ($conversations->isEmpty()) {
            return 0;
        }

        $avgPerConversation = max(5, intdiv($targetMessages, $conversations->count()));
        $totalInserted = 0;
        $reactionEmojis = ['👍', '❤️', '😂', '🎉', '😮', '🙌'];

        foreach ($conversations as $conversation) {
            $participantIds = $conversation->participants()->pluck('users.id')->all();

            if ($participantIds === []) {
                continue;
            }

            $messageCount = random_int(
                (int) round($avgPerConversation * 0.4),
                (int) round($avgPerConversation * 1.6),
            );

            $timestamp = Carbon::now()->subMonths(random_int(6, 12));
            /** @var list<Message> $created */
            $created = [];

            DB::transaction(function () use ($conversation, $participantIds, $messageCount, &$timestamp, &$created, $reactionEmojis) {
                for ($i = 0; $i < $messageCount; $i++) {
                    $timestamp = $timestamp->clone()->addMinutes(random_int(20, 6 * 60));

                    if ($timestamp->isAfter(now())) {
                        break;
                    }

                    // ~8% de los mensajes (a partir del segundo) responden a
                    // uno anterior de la misma conversación.
                    $replyTo = ($created !== [] && random_int(1, 100) <= 8)
                        ? $created[array_rand($created)]
                        : null;

                    $message = Message::query()->create([
                        'conversation_id' => $conversation->id,
                        'user_id' => $participantIds[array_rand($participantIds)],
                        'body' => fake()->randomElement(MessageFactory::LINES),
                        'reply_to_message_id' => $replyTo?->id,
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ]);

                    $created[] = $message;

                    // Reacciones: ~15% de los mensajes reciben 1-3.
                    if (count($participantIds) > 1 && random_int(1, 100) <= 15) {
                        $reactorCount = min(count($participantIds), random_int(1, 3));
                        $reactors = Arr::random($participantIds, $reactorCount);

                        foreach ($reactors as $reactorId) {
                            Reaction::query()->firstOrCreate([
                                'message_id' => $message->id,
                                'user_id' => $reactorId,
                                'emoji' => $reactionEmojis[array_rand($reactionEmojis)],
                            ], ['created_at' => $timestamp]);
                        }
                    }
                }
            });

            $totalInserted += count($created);

            // El primer participante queda al día; el resto con
            // pendientes, para probar los badges de no leídos.
            if ($created !== []) {
                $conversation->participants()->updateExistingPivot($participantIds[0], [
                    'last_read_message_id' => end($created)->id,
                ]);
            }
        }

        return $totalInserted;
    }
}
