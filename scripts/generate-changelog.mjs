// Parsea CHANGELOG.md y genera resources/js/version.ts — corre antes de
// `npm run build`/`npm run dev` (ver "prebuild"/"predev" en package.json).
// Mismo script que Inventory-Manager: cero llamadas de red en runtime, el
// historial de versiones queda embebido en el bundle.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const outPath = path.join(rootDir, 'resources/js/version.ts');

const raw = readFileSync(changelogPath, 'utf-8');

const HEADER_RE = /^## (v\d+\.\d+\.\d+) - (\d{4}-\d{2}-\d{2})\s*$/gm;

const entries = [];
const matches = [...raw.matchAll(HEADER_RE)];

matches.forEach((match, index) => {
    const [, version, date] = match;
    const start = match.index + match[0].length;
    const end =
        index + 1 < matches.length ? matches[index + 1].index : raw.length;
    const body = raw.slice(start, end).trim();

    // El resumen es todo lo que va ANTES de la primera línea "- " (viñeta);
    // el resto son los puntos de detalle de esa versión.
    const bulletStart = body.search(/^- /m);
    const summaryRaw = bulletStart === -1 ? body : body.slice(0, bulletStart);
    const bulletsRaw = bulletStart === -1 ? '' : body.slice(bulletStart);

    const notes = summaryRaw.trim().replace(/\s+/g, ' ');
    const CATEGORY_RE = /^\*\*(.+?):\*\*\s*/;
    const highlights = bulletsRaw
        .split(/\n(?=- )/)
        .map((line) => line.replace(/^- /, '').trim().replace(/\s+/g, ' '))
        .filter(Boolean)
        .map((text) => {
            const match = text.match(CATEGORY_RE);
            return match
                ? { category: match[1], text: text.slice(match[0].length) }
                : { category: null, text };
        });

    entries.push({ version, date, notes, highlights });
});

if (entries.length === 0) {
    throw new Error(
        'generate-changelog: no se encontró ninguna entrada "## vX.Y.Z - YYYY-MM-DD" en CHANGELOG.md',
    );
}

const [current, ...previous] = entries;

const fileContent = `// GENERADO AUTOMÁTICAMENTE por scripts/generate-changelog.mjs a partir de
// CHANGELOG.md — no editar a mano, los cambios se pierden en el próximo
// \`npm run build\`/\`npm run dev\`. Para agregar una versión, agregar una
// sección nueva arriba del todo en CHANGELOG.md.

export interface ChangelogHighlight {
    category: string | null;
    text: string;
}

export interface ChangelogEntry {
    version: string;
    date: string;
    notes: string;
    highlights: ChangelogHighlight[];
}

export const CURRENT_VERSION: string = ${JSON.stringify(current.version)};

export const CURRENT_VERSION_ENTRY: ChangelogEntry = ${JSON.stringify(current, null, 4)};

export const VERSION_HISTORY: ChangelogEntry[] = ${JSON.stringify(previous, null, 4)};
`;

writeFileSync(outPath, fileContent);

console.log(
    `generate-changelog: ${entries.length} versiones -> resources/js/version.ts (actual: ${current.version})`,
);
