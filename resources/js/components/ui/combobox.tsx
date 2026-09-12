import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type ComboboxOption = {
    value: string;
    label: string;
    /** Emoji (ej. banderas de idioma) — se ignora si `iconUrl` viene. */
    icon?: string;
    /** Imagen real (ej. bandera de país vía flagcdn/wikimedia) — más
     *  confiable que el emoji, que en Windows se ve como texto plano. */
    iconUrl?: string;
};

function OptionIcon({ option }: { option: ComboboxOption }) {
    if (option.iconUrl) {
        return (
            <img
                src={option.iconUrl}
                alt=""
                className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover"
            />
        );
    }

    if (option.icon) {
        return <span>{option.icon}</span>;
    }

    return null;
}

type ComboboxProps = {
    options: ComboboxOption[];
    value: string | null;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyLabel?: string;
    triggerId?: string;
};

/** Combobox liviano (Popover + filtro) — mismo espíritu que el patrón
 *  shadcn/ui (Popover + Command), sin sumar `cmdk` como dependencia
 *  nueva ya que el filtrado acá es simple (una sola lista plana). */
export function Combobox({
    options,
    value,
    onChange,
    placeholder = 'Selecciona una opción...',
    searchPlaceholder = 'Buscar...',
    emptyLabel = 'Sin resultados.',
    triggerId,
}: ComboboxProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = options.find((option) => option.value === value);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();

        if (!needle) {
            return options;
        }

        return options.filter((option) =>
            option.label.toLowerCase().includes(needle),
        );
    }, [options, query]);

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setQuery('');
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    id={triggerId}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-11 w-full justify-between rounded-full px-4 font-normal"
                >
                    <span className="flex min-w-0 items-center gap-2 truncate">
                        {selected ? (
                            <>
                                <OptionIcon option={selected} />
                                {selected.label}
                            </>
                        ) : (
                            <span className="text-muted-foreground">
                                {placeholder}
                            </span>
                        )}
                    </span>
                    {selected ? (
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label="Limpiar selección"
                            onClick={(event) => {
                                event.stopPropagation();
                                onChange('');
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.stopPropagation();
                                    event.preventDefault();
                                    onChange('');
                                }
                            }}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                            <X className="size-4" />
                        </span>
                    ) : (
                        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                <div className="border-b p-2">
                    <input
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full bg-transparent px-2 py-1 text-sm outline-none"
                    />
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                    {filtered.length === 0 && (
                        <p className="text-muted-foreground px-3 py-2 text-sm">
                            {emptyLabel}
                        </p>
                    )}
                    {filtered.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                                setQuery('');
                            }}
                            className={cn(
                                'hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                            )}
                        >
                            <OptionIcon option={option} />
                            <span className="flex-1 truncate">
                                {option.label}
                            </span>
                            {option.value === value && (
                                <Check className="size-4 shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
