import type { Root, RootContent } from 'hast';
import { Check, Copy } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
    codeLanguageFor,
    detectLanguage,
    lowlight,
} from '@/lib/code-languages';

/** hast (el árbol que devuelve lowlight) -> nodos de React a mano —
 *  mismo criterio de seguridad que renderInlineFormatting en
 *  pages/messages/index.tsx: nunca dangerouslySetInnerHTML, el texto
 *  siempre pasa por el escapado normal de React. */
function hastToReact(node: RootContent, key: string): ReactNode {
    if (node.type === 'text') {
        return node.value;
    }

    if (node.type !== 'element') {
        return null;
    }

    const className = Array.isArray(node.properties?.className)
        ? node.properties.className.join(' ')
        : undefined;

    return (
        <span key={key} className={className}>
            {node.children.map((child, index) =>
                hastToReact(child, `${key}-${index}`),
            )}
        </span>
    );
}

/** Bloque de código de un mensaje YA enviado — mismo lenguaje visual
 *  que ChatGPT/Claude/Grok/DeepSeek: barra con la extensión del
 *  lenguaje + botón "Copiar", cuerpo con resaltado de sintaxis real y
 *  la indentación exacta que se escribió (white-space: pre, sin
 *  reformatear nada). El botón copia el código plano (sin los spans de
 *  color), preservando tabs/espacios tal cual se pegó. */
export function MessageCodeBlock({
    code,
    language,
}: {
    code: string;
    /** '' cuando el remitente no eligió nada en el selector (ver
     *  AUTO_DETECT/serializeBlock) — dispara detectLanguage en vez de
     *  forzarle al lector a haber sabido el lenguaje de antemano. */
    language: string;
}) {
    const [copied, setCopied] = useState(false);

    let meta = codeLanguageFor(language);
    let tree: Root | null = null;

    try {
        if (!language || language === 'plaintext') {
            const detected = detectLanguage(code);

            if (detected) {
                meta = detected.language;
                tree = detected.tree;
            }
        } else {
            tree = lowlight.highlight(meta.highlightAs, code) as Root;
        }
    } catch {
        // Lenguaje no registrado o código que rompe el parser del
        // grammar — nunca debe tumbar el render del mensaje, sólo se
        // pierde el resaltado de color para ese bloque puntual.
        tree = null;
    }

    const handleCopy = () => {
        void navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        // min-w-0 + w-full: sin esto, un bloque de código con líneas
        // largas sin espacios vuelve a abrir el mismo bug que ya
        // cazaron con el `display:table` interno de ScrollArea (ver el
        // comentario en pages/messages/index.tsx junto a max-w-[420px])
        // — el `overflow-x-auto` de abajo no alcanza a frenarlo si este
        // contenedor no tiene un ancho definido propio, y termina
        // empujando la burbuja entera mucho más ancha que el resto del
        // chat en vez de scrollear internamente.
        <div className="border-foreground/10 bg-foreground/[0.04] my-1 w-full min-w-0 overflow-hidden rounded-lg border text-[13px]">
            <div className="border-foreground/10 flex items-center justify-between border-b px-3 py-1.5">
                <span className="font-mono text-[11px] opacity-60">
                    {meta.extension}
                </span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="hover:bg-foreground/10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] opacity-70 transition-opacity hover:opacity-100"
                >
                    {copied ? (
                        <>
                            <Check className="size-3" />
                            Copiado
                        </>
                    ) : (
                        <>
                            <Copy className="size-3" />
                            Copiar
                        </>
                    )}
                </button>
            </div>
            <pre className="w-full min-w-0 overflow-x-auto px-3 py-2 whitespace-pre">
                <code className="font-mono">
                    {tree
                        ? tree.children.map((child, index) =>
                              hastToReact(child, `line-${index}`),
                          )
                        : code}
                </code>
            </pre>
        </div>
    );
}
