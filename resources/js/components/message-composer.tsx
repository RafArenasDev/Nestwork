import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
// Underline viene incluido en @tiptap/starter-kit v3 (antes había que
// agregarlo aparte) — instalarlo también como paquete propio disparaba
// "[tiptap warn]: Duplicate extension names found: ['underline']".
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Code,
    Italic,
    List,
    ListOrdered,
    Quote,
    Send,
    Strikethrough,
    Underline as UnderlineIcon,
    X,
} from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
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

type TiptapMark = { type: string };
type TiptapNode = {
    type: string;
    content?: TiptapNode[];
    text?: string;
    marks?: TiptapMark[];
};

function serializeMarks(text: string, marks: TiptapMark[] = []): string {
    const has = (type: string) => marks.some((mark) => mark.type === type);

    // El code mark excluye a los demás en el schema de Tiptap — no
    // hace falta contemplar combinaciones ahí.
    if (has('code')) {
        return `\`${text}\``;
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
                    className={`flex size-7 items-center justify-center rounded-full transition-colors ${
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
    onSubmit: (markdownBody: string) => void;
    onTyping: () => void;
}) {
    const editor = useEditor({
        // Evita el doble-render de React 19/StrictMode intentando
        // montar el editor durante el SSR de Inertia — Tiptap no es
        // SSR-safe por diseño (necesita el DOM real), así que arranca
        // vacío en el server y se hidrata del lado del cliente.
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                // Sin encabezados/regla horizontal/bloque de código:
                // esto es un composer de chat, no un editor de
                // documentos — el spec sólo pide negrita/cursiva/
                // subrayado/tachado/código EN LÍNEA/cita/lista.
                heading: false,
                horizontalRule: false,
                codeBlock: false,
            }),
            Placeholder.configure({ placeholder }),
        ],
        editorProps: {
            attributes: {
                // El preflight de Tailwind resetea el font-weight/
                // font-style/text-decoration por defecto de
                // strong/em/u/s (deja todo "en blanco" a propósito) —
                // sin estas clases, negrita/cursiva/subrayado/tachado
                // quedaban activos en el estado del editor (el botón SÍ
                // se veía presionado) pero el texto no se veía distinto
                // — bug real, no sólo cosmético menor.
                class: 'max-h-40 min-h-11 overflow-y-auto px-4 py-2.5 text-sm focus:outline-none [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-current/40 [&_blockquote]:pl-2 [&_blockquote]:opacity-90 [&_code]:rounded [&_code]:bg-foreground/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
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
                    editor.isActive('blockquote')
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

    const submit = () => {
        if (!editor || editor.isEmpty) {
            return;
        }

        const markdown = serializeToMarkdown(editor.getJSON());
        editor.commands.clearContent();
        onSubmit(markdown);
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
                    className={`flex items-start gap-2 rounded-3xl border-l-[5px] bg-[#71717a] py-2 pr-2 pl-3.5 ${replyingTo.isMine ? 'border-l-[#c2410c]' : 'border-l-[#1e3a8a]'}`}
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
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-6 shrink-0"
                        aria-label="Cancelar respuesta"
                        onClick={onCancelReply}
                    >
                        <X className="size-3.5" />
                    </Button>
                </div>
            )}

            <div className="text-muted-foreground flex items-center gap-0.5">
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
            </div>

            <div className="flex items-end gap-2">
                {/* Mismo lenguaje visual que cualquier input del
                    design system: borde sutil + fondo transparente +
                    anillo de foco — antes lo daba el Textarea de
                    shadcn gratis, acá hay que armarlo a mano porque el
                    contenteditable real de Tiptap vive adentro, no es
                    un <textarea>. focus-within (no :focus) porque el
                    foco cae en el hijo editable, no en este div. */}
                <div className="focus-within:border-ring focus-within:ring-ring/50 dark:bg-input/30 border-input flex-1 rounded-3xl border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]">
                    <EditorContent editor={editor} />
                </div>
                <Button
                    type="button"
                    size="icon"
                    className="btn-elevated size-11 shrink-0 rounded-full"
                    disabled={!editor || editor.isEmpty}
                    onClick={submit}
                >
                    <Send className="size-4" />
                </Button>
            </div>
        </div>
    );
}
