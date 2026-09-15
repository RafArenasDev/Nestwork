import type { JSONContent } from '@tiptap/core';

/**
 * Reverso de `serializeToMarkdown` (message-composer.tsx): convierte el
 * cuerpo markdown-ligero ya guardado de un mensaje en el documento
 * Tiptap que el composer necesita para poder editarlo SIN perder el
 * formato (pedido implícito de "editar mensaje" — cargar el texto
 * plano tal cual, con los `**`/`_`/etc. a la vista, sería un paso
 * atrás frente a lo que ya se ve al escribir por primera vez).
 *
 * Mismas reglas de reconocimiento que `renderMessageBody`/
 * `renderInlineFormatting` en pages/messages/index.tsx — a propósito
 * simétrico, para que "lo que ves" al editar sea consistente con "lo
 * que ya se ve" en la burbuja enviada. No cubre bloques de cita/lista
 * ni bloques de código anidados dentro de otro formato (mismo alcance
 * que esa función de render).
 */
const INLINE_FORMAT_RE =
    /\*\*(?<bold>.+?)\*\*|__(?<underline>.+?)__|~~(?<strike>.+?)~~|`(?<code>.+?)`|\[(?<linkText>[^\]]+)\]\((?<linkHref>[^\s)]+)\)|(?<url>https?:\/\/[^\s<]+)|_(?<italic>.+?)_/g;

const CODE_FENCE_RE = /```([\w-]*)\n([\s\S]*?)```/g;

function parseInline(text: string): JSONContent[] {
    const nodes: JSONContent[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    INLINE_FORMAT_RE.lastIndex = 0;

    while ((match = INLINE_FORMAT_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push({
                type: 'text',
                text: text.slice(lastIndex, match.index),
            });
        }

        const groups = match.groups ?? {};

        if (groups.bold !== undefined) {
            nodes.push({
                type: 'text',
                text: groups.bold,
                marks: [{ type: 'bold' }],
            });
        } else if (groups.underline !== undefined) {
            nodes.push({
                type: 'text',
                text: groups.underline,
                marks: [{ type: 'underline' }],
            });
        } else if (groups.strike !== undefined) {
            nodes.push({
                type: 'text',
                text: groups.strike,
                marks: [{ type: 'strike' }],
            });
        } else if (groups.code !== undefined) {
            nodes.push({
                type: 'text',
                text: groups.code,
                marks: [{ type: 'code' }],
            });
        } else if (groups.linkText !== undefined) {
            nodes.push({
                type: 'text',
                text: groups.linkText,
                marks: [{ type: 'link', attrs: { href: groups.linkHref } }],
            });
        } else if (groups.url !== undefined) {
            nodes.push({
                type: 'text',
                text: groups.url,
                marks: [{ type: 'link', attrs: { href: groups.url } }],
            });
        } else if (groups.italic !== undefined) {
            nodes.push({
                type: 'text',
                text: groups.italic,
                marks: [{ type: 'italic' }],
            });
        }

        lastIndex = INLINE_FORMAT_RE.lastIndex;
    }

    if (lastIndex < text.length) {
        nodes.push({ type: 'text', text: text.slice(lastIndex) });
    }

    // ProseMirror no acepta nodos de texto vacíos.
    return nodes.filter((node) => node.text !== '');
}

/** Una línea de texto normal (sin prefijo de bloque) -> un párrafo. */
function paragraphFrom(line: string): JSONContent {
    const content = parseInline(line);

    return content.length > 0
        ? { type: 'paragraph', content }
        : { type: 'paragraph' };
}

function blockNodesFromPlainText(text: string): JSONContent[] {
    const lines = text.split('\n');
    const nodes: JSONContent[] = [];

    let quoteBuffer: string[] = [];
    let bulletBuffer: string[] = [];
    let orderedBuffer: string[] = [];

    const flushQuote = () => {
        if (quoteBuffer.length === 0) {
            return;
        }

        nodes.push({
            type: 'blockquote',
            content: quoteBuffer.map((quoteLine) => paragraphFrom(quoteLine)),
        });
        quoteBuffer = [];
    };

    const flushBullets = () => {
        if (bulletBuffer.length === 0) {
            return;
        }

        nodes.push({
            type: 'bulletList',
            content: bulletBuffer.map((item) => ({
                type: 'listItem',
                content: [paragraphFrom(item)],
            })),
        });
        bulletBuffer = [];
    };

    const flushOrdered = () => {
        if (orderedBuffer.length === 0) {
            return;
        }

        nodes.push({
            type: 'orderedList',
            content: orderedBuffer.map((item) => ({
                type: 'listItem',
                content: [paragraphFrom(item)],
            })),
        });
        orderedBuffer = [];
    };

    const flushAll = () => {
        flushQuote();
        flushBullets();
        flushOrdered();
    };

    for (const line of lines) {
        const orderedMatch = line.match(/^\d+\.\s(.*)$/);

        if (line.startsWith('> ')) {
            flushBullets();
            flushOrdered();
            quoteBuffer.push(line.slice(2));
        } else if (line.startsWith('- ')) {
            flushQuote();
            flushOrdered();
            bulletBuffer.push(line.slice(2));
        } else if (orderedMatch) {
            flushQuote();
            flushBullets();
            orderedBuffer.push(orderedMatch[1]);
        } else {
            flushAll();
            nodes.push(paragraphFrom(line));
        }
    }

    flushAll();

    return nodes;
}

/** Convierte el markdown-ligero guardado de un mensaje en un doc Tiptap
 *  listo para `editor.commands.setContent(...)`. */
export function markdownToEditorDoc(body: string): JSONContent {
    const nodes: JSONContent[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    CODE_FENCE_RE.lastIndex = 0;

    while ((match = CODE_FENCE_RE.exec(body)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(
                ...blockNodesFromPlainText(body.slice(lastIndex, match.index)),
            );
        }

        const [, language, code] = match;

        nodes.push({
            type: 'codeBlock',
            attrs: { language: language || null },
            content:
                code.length > 0
                    ? [{ type: 'text', text: code.replace(/\n$/, '') }]
                    : [],
        });

        lastIndex = CODE_FENCE_RE.lastIndex;
    }

    if (lastIndex < body.length) {
        nodes.push(...blockNodesFromPlainText(body.slice(lastIndex)));
    }

    return {
        type: 'doc',
        content: nodes.length > 0 ? nodes : [{ type: 'paragraph' }],
    };
}
