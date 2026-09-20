import { router, usePage } from '@inertiajs/react';
import EmojiPicker, { Theme as EmojiPickerTheme } from 'emoji-picker-react';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useAppearance } from '@/hooks/use-appearance';
import { EMOJI_CATEGORIES } from '@/components/reaction-picker';
import { cn } from '@/lib/utils';
import {
    update as updateStatus,
    destroy as clearStatus,
} from '@/routes/user-status';
import { update as updatePresence } from '@/routes/user-presence';
import type { StatusPresetOption } from '@/types/status';

type Presence = 'available' | 'away' | 'busy' | 'dnd';

const PRESENCE_DOT_CLASS: Record<Presence, string> = {
    available: 'bg-emerald-500',
    away: 'bg-amber-500',
    busy: 'bg-red-500',
    dnd: 'bg-red-500',
};

const DURATION_OPTIONS: ComboboxOption[] = [
    { value: '', label: 'No vence' },
    { value: '15', label: '15 minutos' },
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' },
    { value: '120', label: '2 horas' },
    { value: '240', label: '4 horas' },
    { value: 'today', label: 'Hasta hoy a la noche' },
    { value: '1440', label: '1 día' },
    { value: '10080', label: '1 semana' },
    { value: 'custom', label: 'Fecha y hora personalizada…' },
];

function minutesUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(23, 59, 0, 0);

    return Math.max(
        1,
        Math.round((midnight.getTime() - now.getTime()) / 60000),
    );
}

/** Selector de PRESENCIA — lista propia, radio-like, nunca mezclada con
 *  el estado personalizado (pedido explícito: "una cosa es el
 *  disponible/ausente/ocupado/desconectado/sin estado, y otra los
 *  estados con emoji"). "Automático" = sin preset manual, presencia
 *  derivada de la actividad real (last_seen_at). */
export function PresenceMenu({
    presets,
    currentPreset,
}: {
    presets: StatusPresetOption[];
    currentPreset: string | null;
}) {
    const setPreset = (preset: string | null) => {
        router.patch(
            updatePresence().url,
            { preset },
            { preserveScroll: true },
        );
    };

    return (
        <div className="flex flex-col gap-0.5">
            <button
                type="button"
                onClick={() => setPreset(null)}
                className="hover:bg-foreground/5 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
            >
                <span className="border-muted-foreground/50 size-2.5 shrink-0 rounded-full border-2" />
                <span className="flex-1">Automático</span>
                {currentPreset === null && (
                    <Check className="text-muted-foreground size-3.5" />
                )}
            </button>
            {presets.map((preset) => (
                <button
                    key={preset.key}
                    type="button"
                    onClick={() => setPreset(preset.key)}
                    className="hover:bg-foreground/5 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors"
                >
                    <span
                        className={cn(
                            'size-2.5 shrink-0 rounded-full',
                            PRESENCE_DOT_CLASS[preset.key as Presence] ??
                                'bg-zinc-400',
                        )}
                    />
                    <span className="flex-1">{preset.label}</span>
                    {currentPreset === preset.key && (
                        <Check className="text-muted-foreground size-3.5" />
                    )}
                </button>
            ))}
        </div>
    );
}

/** Botón de emoji para el estado PERSONALIZADO: a diferencia de
 *  reaction-picker.tsx (que abre en la tira de 6 rápidas + "más"), acá
 *  el pedido fue explícito — mostrar el panel completo de una, sin un
 *  paso intermedio, porque elegir el emoji de tu estado es la acción
 *  principal del flujo, no un extra. */
