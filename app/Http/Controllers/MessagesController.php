<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\ListConversationsForUser;
use App\Data\AttachmentData;
use App\Data\MessageData;
use App\Enums\AttachmentType;
use App\Enums\ConversationType;
use App\Enums\MessageType;
use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
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
        ]);
    }

    /**
     * @return Collection<int, MessageData>
     */
    private function loadMessages(Conversation $conversation, User $user)
    {
        // "Leído" real: sólo si TODOS los demás participantes ya marcaron
        // last_read_message_id — para un DM es uno solo, para un grupo
        // exige que el más rezagado también lo haya visto.
        $otherLastReadIds = $conversation->participants()
            ->where('users.id', '!=', $user->id)
            ->get()
            ->pluck('pivot.last_read_message_id');

        $readThreshold = $otherLastReadIds->isNotEmpty() && $otherLastReadIds->every(fn (?int $id) => $id !== null)
            ? $otherLastReadIds->min()
            : null;

        // Tope de seguridad mientras no existe paginación por cursor
        // (sección 4.1/Fase F del prompt v2): sin esto, una conversación
        // de miles de mensajes (el seeder de demo ya deja algunas así)
        // cargaba la tabla ENTERA en cada visita — lento en el backend
        // y pesado de renderizar en el frontend. `INITIAL_MESSAGE_LIMIT`
        // trae sólo los más recientes; "cargar más hacia arriba" queda
        // pendiente de esa fase.
        $messages = $conversation->messages()
            ->with(['user', 'replyTo.user', 'attachments'])
            ->orderByDesc('id')
            ->limit(self::INITIAL_MESSAGE_LIMIT)
            ->get()
            ->sortBy('id')
            ->values()
            ->map(fn (Message $message) => new MessageData(
                id: $message->id,
                body: $message->body,
                createdAt: $message->created_at->toIso8601String(),
                editedAt: $message->edited_at?->toIso8601String(),
                userId: $message->user_id,
                userName: $message->user->name,
                userAvatar: $message->user->avatar,
                isMine: $message->user_id === $user->id,
                replyToId: $message->replyTo?->id,
                replyToUserName: $message->replyTo?->user->name,
                replyToBody: $message->replyTo?->body,
                status: $message->user_id === $user->id
                    ? ($readThreshold !== null && $readThreshold >= $message->id ? 'read' : 'sent')
                    : 'sent',
                attachments: AttachmentData::collectionFor($message),
            ));

        return $messages;
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
            'isArchived' => $pivot->isArchived(),
            'isMuted' => $pivot->isMuted(),
            // Valor DE ANTES de esta visita (loadMessages ya no lo pisa)
            // — el frontend lo usa como marca de agua para saber qué
            // mensajes eran no leídos al abrir el chat y dibujar el
            // divisor/resaltado hasta que el usuario los lea de verdad.
            'viewerLastReadMessageId' => $pivot->last_read_message_id,
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

        Attachment::create([
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
