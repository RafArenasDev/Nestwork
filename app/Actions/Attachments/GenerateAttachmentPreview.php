<?php

namespace App\Actions\Attachments;

use App\Models\Attachment;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

/**
 * Preview real de la primera página/hoja de un documento (PDF/Word/
 * Excel/texto plano). Corría síncrona dentro del propio POST de subida
 * (pedido explícito original: "la preview... la quiero desde la
 * miniatura que se carga, no al rato") — eso causaba 503 reales
 * (LibreOffice en frío + Poppler pueden tardar más que el timeout del
 * proxy) que dejaban el mensaje pegado en su preview `blob:` local para
 * siempre. Ahora la dispara `GenerateAttachmentPreviewJob` en cola —
 * la demora percibida (1-3s típico) llega por el mismo canal en vivo
 * que ya usan reacciones/ediciones, así que sigue viéndose "casi
 * inmediata" sin poder tumbar el envío del mensaje.
 *
 * Pipeline en dos pasos, cada herramienta en lo que de verdad es
 * confiable (probado con un PDF real que LibreOffice exportaba en
 * blanco vía `--convert-to png` directo — su filtro Draw→PNG no
 * renderiza todos los PDF igual de bien):
 *   1) Word/Excel/texto → PDF, con LibreOffice headless (conversor de
 *      Office más sólido que hay gratis/self-hosted). Un PDF ya es
 *      sólo un paso intermedio, nunca lo ve el usuario.
 *   2) PDF (el original, o el recién generado) → PNG, con `pdftoppm`
 *      (Poppler) — el estándar de facto para renderizar páginas de
 *      PDF, mucho más confiable que el propio exportador de LibreOffice.
 *
 * Nota de despliegue: ambos binarios (`soffice`, `pdftoppm`) van en el
 * SERVIDOR (no en la máquina del usuario final, que sólo ve la imagen
 * ya generada) — en producción van en la imagen Docker/build junto
 * con PHP/Postgres/etc. (`apt-get install -y libreoffice poppler-utils`
 * en el Dockerfile o equivalente del proveedor), no algo que cada
 * usuario deba instalar.
 */