function StatusEmojiPickerButton({
    value,
    onPick,
}: {
    value: string;
    onPick: (emoji: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const { resolvedAppearance } = useAppearance();

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label="Elegir emoji del estado"
                    className="border-border/60 hover:bg-foreground/5 flex size-11 shrink-0 items-center justify-center rounded-xl border text-lg transition-colors"
                >
                    {value}
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="start"
                className="z-[60] w-fit border-none bg-transparent p-0 shadow-none"
            >
                <EmojiPicker
                    theme={
                        resolvedAppearance === 'dark'
                            ? EmojiPickerTheme.DARK
                            : EmojiPickerTheme.LIGHT
                    }
                    onEmojiClick={(data) => {
                        onPick(data.emoji);
                        setOpen(false);
                    }}
                    height={380}
                    width={320}
                    searchPlaceHolder="Buscar emoji"
                    categories={EMOJI_CATEGORIES}
                    previewConfig={{ showPreview: false }}
                />
            </PopoverContent>
        </Popover>
    );
}

/** Editor del estado PERSONALIZADO (emoji + texto + vencimiento) —
 *  compartido entre el dropdown del avatar y Ajustes > Estado, misma
 *  UI en los dos lugares. Nunca lee ni escribe presencia. */
export function CustomStatusEditor({
    presets,
    onApplied,
}: {
    presets: StatusPresetOption[];
    onApplied?: () => void;
}) {
    const page = usePage();
    const auth = page.props.auth;

    const [statusText, setStatusText] = useState(auth.user.status_text ?? '');
    const [statusEmoji, setStatusEmoji] = useState(
        auth.user.status_emoji ?? '💬',
    );
    const [duration, setDuration] = useState('');
    const [customUntil, setCustomUntil] = useState('');

    const hasCustomStatus = Boolean(auth.user.status_text);

    const applyPreset = (preset: StatusPresetOption) => {
        router.patch(
            updateStatus().url,
            {
                emoji: preset.emoji,
                text: preset.label,
                duration_minutes: preset.defaultDurationMinutes ?? undefined,
            },
            { preserveScroll: true, onSuccess: onApplied },
        );
    };

    const handleApply = () => {
        let minutes: number | undefined;

        if (duration === 'today') {
            minutes = minutesUntilMidnight();
        } else if (duration === 'custom' && customUntil) {
            const target = new Date(customUntil).getTime();
            minutes = Math.max(1, Math.round((target - Date.now()) / 60000));
        } else if (duration) {
            minutes = Number(duration);
        }

        router.patch(
            updateStatus().url,
            {
                emoji: statusEmoji,
                text: statusText.trim(),
                duration_minutes: minutes,
            },
            { preserveScroll: true, onSuccess: onApplied },
        );
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
                <StatusEmojiPickerButton
                    value={statusEmoji}
                    onPick={setStatusEmoji}
                />
                <input
                    type="text"
                    value={statusText}
                    onChange={(event) => setStatusText(event.target.value)}
                    placeholder="Escribe tu estado…"
                    maxLength={100}
                    className="border-border/60 h-11 flex-1 rounded-xl border bg-transparent px-3 text-sm transition-colors outline-none focus:border-[var(--accent-1)]"
                />
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs font-medium">
                    Vence en
                </span>
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <Combobox
                            options={DURATION_OPTIONS}
                            value={duration}
                            onChange={setDuration}
                            placeholder="No vence"
                        />
                    </div>
                    <button
                        type="button"
                        disabled={!statusText.trim()}
                        onClick={handleApply}
                        className="bg-foreground text-background h-11 shrink-0 rounded-full px-5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-40"
                    >
                        Aplicar
                    </button>
                </div>
                {duration === 'custom' && (
                    <input
                        type="datetime-local"
                        value={customUntil}
                        onChange={(event) => setCustomUntil(event.target.value)}
                        className="border-border/60 h-10 rounded-xl border bg-transparent px-3 text-sm transition-colors outline-none focus:border-[var(--accent-1)]"
                    />
                )}
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs font-medium">
                    Rápido
                </span>
                <div className="flex flex-wrap gap-1.5">
                    {presets.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="border-border/60 hover:bg-foreground/5 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
                        >
                            <span>{preset.emoji}</span>
                            {preset.label}
                        </button>
                    ))}
                    {hasCustomStatus && (
                        <button
                            type="button"
                            onClick={() =>
                                router.delete(clearStatus().url, {
                                    preserveScroll: true,
                                    onSuccess: onApplied,
                                })
                            }
                            className="text-muted-foreground hover:bg-foreground/5 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-colors"
                        >
                            <X className="size-3" />
                            Borrar estado
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
