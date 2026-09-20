<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\ListConversationsForUser;
use App\Data\MessageData;
use App\Data\ReactionData;
use App\Enums\AttachmentType;
use App\Enums\ConversationType;
use App\Enums\MessageType;
use App\Events\ConversationPinChanged;
use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Events\MessageUpdated;
use App\Jobs\GenerateAttachmentPreviewJob;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\MessageDeletion;
use App\Models\Reaction;
use App\Models\SavedMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MessagesController extends Controller
{
    private const INITIAL_MESSAGE_LIMIT = 150;

    public function __construct(private readonly ListConversationsForUser $listConversations)
    {
        //
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team, 404);

        return Inertia::render('messages/index', [
            'conversations' => $this->listConversations->handle($user, $team),
            'conversation' => null,
            'messages' => [],
        ]);
    }

    public function show(Request $request, string $current_team, Conversation $conversation): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($user->belongsToTeam($team) && $conversation->participants()->where('users.id', $user->id)->exists(), 403);

        return Inertia::render('messages/index', [
            // Closures: Inertia sólo las evalúa cuando el prop fue
            // realmente pedido (visita completa o partial reload que lo
            // incluya en `only`). El refresco de fondo del sidebar
            // (badge de no-leídos, `.MessageSent` en
            // app-sidebar-layout.tsx) pide sólo `only:
            // ['conversations','archivedConversations']`, así que nunca
            // dispara la carga de `messages`.
            //
            // 'messages' YA NO marca nada como leído (ver
            // loadMessages()): abrir el chat sólo carga y muestra — el
            // marcado real de "leído" vive exclusivamente en markRead(),
            // gatillado por interacción real del lado del cliente
            // (scroll al fondo, mousemove/click/tecla estando ahí, o
            // enviar una respuesta). Antes, cargar `messages` pisaba
            // `last_read_message_id` al instante con sólo abrir el
            // chat, así que la notificación de no-leído se cerraba sola
            // sin que el usuario realmente hubiera leído nada.
            'messages' => fn () => $this->loadMessages($conversation, $user),
            'conversation' => fn () => $this->buildConversationPayload($conversation, $user),
            'conversations' => fn () => $this->listConversations->handle($user, $team, $conversation->id),
            // Si la conversación abierta está archivada, no aparece en
            // la lista de arriba (se filtra) — necesita su propio
            // "isCurrent" acá para que la gotera también aplique en la
            // pestaña Archivado.
            'archivedConversations' => fn () => $this->listConversations->handle($user, $team, $conversation->id, archivedOnly: true),
            // Desde "Guardados" (u otro enlace externo al chat): salta al
            // mensaje puntual al abrir. Sólo funciona si ese mensaje cayó
            // dentro de la ventana inicial cargada (INITIAL_MESSAGE_LIMIT)
            // — misma limitación que ya tiene el badge de fijado hasta que
            // exista paginación por cursor (Fase F).
            'jumpToMessageId' => $request->integer('message') ?: null,
        ]);
    }

    /**
     * @return Collection<int, MessageData>
     */
    private function loadMessages(Conversation $conversation, User $user)
    {
        $readThreshold = $this->readThresholdFor($conversation, $user);
        $clearedAt = $conversation->participants()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot
            ->cleared_at;

        // Tope de seguridad mientras no existe paginación por cursor
        // (sección 4.1/Fase F del prompt v2): sin esto, una conversación
        // de miles de mensajes (el seeder de demo ya deja algunas así)
        // cargaba la tabla ENTERA en cada visita — lento en el backend
        // y pesado de renderizar en el frontend. `INITIAL_MESSAGE_LIMIT`
        // trae sólo los más recientes; "cargar más hacia arriba" queda
        // pendiente de esa fase.
        return $conversation->messages()
            ->with(['user', 'replyTo.user', 'attachments', 'reactions.user', 'forwardedFromMessage.user', 'savedBy'])
            // "Limpiar chat": sólo oculta el historial anterior a la
            // marca PARA ESTE usuario — no borra nada, los demás
            // participantes siguen viendo todo igual.
            ->when($clearedAt, fn ($query) => $query->where('created_at', '>', $clearedAt))
            // "Eliminar para mí" (individual o en bloque desde "Limpiar
            // chat > Solo hoy"): el mensaje desaparece SOLO de mi vista,
            // el resto de participantes lo sigue viendo intacto.
            ->whereNotIn('id', MessageDeletion::query()->where('user_id', $user->id)->select('message_id'))
            ->orderByDesc('id')
            ->limit(self::INITIAL_MESSAGE_LIMIT)
            ->get()
            ->sortBy('id')
            ->values()
            ->map(fn (Message $message) => MessageData::fromMessage($message, $user->id, $readThreshold));
    }

    /**
     * "Leído" real: sólo si TODOS los demás participantes ya marcaron
     * last_read_message_id — para un DM es uno solo, para un grupo
     * exige que el más rezagado también lo haya visto. Null significa
     * "nadie más ha leído nada todavía" (ningún mensaje propio cuenta
     * como leído).
     *
     * Quien apagó "Confirmación de lectura" (Ajustes > Privacidad,
     * `read_receipts_enabled`) no expone su avance a los demás — se
     * excluye de este cálculo por completo, así que ningún emisor ve
     * "leído" a partir de su lectura (mismo trato de ida y vuelta que
     * Teams: si lo apagas, tampoco ves el de los demás — eso ya lo
     * respeta MessageData al no exponer status de terceros).
     */
    private function readThresholdFor(Conversation $conversation, User $user): ?int
    {
        $otherParticipants = $conversation->participants()
            ->where('users.id', '!=', $user->id)
            ->get()
            ->filter(fn (User $participant) => $participant->read_receipts_enabled);

        $otherLastReadIds = $otherParticipants->pluck('pivot.last_read_message_id');

        return $otherLastReadIds->isNotEmpty() && $otherLastReadIds->every(fn (?int $id) => $id !== null)
            ? $otherLastReadIds->min()
            : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildConversationPayload(Conversation $conversation, User $user): array
    {
        $pivot = $conversation->participants()
            ->where('users.id', $user->id)
            ->first()
            ?->pivot;

        abort_unless($pivot instanceof ConversationParticipant, 500);

        $otherParticipant = $conversation->participants()
            ->where('users.id', '!=', $user->id)
            ->first();

        return [
            'id' => $conversation->id,
            'name' => $conversation->displayNameFor($user),
            'type' => $conversation->type->value,
            'avatar' => $otherParticipant instanceof User ? $otherParticipant->avatar : null,
            'otherUserId' => $conversation->type === ConversationType::Dm && $otherParticipant instanceof User
                ? $otherParticipant->id
                : null,
            'presence' => $conversation->type === ConversationType::Dm && $otherParticipant instanceof User
                ? $otherParticipant->presenceStatus()
                : null,
            'statusEmoji' => $conversation->type === ConversationType::Dm && $otherParticipant instanceof User
                ? $otherParticipant->status_emoji
                : null,
            'statusText' => $conversation->type === ConversationType::Dm && $otherParticipant instanceof User
                ? $otherParticipant->status_text
                : null,
            'isArchived' => $pivot->isArchived(),
            'isMuted' => $pivot->isMuted(),
            // Valor DE ANTES de esta visita (loadMessages ya no lo pisa)
            // — el frontend lo usa como marca de agua para saber qué
            // mensajes eran no leídos al abrir el chat y dibujar el
            // divisor/resaltado hasta que el usuario los lea de verdad.
            'viewerLastReadMessageId' => $pivot->last_read_message_id,
            'pinnedMessageId' => $conversation->pinned_message_id,
        ];
    }

    public function store(Request $request, string $current_team, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);

        $validated = $request->validate([
            // Un mensaje puede ser sólo texto, sólo adjunto, o ambos
            // (adjunto + caption) — nunca los dos vacíos a la vez.
            'body' => ['required_without:attachment', 'nullable', 'string', 'max:4000'],
            'attachment' => ['required_without:body', 'nullable', 'file', 'max:25600', // 25 MB
                Rule::file()->types([
                    'jpg', 'jpeg', 'png', 'gif', 'webp',
                    'mp4', 'webm', 'mov',
                    'mp3', 'wav', 'ogg', 'webm',
                    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'txt',
                ]),
            ],
            // Qué botón usó el cliente (foto/video/documento) — se
            // valida contra el tipo REAL detectado del archivo más
            // abajo (finfo por contenido, no la extensión que manda el
            // cliente) para que no se pueda colar un .exe disfrazado de
            // .jpg por el botón de fotos.
            'attachment_category' => ['nullable', 'string', 'in:image,video,document,audio'],
            'reply_to_message_id' => [
                'nullable',
                'integer',
                Rule::exists('messages', 'id')->where('conversation_id', $conversation->id),
            ],
        ]);

        /** @var UploadedFile|null $file */
        $file = $validated['attachment'] ?? null;
        $attachmentCategory = $validated['attachment_category'] ?? null;

        if ($file && $attachmentCategory) {
            $this->assertAttachmentMatchesCategory($file, $attachmentCategory);
        }

        $message = $conversation->messages()->create([
            'user_id' => $user->id,
            'body' => $validated['body'] ?? '',
            'type' => $file ? $this->messageTypeFor($this->attachmentTypeFor($file)) : MessageType::Text,
            'reply_to_message_id' => $validated['reply_to_message_id'] ?? null,
        ]);

        if ($file) {
            $this->storeAttachment($message, $file);
        }

        $conversation->participants()->updateExistingPivot($user->id, [
            'last_read_message_id' => $message->id,
        ]);

        // El mensaje YA quedó guardado arriba — un tropiezo de Reverb acá
        // (por ejemplo, el servidor reiniciándose y perdiendo el
        // registro de la app por un instante: "No matching application
        // for ID") no puede tumbar la petición entera. Sin este
        // try/catch, esa excepción rompía el redirect completo y el
        // mensaje se quedaba pegado en "enviando" del lado del cliente
        // (la UI optimista nunca recibía la respuesta que la reemplaza
        // por el mensaje real) a pesar de estar bien guardado en la BD.
        try {
            broadcast(new MessageSent($message))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        // No usar back(): la sesión registra como "URL anterior" la última
        // petición GET real, que es messages.show — pero el navegador se
        // quedó en /messages (preserveUrl, sección "nada de IDs en la
        // URL"). Redirigir explícito a messages.show devuelve las props
        // correctas (conversation/messages) sin depender de ese estado.
        return redirect()->route('messages.show', [$current_team, $conversation]);
    }

    private function attachmentTypeFor(UploadedFile $file): AttachmentType
    {
        $mime = $file->getMimeType() ?? '';

        return match (true) {
            str_starts_with($mime, 'image/') => AttachmentType::Image,
            str_starts_with($mime, 'video/') => AttachmentType::Video,
            str_starts_with($mime, 'audio/') => AttachmentType::Audio,
            default => AttachmentType::Document,
        };
    }

    /**
     * Defensa en profundidad: el frontend ya filtra por botón (foto/
     * video/documento) y por `accept`, pero eso es sólo una sugerencia
     * del navegador — un cliente hecho a mano podría mandar cualquier
     * archivo por cualquier campo. Acá se re-verifica contra el MIME
     * REAL detectado por contenido (`getMimeType()`, vía fileinfo/
     * Symfony — no la extensión ni el Content-Type que declaró el
     * cliente), así un ejecutable renombrado a ".jpg" no pasa por el
     * botón de fotos. No reemplaza un antivirus real (ClamAV, etc.) —
     * eso es una pieza de infraestructura aparte, no algo que se pueda
     * resolver sólo con validación de tipo.
     */
    private function assertAttachmentMatchesCategory(UploadedFile $file, string $category): void
    {
        $actual = $this->attachmentTypeFor($file);
        $matches = match ($category) {
            'image' => $actual === AttachmentType::Image,
            'video' => $actual === AttachmentType::Video,
            'audio' => $actual === AttachmentType::Audio,
            'document' => ! in_array($actual, [AttachmentType::Image, AttachmentType::Video, AttachmentType::Audio], true),
            default => true,
        };

        // Mismo tono de ayuda que la validación del lado del cliente —
        // decir qué formatos sí sirven, sin regañar. Español neutro
        // (sin voseo: "prueba", no "probá").
        $hints = [
            'image' => 'Ese formato de imagen no es compatible. Puedes usar JPG, PNG, GIF o WEBP.',
            'video' => 'Ese formato de video no es compatible. Puedes usar MP4, MOV o WEBM.',
            'audio' => 'Ese formato de audio no es compatible. Puedes usar MP3, WAV, OGG o WEBM.',
            'document' => 'Ese formato de documento no es compatible. Puedes usar PDF, Word, Excel, ZIP o TXT.',
        ];

        abort_unless($matches, 422, $hints[$category] ?? 'Ese archivo no es válido.');
    }

    /** `AttachmentType` (metadata del archivo) y `MessageType` (cómo
     *  renderiza la burbuja) son enums separados a propósito — un
     *  mensaje puede ser 'code'/'system'/'call_log' sin attachment
     *  alguno — pero difieren en un solo valor (Document vs File), así
     *  que no son intercambiables 1:1. */
    private function messageTypeFor(AttachmentType $type): MessageType
    {
        return match ($type) {
            AttachmentType::Image => MessageType::Image,
            AttachmentType::Video => MessageType::Video,
            AttachmentType::Audio => MessageType::Audio,
            AttachmentType::Document => MessageType::File,
        };
    }

    /**
     * Disco 'public' en dev (symlink `storage:link` ya corrido) — en
     * producción, cambiar `FILESYSTEM_DISK`/este disco a un driver
     * S3-compatible (MinIO), sin tocar este método: sólo guarda
     * metadata + disco/ruta, nunca el archivo en la BD (ver ADR en
     * docs/DECISIONS.md).
     */
    private function storeAttachment(Message $message, UploadedFile $file): void
    {
        $type = $this->attachmentTypeFor($file);
        $disk = 'public';
        $path = $file->store("attachments/{$message->conversation_id}", $disk);

        abort_if($path === false, 500);

        [$width, $height] = $type === AttachmentType::Image
            ? (@getimagesize($file->getRealPath()) ?: [null, null])
            : [null, null];

        $attachment = Attachment::create([
            'message_id' => $message->id,
            'type' => $type,
            'disk' => $disk,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'size_bytes' => $file->getSize() ?: 0,
            'width' => $width,
            'height' => $height,
        ]);

        // En cola, no síncrono (ver GenerateAttachmentPreviewJob para el
        // porqué: correrlo dentro del request causaba 503 reales por
        // timeout del proxy). La propia Action decide si el tipo de
        // archivo aplica (pdf/doc/docx/xls/xlsx/txt) antes de convertir.
        GenerateAttachmentPreviewJob::dispatch($attachment);
    }

    /**
     * Reaccionar es un toggle, no un "agregar": tocar el mismo emoji
     * que ya pusiste lo quita — igual que WhatsApp/Slack. La fila
     * `unique(message_id, user_id, emoji)` en la migración es la que
     * de verdad impide duplicados; acá sólo se decide crear o borrar.
     */
    public function toggleReaction(Request $request, string $current_team, Conversation $conversation, Message $message): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);

        $validated = $request->validate([
            'emoji' => ['required', 'string', 'max:8'],
        ]);

        $existing = Reaction::query()
            ->where('message_id', $message->id)
            ->where('user_id', $user->id)
            ->where('emoji', $validated['emoji'])
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            // Un solo emoji por persona y mensaje — pedido explícito:
            // elegir otra reacción CAMBIA la propia, no la suma. Sin
            // esto, el `where emoji` de arriba sólo evita duplicar el
            // MISMO emoji, pero dejaba acumular varios distintos del
            // mismo usuario en el mismo mensaje.
            Reaction::query()
                ->where('message_id', $message->id)
                ->where('user_id', $user->id)
                ->delete();

            Reaction::create([
                'message_id' => $message->id,
                'user_id' => $user->id,
                'emoji' => $validated['emoji'],
                'created_at' => now(),
            ]);
        }

        $message->load('reactions.user');

        // Sin ->toOthers() acá: el propio autor de la reacción ya
        // recibe la lista actualizada en la respuesta JSON de abajo,
        // no necesita el eco de su propia acción por el socket (mismo
        // criterio que store() con MessageSent).
        try {
            broadcast(new MessageUpdated($message))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['reactions' => ReactionData::listFor($message)]);
    }

    /**
     * Editar tiene ventana de tiempo (MessageData::EDIT_WINDOW_MINUTES)
     * Y un tope de veces (MessageData::MAX_EDITS) dentro de ese margen
     * — pasado cualquiera de los dos, ni con una llamada directa a este
     * endpoint se puede editar; la opción "Editar" ya desaparece antes
     * en el frontend, esto es la validación real del lado del servidor.
     */
    public function update(Request $request, string $current_team, Conversation $conversation, Message $message): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);
        abort_unless($message->user_id === $user->id, 403);
        abort_if(now()->greaterThan(MessageData::editWindowEndsAt($message)), 422, 'Ya pasó el tiempo permitido para editar este mensaje.');
        abort_if($message->edit_count >= MessageData::MAX_EDITS, 422, 'Ya editaste este mensaje el máximo de veces permitido.');

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
        ]);

        $message->update([
            'body' => $validated['body'],
            'edited_at' => now(),
            'edit_count' => $message->edit_count + 1,
        ]);

        $message->load(['user', 'replyTo.user', 'attachments', 'reactions.user', 'forwardedFromMessage.user', 'savedBy']);

        try {
            broadcast(new MessageUpdated($message))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'message' => MessageData::fromMessage($message, $user->id, $this->readThresholdFor($conversation, $user)),
        ]);
    }

    /**
     * "Eliminar para mí": el mensaje deja de existir SOLO en mi propia
     * lista (reutiliza `message_deletions`, ya migrada para esto) — el
     * resto de participantes lo sigue viendo intacto. Cualquier
     * participante puede hacerlo con cualquier mensaje (no sólo con los
     * propios), a diferencia de "eliminar para todos".
     */
    public function hideForMe(Request $request, string $current_team, Conversation $conversation, Message $message): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);

        MessageDeletion::query()->firstOrCreate(
            ['message_id' => $message->id, 'user_id' => $user->id],
            ['deleted_at' => now()],
        );

        return response()->json(['hidden' => true]);
    }

    /**
     * "Eliminar para todos": el cuerpo se mueve cifrado a
     * `original_body` (cast `encrypted`, ver Message::casts) y `body`
     * queda vacío — el registro NUNCA se borra ni queda en texto plano.
     * Todos los participantes ven "Mensaje eliminado"
     * (MessageData::isDeleted). Sólo el autor puede hacerlo.
     */
    public function destroy(Request $request, string $current_team, Conversation $conversation, Message $message): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);
        abort_unless($message->user_id === $user->id, 403);

        $message->update([
            'original_body' => $message->body,
            'body' => '',
            'is_hidden' => true,
        ]);

        try {
            broadcast(new MessageUpdated($message))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['deleted' => true]);
    }

    /**
     * Restaurar sólo lo puede hacer quien eliminó — no hace falta pedir
     * el `original_body` de vuelta al cliente para mostrarlo antes: es
     * una acción a ciegas, el backend ya sabe qué había ahí.
     */
    public function restore(Request $request, string $current_team, Conversation $conversation, Message $message): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);
        abort_unless($message->user_id === $user->id, 403);
        abort_unless($message->is_hidden, 422, 'Este mensaje no está eliminado.');

        $message->update([
            'body' => $message->original_body ?? '',
            'original_body' => null,
            'is_hidden' => false,
        ]);

        $message->load(['user', 'replyTo.user', 'attachments', 'reactions.user', 'forwardedFromMessage.user', 'savedBy']);

        try {
            broadcast(new MessageUpdated($message))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'message' => MessageData::fromMessage($message, $user->id, $this->readThresholdFor($conversation, $user)),
        ]);
    }

    /**
     * Guardar es privado del viewer — no se transmite por Reverb (los
     * demás participantes no necesitan saberlo), sólo se refleja en la
     * respuesta JSON de quien lo tocó.
     */
    public function toggleSave(Request $request, string $current_team, Conversation $conversation, Message $message): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);

        $existing = SavedMessage::query()
            ->where('user_id', $user->id)
            ->where('message_id', $message->id)
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            SavedMessage::create([
                'user_id' => $user->id,
                'message_id' => $message->id,
                'created_at' => now(),
            ]);
        }

        return response()->json(['saved' => ! $existing]);
    }

    /**
     * Un solo mensaje fijado por conversación (alcance de esta ronda,
     * ver la migración) — fijar uno nuevo reemplaza al anterior.
     * Cualquier participante puede fijar/desfijar, mismo criterio que
     * archivar/silenciar (no hay roles todavía fuera de DMs).
     */
    public function togglePin(Request $request, string $current_team, Conversation $conversation, Message $message): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);

        $nowPinned = $conversation->pinned_message_id === $message->id;

        $conversation->update([
            'pinned_message_id' => $nowPinned ? null : $message->id,
        ]);

        try {
            broadcast(new ConversationPinChanged($conversation))->toOthers();
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['pinnedMessageId' => $conversation->pinned_message_id]);
    }

    /**
     * Reenviar copia cuerpo + adjuntos (mismo disco/ruta física, sin
     * volver a subir el archivo) a una o varias conversaciones donde el
     * usuario participa — la regla `exists` de `conversation_ids.*` ya
     * impide reenviar a una conversación ajena, no sólo el frontend.
     */
    public function forward(Request $request, string $current_team, Conversation $conversation, Message $message): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);
        abort_unless($message->conversation_id === $conversation->id, 404);

        $validated = $request->validate([
            'conversation_ids' => ['required', 'array', 'min:1', 'max:20'],
            'conversation_ids.*' => [
                'integer',
                Rule::exists('conversation_participants', 'conversation_id')->where('user_id', $user->id),
            ],
        ]);

        $targets = Conversation::query()
            ->whereIn('id', $validated['conversation_ids'])
            ->where('team_id', $team->id)
            ->get();

        $message->load('attachments');

        foreach ($targets as $target) {
            $forwarded = $target->messages()->create([
                'user_id' => $user->id,
                'body' => $message->body,
                'type' => $message->type,
                'forwarded_from_message_id' => $message->id,
                'forwarded_from_conversation_id' => $message->conversation_id,
            ]);

            foreach ($message->attachments as $attachment) {
                Attachment::create([
                    'message_id' => $forwarded->id,
                    'type' => $attachment->type,
                    'disk' => $attachment->disk,
                    'path' => $attachment->path,
                    'original_name' => $attachment->original_name,
                    'mime_type' => $attachment->mime_type,
                    'size_bytes' => $attachment->size_bytes,
                    'width' => $attachment->width,
                    'height' => $attachment->height,
                ]);
            }

            $target->participants()->updateExistingPivot($user->id, [
                'last_read_message_id' => $forwarded->id,
            ]);

            try {
                broadcast(new MessageSent($forwarded))->toOthers();
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json(['forwarded' => $targets->count()]);
    }

    /**
     * Ping silencioso al llegar al fondo del chat en vivo: NO es una
     * visita Inertia (nada de props/render) — sólo actualiza
     * last_read_message_id y dispara MessageRead para que los demás
     * participantes vean sus checks de "leído" en tiempo real.
     */
    public function markRead(Request $request, string $current_team, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;

        abort_if(! $team || $conversation->team_id !== $team->id, 404);
        abort_unless($conversation->participants()->where('users.id', $user->id)->exists(), 403);

        $lastMessageId = $conversation->messages()->max('id');

        $conversation->participants()->updateExistingPivot($user->id, [
            'last_read_message_id' => $lastMessageId,
        ]);

        // Mismo criterio que en store(): last_read_message_id ya quedó
        // guardado arriba, un tropiezo de Reverb acá no puede tumbar
        // este ping silencioso.
        try {
            broadcast(new MessageRead($conversation, $user->id, $lastMessageId));
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['lastReadMessageId' => $lastMessageId]);
    }
}
