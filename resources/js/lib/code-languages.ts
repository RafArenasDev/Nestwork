import type { Root } from 'hast';
import { createLowlight } from 'lowlight';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';

/**
 * Un solo lugar para "qué lenguajes soporta el bloque de código" — lo
 * usan tanto el selector del composer (Tiptap) como el resaltado al
 * renderizar el mensaje ya enviado, para que nunca queden
 * desincronizados. Sólo los lenguajes que un equipo de devs usa de
 * verdad (pedido explícito) — no los ~190 de highlight.js completo,
 * eso infla el bundle sin necesidad.
 *
 * jsx/tsx no tienen gramática propia en highlight.js: se resaltan con
 * la de javascript/typescript (`highlightAs`) pero conservan su propia
 * etiqueta (.jsx/.tsx) para el usuario — más preciso que forzarlos a
 * mostrarse como "JavaScript"/"TypeScript".
 */
export type CodeLanguage = {
    value: string;
    label: string;
    /** Extensión de archivo a mostrar en el header del bloque, estilo
     *  ChatGPT/Claude ("plaintext" no lleva punto). */
    extension: string;
    highlightAs: string;
};

export const CODE_LANGUAGES: CodeLanguage[] = [
    {
        value: 'javascript',
        label: 'JavaScript',
        extension: '.js',
        highlightAs: 'javascript',
    },
    {
        value: 'typescript',
        label: 'TypeScript',
        extension: '.ts',
        highlightAs: 'typescript',
    },
    {
        value: 'jsx',
        label: 'JSX',
        extension: '.jsx',
        highlightAs: 'javascript',
    },
    {
        value: 'tsx',
        label: 'TSX',
        extension: '.tsx',
        highlightAs: 'typescript',
    },
    { value: 'php', label: 'PHP', extension: '.php', highlightAs: 'php' },
    {
        value: 'python',
        label: 'Python',
        extension: '.py',
        highlightAs: 'python',
    },
    { value: 'json', label: 'JSON', extension: '.json', highlightAs: 'json' },
    { value: 'bash', label: 'Bash', extension: '.sh', highlightAs: 'bash' },
    { value: 'sql', label: 'SQL', extension: '.sql', highlightAs: 'sql' },
    { value: 'css', label: 'CSS', extension: '.css', highlightAs: 'css' },
    { value: 'html', label: 'HTML', extension: '.html', highlightAs: 'html' },
    {
        value: 'plaintext',
        label: 'Texto plano',
        extension: 'texto',
        highlightAs: 'plaintext',
    },
];

export const DEFAULT_CODE_LANGUAGE = 'plaintext';

/** Sentinel de UI (nunca se guarda como `language` real): "no elegido
 *  todavía" en el selector del composer. Pedido explícito — no se
 *  puede exigirle a un junior que sepa/recuerde el lenguaje exacto
 *  antes de poder pegar el código, así que el default es detectar
 *  solo; el selector queda para corregir cuando el auto-detect le
 *  pifia o para distinguir casos que la gramática no puede (jsx/tsx
 *  comparten resaltado con js/ts). */
export const AUTO_DETECT = 'auto';

/** Lenguajes elegibles a mano en el selector — mismo orden que
 *  CODE_LANGUAGES menos "Texto plano" (ese caso ya lo cubre el
 *  auto-detect con relevancia baja, ver detectLanguage). */
export const SELECTABLE_LANGUAGES = CODE_LANGUAGES.filter(
    (language) => language.value !== 'plaintext',
);

export function codeLanguageFor(
    value: string | null | undefined,
): CodeLanguage {
    return (
        CODE_LANGUAGES.find((language) => language.value === value) ??
        CODE_LANGUAGES.find(
            (language) => language.value === DEFAULT_CODE_LANGUAGE,
        )!
    );
}

export const lowlight = createLowlight();

lowlight.register({
    javascript,
    typescript,
    php,
    python,
    json,
    bash,
    sql,
    css,
    html,
});

/** Debajo de esto, highlightAuto adivinó con tan poca evidencia (texto
 *  corto, plano, sin sintaxis reconocible) que resaltarlo se ve más a
 *  "color al azar" que a resaltado real — mejor mostrarlo sin colorear
 *  que mentir un lenguaje con baja confianza. Umbral empírico de
 *  highlight.js, no un valor documentado con una fórmula exacta. */
const MIN_AUTODETECT_RELEVANCE = 3;

/** Detecta el lenguaje SOLO entre los registrados arriba (pedido
 *  explícito: nada de recorrer los ~190 de highlight.js) — usado
 *  cuando el usuario no eligió nada en el selector, para que un junior
 *  nunca tenga que saber de antemano qué lenguaje es esto. */
export function detectLanguage(
    code: string,
): { language: CodeLanguage; tree: Root } | null {
    try {
        const tree = lowlight.highlightAuto(code, {
            subset: CODE_LANGUAGES.map(
                (language) => language.highlightAs,
            ).filter((value, index, all) => all.indexOf(value) === index),
        }) as Root & { data?: { language?: string; relevance?: number } };

        if (
            !tree.data?.language ||
            (tree.data.relevance ?? 0) < MIN_AUTODETECT_RELEVANCE
        ) {
            return null;
        }

        const language =
            SELECTABLE_LANGUAGES.find(
                (candidate) => candidate.highlightAs === tree.data!.language,
            ) ?? codeLanguageFor(tree.data.language);

        return { language, tree };
    } catch {
        return null;
    }
}
