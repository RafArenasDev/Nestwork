import {
    CheckCircle2,
    Palette,
    Scale,
    ScrollText,
    Shield,
    Sparkles,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CURRENT_VERSION_ENTRY,
    VERSION_HISTORY,
    type ChangelogEntry,
} from '@/version';

interface WhatsNewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ALL_VERSIONS: ChangelogEntry[] = [
    CURRENT_VERSION_ENTRY,
    ...VERSION_HISTORY,
];

// Un ícono y un color fijo por categoría — mismo sistema que
// Inventory-Manager (ver CHANGELOG.md para la lista de categorías válidas).
const CATEGORY_META: Record<
    string,
    { icon: LucideIcon; chip: string; badge: string }
> = {
    'Nueva función': {
        icon: Sparkles,
        chip: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    },
    Seguridad: {
        icon: Shield,
        chip: 'bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-400',
        badge: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
    },
    Auditoría: {
        icon: ScrollText,
        chip: 'bg-violet-100 text-violet-600 dark:bg-violet-950/70 dark:text-violet-400',
        badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
    },
    Validación: {
        icon: CheckCircle2,
        chip: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    },
    Legal: {
        icon: Scale,
        chip: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400',
        badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    },
    Diseño: {
        icon: Palette,
        chip: 'bg-pink-100 text-pink-600 dark:bg-pink-950/70 dark:text-pink-400',
        badge: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300',
    },
    Corrección: {
        icon: Wrench,
        chip: 'bg-orange-100 text-orange-600 dark:bg-orange-950/70 dark:text-orange-400',
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
    },
};
const DEFAULT_CATEGORY_META = {
    icon: Sparkles,
    chip: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

/**
 * Muestra el detalle completo de UNA versión a la vez (la más reciente por
 * defecto), elegida en el selector "Versión". Contenido generado en build
 * time desde CHANGELOG.md — ver scripts/generate-changelog.mjs. Mismo
 * sistema que Inventory-Manager, usando el componente Select ya existente
 * en vez de portar su Combobox propio.
 */
export default function WhatsNewModal({
    open,
    onOpenChange,
}: WhatsNewModalProps) {
    const [selectedVersion, setSelectedVersion] = useState<string>(
        CURRENT_VERSION_ENTRY.version,
    );
    const entry =
        ALL_VERSIONS.find((v) => v.version === selectedVersion) ??
        CURRENT_VERSION_ENTRY;
    const isLatest = entry.version === CURRENT_VERSION_ENTRY.version;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[88vh] w-full flex-col overflow-hidden sm:max-w-2xl">
                <div className="flex shrink-0 items-center justify-between gap-4 pr-10">
                    <DialogTitle>Novedades</DialogTitle>
                    <div className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span>Versión</span>
                        <Select
                            value={selectedVersion}
                            onValueChange={setSelectedVersion}
                        >
                            <SelectTrigger
                                size="sm"
                                className="h-7 w-28 text-xs"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ALL_VERSIONS.map((v) => (
                                    <SelectItem
                                        key={v.version}
                                        value={v.version}
                                    >
                                        {v.version}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="-mx-6 flex-1 overflow-y-auto px-6 pb-2">
                    <div className="mb-4 flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {entry.version}
                        </h3>
                        {isLatest && (
                            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                                Actual
                            </span>
                        )}
                        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                            {entry.date}
                        </span>
                    </div>

                    <p className="mb-5 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
                        {entry.notes}
                    </p>

                    {entry.highlights.length > 0 ? (
                        <ul className="space-y-3 pb-4">
                            {entry.highlights.map((item, i) => {
                                const meta =
                                    (item.category &&
                                        CATEGORY_META[item.category]) ||
                                    DEFAULT_CATEGORY_META;
                                const Icon = meta.icon;
                                return (
                                    <li
                                        key={i}
                                        className="flex items-start gap-3.5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900/60"
                                    >
                                        <span
                                            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${meta.chip}`}
                                        >
                                            <Icon className="size-4" />
                                        </span>
                                        <div className="space-y-1.5">
                                            {item.category && (
                                                <span
                                                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
                                                >
                                                    {item.category}
                                                </span>
                                            )}
                                            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                                {item.text}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="pb-4 text-sm text-gray-500 italic dark:text-gray-400">
                            Sin detalle adicional para esta versión.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
