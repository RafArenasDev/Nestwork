import {
    NodeViewContent,
    NodeViewWrapper,
    type ReactNodeViewProps,
} from '@tiptap/react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AUTO_DETECT,
    codeLanguageFor,
    detectLanguage,
    SELECTABLE_LANGUAGES,
} from '@/lib/code-languages';

/** Node view de React para el bloque de código del composer — el
 *  selector de lenguaje vive DENTRO del propio bloque (esquina
 *  superior), no como un botón más en la toolbar principal (pedido
 *  explícito de la spec de composer): el usuario escribe el código
 *  primero y recién ahí elige el lenguaje para el resaltado. Sin
 *  elegir nada (AUTO_DETECT), CodeBlockLowlight ya resalta solo vía
 *  `lowlight.highlightAuto` — pedido explícito: no obligar a un junior
 *  a saber de antemano qué lenguaje/sintaxis está pegando. El selector
 *  queda para corregir un auto-detect equivocado o para casos que la
 *  gramática no distingue (jsx/tsx comparten resaltado con js/ts). */
export function ComposerCodeBlock({
    node,
    updateAttributes,
}: ReactNodeViewProps) {
    const chosenLanguage = node.attrs.language as string | null;
    const language = chosenLanguage ?? AUTO_DETECT;

    // Pedido explícito: nunca mostrar el texto genérico "Detectar
    // automáticamente" en la esquina — en blanco hasta que haya
    // suficiente código, y a partir de ahí el nombre real del lenguaje
    // detectado (mismo lowlight que ya resalta el bloque, así el
    // rótulo nunca queda desincronizado del color que se ve).
    const detectedExtension = chosenLanguage
        ? null
        : (detectLanguage(node.textContent)?.language.extension ?? null);
    const triggerLabel = chosenLanguage
        ? codeLanguageFor(chosenLanguage).label
        : detectedExtension;

    return (
        <NodeViewWrapper className="bg-foreground/[0.04] border-foreground/10 relative my-1 overflow-hidden rounded-lg border">
            <div
                className="border-foreground/10 flex justify-end border-b px-2 py-1"
                // El editor no debe perder el cursor del código al
                // tocar el selector — mismo motivo que onMouseDown en
                // los botones de la toolbar principal.
                contentEditable={false}
            >
                <Select
                    value={language}
                    onValueChange={(value) =>
                        updateAttributes({
                            language: value === AUTO_DETECT ? null : value,
                        })
                    }
                >
                    <SelectTrigger
                        size="sm"
                        className="h-6 gap-1 border-none bg-transparent px-2 text-[11px] shadow-none"
                    >
                        <SelectValue placeholder="">{triggerLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={AUTO_DETECT}>
                            Detectar automáticamente
                        </SelectItem>
                        {SELECTABLE_LANGUAGES.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {/* NodeViewContent sólo tipa `as` como "div" en esta
                versión de Tiptap — el <pre> de afuera ya alcanza para
                que se vea/comporte como código, no hace falta forzar
                un <code> semántico adentro. */}
            <pre className="overflow-x-auto px-3 py-2 whitespace-pre">
                <NodeViewContent className="font-mono text-[13px]" />
            </pre>
        </NodeViewWrapper>
    );
}
