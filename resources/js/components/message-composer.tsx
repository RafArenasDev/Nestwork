import { getMarkRange } from '@tiptap/core';
import { EditorContent, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
// Underline viene incluido en @tiptap/starter-kit v3 (antes había que
// agregarlo aparte) — instalarlo también como paquete propio disparaba
// "[tiptap warn]: Duplicate extension names found: ['underline']".
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Code,
    FileImage,
    FileVideo,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Mic,
    Paperclip,
    Quote,
    Redo2,
    Send,
    SquareCode,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo2,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ComposerCodeBlock } from '@/components/composer-code-block';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { lowlight } from '@/lib/code-languages';
import type { MessageData } from '@/types';

/**
 * Composer WYSIWYG real (sección 9 del prompt v2) — pedido explícito,
 * varias veces: "no quiero que el user vea que pasa internamente para
 * que un hola llegue como negrita... quiero que funcione como en
 * Word/Gmail". Un <textarea> NUNCA puede lograr esto (no puede
 * estilizar caracteres individuales) — por eso este componente
 * reemplaza el textarea plano por un editor real (Tiptap/ProseMirror):
 * negrita/cursiva/etc. se ven YA formateadas mientras se escribe, los
 * botones son toggles reales (activar/desactivar, como cualquier
 * editor profesional, con o sin selección) y Enter dentro de una
 * lista/cita continúa el bloque en vez de enviar (nativo de Tiptap).
 *
 * Lo que el usuario ve nunca es Markdown — internamente SÍ se serializa
 * a Markdown ligero (serializeToMarkdown más abajo) porque así viaja
 * el mensaje (messages.body es texto plano portable, no HTML: guardar
 * HTML crudo de un editor y volver a renderizarlo con innerHTML crudo
 * en el receptor sería XSS directo — ver la nota en
 * renderFormattedBody, pages/messages/index.tsx). El receptor sigue
 * renderizando con ese mismo tokenizer seguro, sin cambios.
 */

type TiptapMark = { type: string; attrs?: { href?: string } };
type TiptapNode = {
    type: string;
    content?: TiptapNode[];
    text?: string;
    marks?: TiptapMark[];
    attrs?: { language?: string | null };
};

function serializeMarks(text: string, marks: TiptapMark[] = []): string {
    const has = (type: string) => marks.some((mark) => mark.type === type);

    // El code mark excluye a los demás en el schema de Tiptap — no
    // hace falta contemplar combinaciones ahí.
    if (has('code')) {
        return `\`${text}\``;
    }

    // Un link con otro formato combinado (negrita+link, etc.) es un
    // caso raro que el tokenizer del receptor no re-procesa dentro del
    // `[texto](url)` — se prioriza el link solo, sin anidar sintaxis
    // que se vería literal en vez de aplicarse.
    const linkMark = marks.find((mark) => mark.type === 'link');

    if (linkMark?.attrs?.href) {
        return `[${text}](${linkMark.attrs.href})`;
    }

    let result = text;

    if (has('bold')) {
        result = `**${result}**`;
    }

    if (has('italic')) {
        result = `_${result}_`;
    }

    if (has('underline')) {
        result = `__${result}__`;
    }

    if (has('strike')) {
        result = `~~${result}~~`;
    }

    return result;
}

function serializeInline(nodes: TiptapNode[] = []): string {
    return nodes
        .map((node) => {
            if (node.type === 'hardBreak') {
                return '\n';
            }

            if (node.type === 'text') {
                return serializeMarks(node.text ?? '', node.marks);
            }

            return '';
        })
        .join('');
}

