<?php

namespace App\Jobs;

use App\Actions\Attachments\GenerateAttachmentPreview;
use App\Events\MessageUpdated;
use App\Models\Attachment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Antes, `GenerateAttachmentPreview::handle()` corría SÍNCRONO dentro
 * del POST que sube el adjunto (pedido explícito original: "la preview
 * la quiero desde la miniatura que se carga, no al rato"). Eso causaba
 * un bug real y crítico: LibreOffice en frío + Poppler pueden tardar
 * varios segundos, más de lo que el proxy de Herd/producción tolera —
 * el navegador recibía un 503 mientras PHP-FPM seguía procesando en
 * segundo plano, Inertia nunca recibía el redirect que reconcilia el
 * mensaje optimista, y la preview local (`blob:`) se quedaba pegada
 * para siempre (ver docs/PENDING-WORK.md, diagnóstico previo).
 *
 * Ahora corre en cola (`QUEUE_CONNECTION=database`, ya usada en
 * `composer run dev` vía `queue:listen`) — el POST responde de
 * inmediato con el adjunto ya guardado, y cuando la preview termina de
 * generarse este job dispara el MISMO `MessageUpdated` que ya usan
 * reacciones/ediciones/fijado para llegar en vivo — la burbuja pasa de
 * "generando…" a la miniatura real sin que el usuario recargue. La
 * demora percibida (1-3s típico) es indistinguible de "inmediato" para
 * quien mira la pantalla, y no vuelve a poder tumbar el envío del
 * mensaje.
 */
class GenerateAttachmentPreviewJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public Attachment $attachment)
    {
        //
    }

    public function handle(GenerateAttachmentPreview $generatePreview): void
    {
        $generatePreview->handle($this->attachment);

        if (! $this->attachment->fresh()?->thumbnail_path) {
            return;
        }

        $message = $this->attachment->message()->first();

        if (! $message) {
            return;
        }

        $message->load(['user', 'replyTo.user', 'attachments', 'reactions.user', 'forwardedFromMessage.user', 'savedBy']);

        broadcast(new MessageUpdated($message));
    }
}
