import { router, usePage } from '@inertiajs/react';
import { Palette, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { ReactionPickerButton } from '@/components/reaction-picker';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import {
    useCustomization,
    type MessageDensity,
    type UiScale,
} from '@/hooks/use-customization';
import { COLOR_PRESETS } from '@/lib/color-presets';
import { cn } from '@/lib/utils';
import {
    update as updateStatus,
    destroy as clearStatus,
} from '@/routes/user-status';

type Tab = 'status' | 'appearance';

const TABS: { key: Tab; label: string; icon: typeof Sparkles }[] = [
    { key: 'status', label: 'Estado', icon: Sparkles },
    { key: 'appearance', label: 'Apariencia', icon: Palette },
];

const THEME_TILES: { value: Appearance; label: string }[] = [
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Oscuro' },
    { value: 'system', label: 'Automático' },
];

const DENSITY_OPTIONS: { value: MessageDensity; label: string }[] = [
    { value: 'minimal', label: 'Minimalista' },
    { value: 'comfortable', label: 'Cómoda' },
    { value: 'compact', label: 'Compacta' },
];

const UI_SCALE_OPTIONS: { value: UiScale; label: string }[] = [
    { value: 'small', label: 'Pequeño' },
    { value: 'medium', label: 'Mediano' },
    { value: 'large', label: 'Grande' },
];

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

function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div className="bg-foreground/5 inline-flex w-full gap-1 rounded-full p-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'flex-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-150',
                        value === option.value
                            ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.4)]'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

/** Selector de tema tipo macOS/iOS (System Settings › Appearance): 3
 *  miniaturas con vista previa real, no botones de solo texto. */
function ThemePicker({
    value,
    onChange,
}: {
    value: Appearance;
    onChange: (value: Appearance) => void;
}) {
    return (
        <div className="grid grid-cols-3 gap-2.5">
            {THEME_TILES.map((tile) => (
                <button
                    key={tile.value}
                    type="button"
                    onClick={() => onChange(tile.value)}
                    aria-pressed={value === tile.value}
                    className="flex flex-col items-center gap-1.5"
                >
                    <span
                        className={cn(
                            'relative block h-12 w-full overflow-hidden rounded-lg border-2 transition-colors duration-150',
                            value === tile.value
                                ? 'border-[var(--accent-1)]'
                                : 'border-transparent',
                        )}
                    >
                        {tile.value === 'system' ? (
                            <span className="absolute inset-0 flex">
                                <span className="h-full w-1/2 bg-[#f2f3f6]" />
                                <span className="h-full w-1/2 bg-[#15181f]" />
                            </span>
                        ) : (
                            <span
                                className={cn(
                                    'absolute inset-0',
                                    tile.value === 'light'
                                        ? 'bg-[#f2f3f6]'
                                        : 'bg-[#15181f]',
                                )}
                            />
                        )}
                        <span
                            className={cn(
                                'absolute top-1.5 left-1.5 h-[calc(100%-0.75rem)] w-3 rounded-[3px]',
                                tile.value === 'light'
                                    ? 'bg-[#05070c]/85'
                                    : tile.value === 'dark'
                                      ? 'bg-black/60'
                                      : 'bg-[#05070c]/85',
                            )}
                        />
                    </span>
                    <span
                        className={cn(
                            'text-xs font-medium',
                            value === tile.value
                                ? 'text-foreground'
                                : 'text-muted-foreground',
                        )}
                    >
                        {tile.label}
                    </span>
                </button>
            ))}
        </div>
    );
}

function GlassSlider({
    value,
    onChange,
}: {
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-muted-foreground w-10 text-[11px]">
                Vidrio
            </span>
            <input
                type="range"
                min={0}
                max={100}
                value={Math.round(value * 100)}
                onChange={(event) => onChange(Number(event.target.value) / 100)}
                className="glass-slider flex-1"
                style={
                    {
                        '--slider-fill': `${Math.round(value * 100)}%`,
                    } as React.CSSProperties
                }
                aria-label="Intensidad del glass"
            />
            <span className="text-muted-foreground w-10 text-right text-[11px]">
                Opaco
            </span>
        </div>
    );
}