function serializeBlock(node: TiptapNode): string[] {
    switch (node.type) {
        case 'paragraph':
            return [serializeInline(node.content)];
        case 'blockquote':
            return (node.content ?? []).flatMap((child) =>
                serializeBlock(child).map((line) => `> ${line}`),
            );
        case 'bulletList':
            return (node.content ?? []).flatMap((listItem) =>
                (listItem.content ?? []).flatMap((child) =>
                    serializeBlock(child).map((line) => `- ${line}`),
                ),
            );
        case 'orderedList': {
            let itemNumber = 1;

            return (node.content ?? []).flatMap((listItem) => {
                const lines = (listItem.content ?? []).flatMap((child) =>
                    serializeBlock(child),
                );

                return lines.map((line, index) =>
                    index === 0 ? `${itemNumber++}. ${line}` : line,
                );
            });
        }
        case 'codeBlock': {
            // El nodo de código de ProseMirror guarda el texto crudo
            // (con los '\n' internos tal cual, sin hardBreak) en un
            // único nodo de texto — se conserva la indentación exacta,
            // sin pasar por serializeMarks (un bloque de código no
            // lleva negrita/cursiva/etc.).
            const code = (node.content ?? [])
                .map((child) => child.text ?? '')
                .join('');
            // Sin elegir lenguaje (AUTO_DETECT) el fence queda sin
            // etiqueta ("```" pelado) — MessageCodeBlock del lado
            // receptor interpreta eso como "detectá vos" en vez de
            // forzar un "plaintext" que apagaría el resaltado.
            const language = node.attrs?.language ?? '';

            return [`\`\`\`${language}`, ...code.split('\n'), '```'];
        }
        default:
            return [];
    }
}

/** ProseMirror doc (editor.getJSON()) -> el mismo Markdown ligero que
 *  ya sabe renderizar renderFormattedBody del lado receptor. */
function serializeToMarkdown(doc: TiptapNode): string {
    return (doc.content ?? [])
        .flatMap((node) => serializeBlock(node))
        .join('\n');
}