class GenerateAttachmentPreview
{
    /** Extensiones que este pipeline sabe convertir — el resto (zip,
     *  sql, exe, msi, instaladores...) se queda con el ícono a color y
     *  descarga directa, a propósito: "de resto no tiene sentido"
     *  (pedido explícito). */
    public const CONVERTIBLE_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];

    public function handle(Attachment $attachment): void
    {
        $extension = strtolower(pathinfo($attachment->original_name, PATHINFO_EXTENSION));

        if (! in_array($extension, self::CONVERTIBLE_EXTENSIONS, true)) {
            return;
        }

        $disk = Storage::disk($attachment->disk);
        $sourcePath = $disk->path($attachment->path);
        $outputDir = sys_get_temp_dir().'/attachment-preview-'.$attachment->id.'-'.uniqid();
        File::ensureDirectoryExists($outputDir);

        try {
            $pdfPath = $extension === 'pdf'
                ? $sourcePath
                : $this->convertToPdf($sourcePath, $outputDir, $attachment->id);

            if (! $pdfPath) {
                return;
            }

            $generated = $this->renderFirstPageToPng($pdfPath, $outputDir, $attachment->id);

            if (! $generated) {
                return;
            }

            $thumbnailPath = "attachments/{$attachment->message->conversation_id}/thumbnails/{$attachment->id}.png";
            $disk->put($thumbnailPath, File::get($generated));

            $attachment->update(['thumbnail_path' => $thumbnailPath]);
        } finally {
            File::deleteDirectory($outputDir);
        }
    }

    private function convertToPdf(string $sourcePath, string $outputDir, int $attachmentId): ?string
    {
        $sofficeBinary = $this->resolveBinary([
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
            'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
            '/usr/bin/soffice',
            '/usr/local/bin/soffice',
            '/opt/libreoffice/program/soffice',
        ], 'soffice');

        if (! $sofficeBinary) {
            Log::warning('GenerateAttachmentPreview: soffice no encontrado, se omite la preview.', [
                'attachment_id' => $attachmentId,
            ]);

            return null;
        }

        $process = new Process([
            $sofficeBinary,
            '--headless',
            '--norestore',
            '--convert-to', 'pdf',
            '--outdir', $outputDir,
            $sourcePath,
        ]);
        // Corre dentro del request que sube el archivo — pedido
        // explícito de que la preview esté YA en la miniatura inicial,
        // no llegue "al rato". 25s alcanza para un documento normal
        // sin dejar la request colgada demasiado si algo sale mal.
        $process->setTimeout(25);
        $process->run();

        if (! $process->isSuccessful()) {
            Log::warning('GenerateAttachmentPreview: la conversión a PDF falló.', [
                'attachment_id' => $attachmentId,
                'error' => $process->getErrorOutput(),
            ]);

            return null;
        }

        return File::glob($outputDir.'/*.pdf')[0] ?? null;
    }

    private function renderFirstPageToPng(string $pdfPath, string $outputDir, int $attachmentId): ?string
    {
        // El candidato de winget incluye el número de versión en la
        // ruta (cambia con cada actualización de Poppler) — se busca
        // con glob en vez de una ruta fija. En producción (Docker,
        // `apt-get install poppler-utils`) esto ni se usa: cae
        // directo en /usr/bin/pdftoppm, la ruta estándar del paquete.
        $wingetCandidate = File::glob(
            getenv('LOCALAPPDATA').'/Microsoft/WinGet/Packages/*Poppler*/poppler-*/Library/bin/pdftoppm.exe',
        )[0] ?? null;

        $pdftoppmBinary = $this->resolveBinary(array_filter([
            $wingetCandidate,
            'C:\\Program Files\\poppler\\bin\\pdftoppm.exe',
            '/usr/bin/pdftoppm',
            '/usr/local/bin/pdftoppm',
        ]), 'pdftoppm');

        if (! $pdftoppmBinary) {
            Log::warning('GenerateAttachmentPreview: pdftoppm no encontrado, se omite la preview.', [
                'attachment_id' => $attachmentId,
            ]);

            return null;
        }

        $prefix = $outputDir.'/page';

        $process = new Process([
            $pdftoppmBinary,
            '-png',
            '-f', '1',
            '-l', '1',
            // Ancho fijo (no el DPI por defecto, que varía mucho según
            // el tamaño de página del PDF) — una miniatura de chat no
            // necesita más resolución que esto.
            '-scale-to', '900',
            $pdfPath,
            $prefix,
        ]);
        $process->setTimeout(25);
        $process->run();

        if (! $process->isSuccessful()) {
            Log::warning('GenerateAttachmentPreview: el render de la página falló.', [
                'attachment_id' => $attachmentId,
                'error' => $process->getErrorOutput(),
            ]);

            return null;
        }

        return File::glob($outputDir.'/page*.png')[0] ?? null;
    }

    /**
     * @param  array<int, string>  $candidates
     */
    private function resolveBinary(array $candidates, string $commandName): ?string
    {
        foreach ($candidates as $candidate) {
            if (File::exists($candidate)) {
                return $candidate;
            }
        }

        // PATH (si el binario ya está accesible como comando plano) —
        // `where` en Windows, `which` en Linux/Mac (servidor de
        // producción, dentro del Docker).
        $finder = new Process([PHP_OS_FAMILY === 'Windows' ? 'where' : 'which', $commandName]);
        $finder->run();

        if ($finder->isSuccessful()) {
            // strtok() está tipado como string|false en PHPStan (sólo
            // devuelve false si el string de entrada viene vacío, lo
            // que no pasa acá dentro de isSuccessful()) — el cast
            // documenta esa garantía sin cambiar el comportamiento.
            return trim((string) strtok($finder->getOutput(), "\n"));
        }

        return null;
    }
}