function ColorPresetGrid({
    value,
    onChange,
    allowNone,
    columns = 6,
}: {
    value: string;
    onChange: (key: string) => void;
    allowNone?: boolean;
    columns?: number;
}) {
    return (
        <div
            className="grid gap-2"
            style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
        >
            {allowNone && (
                <button
                    type="button"
                    aria-label="Ninguno"
                    aria-pressed={value === 'none'}
                    onClick={() => onChange('none')}
                    className={cn(
                        'border-border/60 bg-foreground/5 text-muted-foreground relative flex h-9 items-center justify-center rounded-lg border-2 text-[9px] font-semibold transition-[border-color,transform] duration-150 active:scale-95',
                        value === 'none'
                            ? 'border-[var(--accent-1)]'
                            : 'border-transparent',
                    )}
                >
                    Ninguno
                </button>
            )}
            {COLOR_PRESETS.map((preset) => (
                <button
                    key={preset.key}
                    type="button"
                    aria-label={preset.label}
                    aria-pressed={value === preset.key}
                    onClick={() => onChange(preset.key)}
                    className={cn(
                        'relative h-9 rounded-lg border-2 transition-[border-color,transform] duration-150 active:scale-95',
                        value === preset.key
                            ? 'border-[var(--accent-1)]'
                            : 'border-transparent',
                    )}
                    style={{ background: preset.image }}
                    title={preset.label}
                />
            ))}
        </div>
    );
}

function StatusTab() {
    const page = usePage();
    const auth = page.props.auth;
    const statusPresets = page.props.statusPresets;

    const [statusText, setStatusText] = useState(auth.user.status_text ?? '');
    const [statusEmoji, setStatusEmoji] = useState(
        auth.user.status_emoji ?? '💬',
    );
    const [duration, setDuration] = useState('');
    const [customUntil, setCustomUntil] = useState('');

    const hasCustomStatus = Boolean(
        auth.user.status_preset || auth.user.status_text,
    );

    const submitStatus = (
        payload:
            | { preset: string }
            | { emoji: string; text: string; duration_minutes?: number },
    ) => {
        router.patch(updateStatus().url, payload, { preserveScroll: true });
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

        submitStatus({
            emoji: statusEmoji,
            text: statusText.trim(),
            duration_minutes: minutes,
        });
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
                <ReactionPickerButton
                    onPick={setStatusEmoji}
                    side="bottom"
                    align="start"
                    trigger={
                        <button
                            type="button"
                            aria-label="Elegir emoji del estado"
                            className="border-border/60 hover:bg-foreground/5 flex size-11 shrink-0 items-center justify-center rounded-xl border text-lg transition-colors"
                        >
                            {statusEmoji}
                        </button>
                    }
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
                    {statusPresets.map((preset) => (
                        <button
                            key={preset.key}
                            type="button"
                            onClick={() => submitStatus({ preset: preset.key })}
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

function AppearanceTab() {
    const { appearance, updateAppearance } = useAppearance();
    const {
        sidebarColor,
        bubbleColor,
        glassIntensity,
        density,
        uiScale,
        update,
    } = useCustomization();

    return (
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="col-span-2">
                <span className="text-muted-foreground mb-2 block text-xs font-medium">
                    Tema
                </span>
                <ThemePicker value={appearance} onChange={updateAppearance} />
            </div>

            <div>
                <span className="text-muted-foreground mb-2 block text-xs font-medium">
                    Color de la sidebar
                </span>
                <ColorPresetGrid
                    value={sidebarColor}
                    onChange={(key) => update({ sidebarColor: key })}
                    allowNone
                    columns={5}
                />
            </div>

            <div>
                <span className="text-muted-foreground mb-2 block text-xs font-medium">
                    Color de tus burbujas
                </span>
                <ColorPresetGrid
                    value={bubbleColor}
                    onChange={(key) => update({ bubbleColor: key })}
                    columns={4}
                />
            </div>

            <div>
                <span className="text-muted-foreground mb-2 block text-xs font-medium">
                    Intensidad del glass
                </span>
                <GlassSlider
                    value={glassIntensity}
                    onChange={(value) => update({ glassIntensity: value })}
                />
            </div>

            <div>
                <span className="text-muted-foreground mb-2 block text-xs font-medium">
                    Tamaño de la interfaz
                </span>
                <SegmentedControl
                    options={UI_SCALE_OPTIONS}
                    value={uiScale}
                    onChange={(value) => update({ uiScale: value })}
                />
            </div>

            <div className="col-span-2">
                <span className="text-muted-foreground mb-2 block text-xs font-medium">
                    Densidad de mensajes
                </span>
                <SegmentedControl
                    options={DENSITY_OPTIONS}
                    value={density}
                    onChange={(value) => update({ density: value })}
                />
            </div>
        </div>
    );
}

export function SettingsModal({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [tab, setTab] = useState<Tab>('status');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[560px] max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl">
                <div className="border-border/40 flex w-44 shrink-0 flex-col gap-1 border-r p-3">
                    <DialogHeader className="mb-2 px-1">
                        <DialogTitle className="text-base font-semibold tracking-tight">
                            Ajustes
                        </DialogTitle>
                    </DialogHeader>
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={cn(
                                'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors',
                                tab === key
                                    ? 'bg-foreground/8 text-foreground'
                                    : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                            )}
                        >
                            <Icon className="size-4" />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="min-w-0 flex-1 overflow-y-auto p-6">
                    {tab === 'status' ? <StatusTab /> : <AppearanceTab />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