function ToolbarButton({
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: typeof Bold;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                    // onMouseDown (no onClick) + preventDefault: un
                    // click de verdad le saca el foco al editor ANTES
                    // de que este handler corra, perdiendo dónde
                    // estaba el cursor.
                    onMouseDown={(event) => {
                        event.preventDefault();
                        onClick();
                    }}
                    className={`flex size-7 items-center justify-center rounded-full transition-[transform,background-color,color] duration-100 active:scale-90 ${
                        active
                            ? 'bg-foreground/15 text-foreground'
                            : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground'
                    }`}
                >
                    <Icon className="size-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

export function MessageComposer({
    placeholder,
    replyingTo,
    onCancelReply,
    onSubmit,
    onTyping,
}: {
    placeholder: string;
    replyingTo: MessageData | null;
    onCancelReply: () => void;
    onSubmit: (
        markdownBody: string,
        attachment: File | null,
        attachmentCategory: 'image' | 'video' | 'document' | 'audio' | null,
    ) => void;
    onTyping: () => void;
}) {
    const editor = useEditor({
        // Evita el doble-render de React 19/StrictMode intentando
        // montar el editor durante el SSR de Inertia — Tiptap no es
        // SSR-safe por diseño (necesita el DOM real), así que arranca
        // vacío en el server y se hidrata del lado del cliente.
        immediatelyRender: false,
        // Tiptap 3 cambió el default a `false` (antes v2 sí
        // re-renderizaba solo) — sin esto, la toolbar entera queda
        // "congelada": los botones sólo reflejaban isActive() en el
        // render en que se montó el editor, no en cada
        // selección/transacción real. Bug real, no cosmético — pedido
        // explícito: "debe quedarse seleccionada hasta que se vuelva a
        // clickear, como en Word/Slack/Teams", que es justo lo que
        // isActive() ya hace bien SI el componente vuelve a renderizar.
        shouldRerenderOnTransaction: true,
        extensions: [
            StarterKit.configure({
                // Sin encabezados/regla horizontal: esto es un composer
                // de chat, no un editor de documentos. codeBlock se
                // reemplaza por CodeBlockLowlight más abajo (resaltado
                // de sintaxis real, no sólo texto monoespaciado).
                heading: false,
                horizontalRule: false,
                codeBlock: false,
            }),
            Placeholder.configure({ placeholder }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                protocols: ['http', 'https', 'mailto'],
                HTMLAttributes: {
                    rel: 'noopener noreferrer nofollow',
                    target: '_blank',
                },
            }),
            CodeBlockLowlight.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(ComposerCodeBlock);
                },
                // defaultLanguage: null (el default de la extensión) —
                // language sin elegir dispara lowlight.highlightAuto()
                // acá mismo mientras se escribe, no sólo al recibir.
            }).configure({ lowlight }),
        ],
        editorProps: {
            attributes: {
                // El preflight de Tailwind resetea el font-weight/
                // font-style/text-decoration por defecto de
                // strong/em/u/s (deja todo "en blanco" a propósito) —
                // sin estas clases, negrita/cursiva/subrayado/tachado
                // quedaban activos en el estado del editor (el botón SÍ
                // se veía presionado) pero el texto no se veía distinto
                // — bug real, no sólo cosmético menor. `[&_p_code]` (no
                // `[&_code]` a secas) porque el código EN LÍNEA sólo
                // vive dentro de un párrafo — así no le pisa el estilo
                // propio del `<code>` del bloque de código
                // (ComposerCodeBlock ya trae el suyo).
                // flex + justify-center: pedido explícito — con un
                // solo renglón, el texto/placeholder quedaba pegado
                // arriba del área min-h-11 en vez de centrado
                // verticalmente (el contenido de un contenteditable es
                // flujo de bloque normal, no se centra solo). Con
                // varias líneas, crece hacia abajo/arriba como
                // cualquier columna flex hasta el tope de max-h-40.
                class: 'max-h-40 overflow-y-auto px-4 py-2.5 text-sm focus:outline-none [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-current/40 [&_blockquote]:pl-2 [&_blockquote]:opacity-90 [&_p_code]:rounded [&_p_code]:bg-foreground/10 [&_p_code]:px-1 [&_p_code]:py-0.5 [&_p_code]:font-mono [&_p_code]:text-[0.85em] [&_a]:underline [&_a]:decoration-current/40 [&_a]:underline-offset-2',
                // Pedido explícito: corrección ortográfica del
                // navegador — sin esto queda a merced del default de
                // cada navegador sobre un contenteditable armado a
                // mano (no siempre es "on").
                spellcheck: 'true',
                autocorrect: 'on',
            },
            // Mayúscula automática en vivo (como el teclado de
            // Android/iOS/Word) — pedido explícito. Se dispara SOLO al
            // inicio de un bloque o justo después de ". "/"! "/"? ", y
            // nunca dentro de código (inline o bloque): ahí una
            // mayúscula "gratis" rompe nombres de variables/funciones.
            // `handleTextInput` (no un input rule): corre ANTES de que
            // el navegador confirme la letra, así no hay que corregir
            // un caracter ya insertado ni saltar el cursor.
            handleTextInput: (view, from, to, text) => {
                if (!editor || !/^\p{Ll}$/u.test(text)) {
                    return false;
                }

                if (editor.isActive('code') || editor.isActive('codeBlock')) {
                    return false;
                }

                const { state } = view;
                const blockStart = state.selection.$from.start();
                const precedingText = state.doc.textBetween(
                    Math.max(blockStart, from - 2),
                    from,
                    '\n',
                );
                const isSentenceStart =
                    from === blockStart || /[.!?]\s$/.test(precedingText);

                if (!isSentenceStart) {
                    return false;
                }

                // Nunca poner mayúscula si esto podría estar arrancando
                // una URL ("https://…", "www…") — bug real reportado:
                // "Https://github.com/..." con mayúscula inicial rompe
                // el link y se ve mal. Se aísla la PALABRA actual
                // (desde el último espacio) porque a esta altura puede
                // faltar terminar de escribir el esquema.
                const lookback = state.doc.textBetween(
                    Math.max(blockStart, from - 20),
                    from,
                    '\n',
                );
                const lastBoundary = Math.max(
                    lookback.lastIndexOf(' '),
                    lookback.lastIndexOf('\n'),
                );
                const currentWord = (
                    lookback.slice(lastBoundary + 1) + text
                ).toLowerCase();
                const looksLikeUrlStart = ['http://', 'https://', 'www.'].some(
                    (prefix) => prefix.startsWith(currentWord),
                );

                if (looksLikeUrlStart) {
                    return false;
                }

                view.dispatch(
                    state.tr.insertText(text.toLocaleUpperCase('es'), from, to),
                );

                return true;
            },
            // Enter dentro de una lista/cita: dejar que Tiptap la
            // continúe solo (nativo de ListItem/Blockquote — nueva
            // viñeta, siguiente número, sale del bloque en un ítem
            // vacío). Fuera de eso, Enter envía — pedido explícito:
            // "el enter envía y no deja escribir la lista".
            handleKeyDown: (_view, event) => {
                if (event.key !== 'Enter' || event.shiftKey) {
                    return false;
                }

                if (!editor) {
                    return false;
                }

                if (
                    editor.isActive('listItem') ||
                    editor.isActive('blockquote') ||
                    editor.isActive('codeBlock')
                ) {
                    return false;
                }

                event.preventDefault();
                submit();

                return true;
            },
        },
        onUpdate: () => onTyping(),
    });

    // "Responder" en una burbuja enfoca el composer — reactivo al
    // cambio de replyingTo en vez de un ref imperativo cruzando
    // componentes.
    useEffect(() => {
        if (replyingTo && editor) {
            editor.chain().focus('end').run();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [replyingTo, editor]);

    const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
    const [linkUrlDraft, setLinkUrlDraft] = useState('');
    // Pedido explícito: el popover pide URL Y la palabra/frase que lo
    // recibe — no sólo linkear el texto ya seleccionado tal cual.
    const [linkTextDraft, setLinkTextDraft] = useState('');

    const openLinkPopover = () => {
        if (!editor) {
            return;
        }

        const { state } = editor;
        const { $from, from, to, empty } = state.selection;
        const linkType = state.schema.marks.link;
        const range = linkType ? getMarkRange($from, linkType) : undefined;

        if (range) {
            // Cursor sobre un link existente: precargar URL + su texto
            // completo (no sólo el punto exacto del cursor) — reabrir
            // el popover ahí edita, no ofrece un campo vacío.
            setLinkUrlDraft(
                (editor.getAttributes('link').href as string) ?? '',
            );
            setLinkTextDraft(state.doc.textBetween(range.from, range.to, ' '));
        } else if (!empty) {
            // Había texto seleccionado antes de abrir el popover: se
            // precarga como texto a mostrar, editable igual.
            setLinkUrlDraft('');
            setLinkTextDraft(state.doc.textBetween(from, to, ' '));
        } else {
            setLinkUrlDraft('');
            setLinkTextDraft('');
        }

        setLinkPopoverOpen(true);
    };

    const applyLink = () => {
        if (!editor) {
            return;
        }

        const url = linkUrlDraft.trim();

        if (!url) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            setLinkPopoverOpen(false);

            return;
        }

        const href = /^[a-z][\w+.-]*:/i.test(url) ? url : `https://${url}`;
        const { state } = editor;
        const { $from, from, to, empty } = state.selection;
        const linkType = state.schema.marks.link;
        const range = linkType ? getMarkRange($from, linkType) : undefined;
        const target = range ?? (!empty ? { from, to } : { from, to: from });

        // insertContentAt reemplaza el rango objetivo (o inserta en el
        // cursor si no había nada seleccionado) por UN nodo de texto
        // con el mark de link ya aplicado — cubre los tres casos
        // (nada seleccionado, texto seleccionado, o editando un link
        // existente) con el mismo camino, sin dangerouslySetInnerHTML
        // ni parsear HTML: es un nodo JSON validado por el schema.
        editor
            .chain()
            .focus()
            .insertContentAt(target, {
                type: 'text',
                text: linkTextDraft.trim() || href,
                marks: [{ type: 'link', attrs: { href } }],
            })
            .run();

        setLinkPopoverOpen(false);
    };

    const removeLink = () => {
        editor?.chain().focus().extendMarkRange('link').unsetLink().run();
        setLinkPopoverOpen(false);
    };

    type AttachmentCategory = 'image' | 'video' | 'document' | 'audio';

    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentCategory, setAttachmentCategory] =
        useState<AttachmentCategory | null>(null);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
    const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<
        string | null
    >(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // Vista previa real (miniatura) para foto/video — object URL propio
    // del navegador, liberado apenas cambia o se quita el adjunto para
    // no filtrar memoria.
    useEffect(() => {
        if (
            !attachment ||
            (attachmentCategory !== 'image' && attachmentCategory !== 'video')
        ) {
            setAttachmentPreviewUrl(null);

            return;
        }

        const url = URL.createObjectURL(attachment);

        setAttachmentPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [attachment, attachmentCategory]);

    // Validación real del archivo (no sólo confiar en el `accept` del
    // input, que el usuario puede saltarse) — pedido explícito: "que no
    // permita cargar algo diferente" a lo que dice el botón. Rechaza
    // ANTES de mostrar cualquier preview u ofrecer enviar.
    const pickFile = (category: AttachmentCategory, file: File | undefined) => {
        if (!file) {
            return;
        }

        const matches =
            category === 'document'
                ? !file.type.startsWith('image/') &&
                  !file.type.startsWith('video/') &&
                  !file.type.startsWith('audio/')
                : file.type.startsWith(`${category}/`);

        if (!matches) {
            // Tono de ayuda, no de regaño — pedido explícito: decir qué
            // formatos sí sirven, sin regañar. Español neutro (sin
            // voseo: "prueba", no "probá").
            const hints: Record<AttachmentCategory, string> = {
                image: 'Ese formato de imagen no es compatible. Puedes usar JPG, PNG, GIF o WEBP.',
                video: 'Ese formato de video no es compatible. Puedes usar MP4, MOV o WEBM.',
                document:
                    'Ese formato de documento no es compatible. Puedes usar PDF, Word, Excel, ZIP o TXT.',
                audio: 'Ese formato de audio no es compatible. Puedes usar MP3, WAV u OGG.',
            };

            setAttachmentError(hints[category]);

            return;
        }

        setAttachmentError(null);
        setAttachment(file);
        setAttachmentCategory(category);
    };

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const recorder = new MediaRecorder(stream);

            recordedChunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };
            recorder.onstop = () => {
                // Cerrar los tracks del micrófono — sin esto el
                // navegador sigue mostrando el indicador "usando el
                // micrófono" aunque ya se dejó de grabar.
                stream.getTracks().forEach((track) => track.stop());

                const blob = new Blob(recordedChunksRef.current, {
                    type: recorder.mimeType || 'audio/webm',
                });
                const extension = recorder.mimeType?.includes('ogg')
                    ? 'ogg'
                    : 'webm';
                const file = new File(
                    [blob],
                    `nota-de-voz-${Date.now()}.${extension}`,
                    { type: blob.type },
                );

                setAttachmentError(null);
                setAttachment(file);
                setAttachmentCategory('audio');
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
        } catch {
            // Permiso denegado o sin micrófono — mismo canal de aviso
            // que un archivo inválido, sin tecnicismos de la API.
            setAttachmentError(
                'No se pudo acceder al micrófono. Revisa los permisos del navegador.',
            );
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const clearAttachment = () => {
        setAttachment(null);
        setAttachmentCategory(null);
        setAttachmentError(null);

        for (const ref of [fileInputRef, photoInputRef, videoInputRef]) {
            if (ref.current) {
                ref.current.value = '';
            }
        }
    };

    const submit = () => {
        // Un adjunto ya alcanza para enviar — el mensaje puede ir sin
        // texto (sólo la foto/archivo), pedido explícito.
        if ((!editor || editor.isEmpty) && !attachment) {
            return;
        }

        const markdown = editor ? serializeToMarkdown(editor.getJSON()) : '';
        editor?.commands.clearContent();
        onSubmit(markdown, attachment, attachmentCategory);
        clearAttachment();
    };

    return (
        <div className="flex flex-col gap-2 border-t p-3">
            {replyingTo && (
                // rounded-3xl + gris fijo: mismo fondo/texto que el
                // badge de previsualización dentro de la burbuja (ver
                // pages/messages/index.tsx) — contraste garantizado en
                // los dos temas. Acento de color: naranja si respondo
                // algo mío, azul oscuro si respondo a otro.
                <div
                    className={`flex items-center gap-2 rounded-3xl border-l-[5px] bg-[#71717a] py-2 pr-2 pl-3.5 ${replyingTo.isMine ? 'border-l-[#c2410c]' : 'border-l-[#1e3a8a]'}`}
                >
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white">
                            Respondiendo a{' '}
                            {replyingTo.isMine
                                ? 'ti mismo'
                                : replyingTo.userName}
                        </p>
                        <p className="truncate text-xs text-white/70">
                            {replyingTo.body}
                        </p>
                    </div>
                    {/* Redondo de verdad (no rounded-md del Button base)
                        — mismo lenguaje que el botón de cerrar de los
                        modales (ver DialogClose en ui/dialog.tsx):
                        rounded-full + fondo sutil sobre el color de este
                        badge, ícono centrado por el flex del propio
                        Button. */}
                    <button
                        type="button"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                        aria-label="Cancelar respuesta"
                        onClick={onCancelReply}
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            )}

            {attachment && (
                // animate-attachment-in: "materializar", no sólo aparecer
                // de golpe (apple-design §12) — un solo keyframe estático,
                // esto no es algo que el usuario arrastre/interrumpa, así
                // que no hace falta un spring interruptible acá.
                <div className="animate-attachment-in flex items-center gap-3 rounded-3xl border-l-[5px] border-l-[#166534] bg-[#71717a] py-2 pr-2 pl-3">
                    {attachmentPreviewUrl ? (
                        attachmentCategory === 'video' ? (
                            // eslint-disable-next-line jsx-a11y/media-has-caption
                            <video
                                src={attachmentPreviewUrl}
                                muted
                                className="size-10 shrink-0 rounded-lg object-cover"
                            />
                        ) : (
                            <img
                                src={attachmentPreviewUrl}
                                alt=""
                                className="size-10 shrink-0 rounded-lg object-cover"
                            />
                        )
                    ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                            {attachmentCategory === 'audio' ? (
                                <Mic className="size-4 text-white" />
                            ) : (
                                <Paperclip className="size-4 text-white" />
                            )}
                        </div>
                    )}
                    {/* Sin badge/etiqueta encima — pedido explícito: con
                        la miniatura ya alcanza, un rótulo "Adjunto"
                        arriba del nombre sobra. */}
                    <p className="min-w-0 flex-1 truncate text-xs font-medium text-white">
                        {attachmentCategory === 'audio'
                            ? 'Nota de voz'
                            : attachment.name}
                    </p>
                    <button
                        type="button"
                        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                        aria-label="Quitar adjunto"
                        onClick={clearAttachment}
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            )}

            {attachmentError && (
                <p className="text-destructive px-1 text-xs">
                    {attachmentError}
                </p>
            )}

            <div className="text-muted-foreground flex items-center gap-0.5">
                <input
                    ref={photoInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(event) => {
                        pickFile('image', event.target.files?.[0]);
                        event.target.value = '';
                    }}
                />
                <input
                    ref={videoInputRef}
                    type="file"
                    hidden
                    accept="video/*"
                    onChange={(event) => {
                        pickFile('video', event.target.files?.[0]);
                        event.target.value = '';
                    }}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                    onChange={(event) => {
                        pickFile('document', event.target.files?.[0]);
                        event.target.value = '';
                    }}
                />
                {/* Tres botones separados, no un único clip genérico
                    (pedido explícito: "todo separado queda mejor, evita
                    eso de dejar todo pegado") — mismo patrón que
                    Teams/Slack: el ícono ya te dice qué vas a adjuntar,
                    sin abrir nada intermedio. */}
                <ToolbarButton
                    icon={FileImage}
                    label="Adjuntar foto"
                    active={false}
                    onClick={() => photoInputRef.current?.click()}
                />
                <ToolbarButton
                    icon={FileVideo}
                    label="Adjuntar video"
                    active={false}
                    onClick={() => videoInputRef.current?.click()}
                />
                <ToolbarButton
                    icon={Paperclip}
                    label="Adjuntar documento"
                    active={attachment !== null}
                    onClick={() => fileInputRef.current?.click()}
                />
                <span className="bg-border mx-1 h-4 w-px" aria-hidden="true" />
                <ToolbarButton
                    icon={Bold}
                    label="Negrita"
                    active={editor?.isActive('bold') ?? false}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                />
                <ToolbarButton
                    icon={Italic}
                    label="Cursiva"
                    active={editor?.isActive('italic') ?? false}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                />
                <ToolbarButton
                    icon={UnderlineIcon}
                    label="Subrayado"
                    active={editor?.isActive('underline') ?? false}
                    onClick={() =>
                        editor?.chain().focus().toggleUnderline().run()
                    }
                />
                <ToolbarButton
                    icon={Strikethrough}
                    label="Tachado"
                    active={editor?.isActive('strike') ?? false}
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                />
                <ToolbarButton
                    icon={Code}
                    label="Código en línea"
                    active={editor?.isActive('code') ?? false}
                    onClick={() => editor?.chain().focus().toggleCode().run()}
                />
                <ToolbarButton
                    icon={SquareCode}
                    label="Bloque de código"
                    active={editor?.isActive('codeBlock') ?? false}
                    onClick={() =>
                        editor?.chain().focus().toggleCodeBlock().run()
                    }
                />
                <span className="bg-border mx-1 h-4 w-px" aria-hidden="true" />
                <ToolbarButton
                    icon={Quote}
                    label="Cita en bloque"
                    active={editor?.isActive('blockquote') ?? false}
                    onClick={() =>
                        editor?.chain().focus().toggleBlockquote().run()
                    }
                />
                <ToolbarButton
                    icon={List}
                    label="Lista"
                    active={editor?.isActive('bulletList') ?? false}
                    onClick={() =>
                        editor?.chain().focus().toggleBulletList().run()
                    }
                />
                <ToolbarButton
                    icon={ListOrdered}
                    label="Lista numerada"
                    active={editor?.isActive('orderedList') ?? false}
                    onClick={() =>
                        editor?.chain().focus().toggleOrderedList().run()
                    }
                />
                <span className="bg-border mx-1 h-4 w-px" aria-hidden="true" />
                <Popover
                    open={linkPopoverOpen}
                    onOpenChange={setLinkPopoverOpen}
                >
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            aria-label="Insertar enlace"
                            aria-pressed={editor?.isActive('link') ?? false}
                            // onClick normal (NO onMouseDown+preventDefault
                            // como el resto de la toolbar): acá SÍ
                            // queremos que el foco se mueva al popover
                            // (el Input de la URL vive adentro) — evitar
                            // el default rompía la detección de "click
                            // afuera" de Radix y el popover se cerraba
                            // solo al instante, antes de poder escribir
                            // nada (bug real reportado).
                            onClick={openLinkPopover}
                            className={`flex size-7 items-center justify-center rounded-full transition-[transform,background-color,color] duration-100 active:scale-90 ${
                                editor?.isActive('link')
                                    ? 'bg-foreground/15 text-foreground'
                                    : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground'
                            }`}
                        >
                            <LinkIcon className="size-4" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                        <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium">
                                {editor?.isActive('link')
                                    ? 'Editar enlace'
                                    : 'Insertar enlace'}
                            </p>
                            <div className="flex flex-col gap-1">
                                <label className="text-muted-foreground text-[11px]">
                                    Texto a mostrar
                                </label>
                                <Input
                                    autoFocus
                                    placeholder="Nombre del enlace"
                                    value={linkTextDraft}
                                    onChange={(event) =>
                                        setLinkTextDraft(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            applyLink();
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-muted-foreground text-[11px]">
                                    URL
                                </label>
                                <Input
                                    placeholder="https://ejemplo.com"
                                    value={linkUrlDraft}
                                    onChange={(event) =>
                                        setLinkUrlDraft(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            applyLink();
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                {editor?.isActive('link') && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={removeLink}
                                    >
                                        Quitar
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={applyLink}
                                >
                                    Aplicar
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
                <span className="bg-border mx-1 h-4 w-px" aria-hidden="true" />
                <ToolbarButton
                    icon={Undo2}
                    label="Deshacer"
                    active={false}
                    onClick={() => editor?.chain().focus().undo().run()}
                />
                <ToolbarButton
                    icon={Redo2}
                    label="Rehacer"
                    active={false}
                    onClick={() => editor?.chain().focus().redo().run()}
                />
            </div>

            <div className="flex items-end gap-2">
                {/* Mismo lenguaje visual que cualquier input del
                    design system: borde sutil + fondo transparente +
                    anillo de foco — antes lo daba el Textarea de
                    shadcn gratis, acá hay que armarlo a mano porque el
                    contenteditable real de Tiptap vive adentro, no es
                    un <textarea>. focus-within (no :focus) porque el
                    foco cae en el hijo editable, no en este div. */}
                <div
                    // min-h-11 (igual al size-11 del botón de enviar):
                    // sin esto, la fila entera con `items-end` podía
                    // rendirizar 1px más baja que el botón redondo en
                    // el caso de una sola línea, viéndose "desalineada"
                    // — pedido explícito.
                    // El centrado vertical vive ACÁ (flex del wrapper),
                    // no en la clase del propio .ProseMirror — ponerlo
                    // en el contenteditable rompía el centrado al
                    // entrar/salir de un bloque de código (Tiptap
                    // recalcula ese nodo de forma distinta y el flex
                    // sobre el contenteditable mismo quedaba
                    // desincronizado). Así el centrado es puramente
                    // geométrico: contenido chico se centra en el
                    // min-h-11, contenido que crece hacia max-h-40 ya
                    // no necesita centrarse (llena el espacio solo).
                    className="focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 border-input flex min-h-11 flex-1 flex-col justify-center rounded-3xl border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]"
                >
                    <EditorContent editor={editor} />
                </div>
                {/* Grabar nota de voz — pedido explícito, antes del
                    botón de enviar. Mismo pipeline de adjuntos que
                    foto/video/documento: al parar de grabar queda como
                    preview reproducible, se envía con el botón normal
                    (no auto-envía al soltar). Tamaño a mitad de camino
                    entre los íconos chicos de la toolbar (size-7) y el
                    botón de enviar (size-11) — vive en esta fila, no en
                    la toolbar de arriba. */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label={
                                isRecording
                                    ? 'Detener grabación'
                                    : 'Grabar audio'
                            }
                            aria-pressed={isRecording}
                            onClick={
                                isRecording ? stopRecording : startRecording
                            }
                            className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-[transform,background-color,color] duration-100 active:scale-90 ${
                                isRecording
                                    ? 'bg-destructive animate-pulse text-white'
                                    : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground'
                            }`}
                        >
                            <Mic className="size-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isRecording ? 'Detener grabación' : 'Grabar audio'}
                    </TooltipContent>
                </Tooltip>
                <Button
                    type="button"
                    size="icon"
                    className="btn-elevated size-11 shrink-0 rounded-full transition-transform duration-100 active:scale-90"
                    disabled={(!editor || editor.isEmpty) && !attachment}
                    onClick={submit}
                >
                    <Send className="size-4" />
                </Button>
            </div>
        </div>
    );
}
