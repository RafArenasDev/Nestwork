import { router, usePage } from '@inertiajs/react';
import { Bell, Palette, ShieldCheck, ShieldEllipsis } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import {
    useCustomization,
    type MessageDensity,
    type UiScale,
} from '@/hooks/use-customization';
import {
    playNotificationSound,
    SOUND_OPTIONS,
    useNotificationPreferences,
} from '@/hooks/use-notification-preferences';
import { usePrivacyPreferences } from '@/hooks/use-privacy-preferences';
import { COLOR_PRESETS } from '@/lib/color-presets';
import { cn } from '@/lib/utils';
import { destroy as deleteAccount } from '@/routes/profile';
import { update as updatePreferences } from '@/routes/user-preferences';
import { logoutOtherDevices } from '@/routes/user-security';

type Tab = 'appearance' | 'notifications' | 'privacy' | 'security';

const TABS: { key: Tab; label: string; icon: typeof Bell }[] = [
    { key: 'appearance', label: 'Apariencia', icon: Palette },
    { key: 'notifications', label: 'Notificaciones', icon: Bell },
    { key: 'privacy', label: 'Privacidad', icon: ShieldEllipsis },
    { key: 'security', label: 'Seguridad', icon: ShieldCheck },
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

function NotificationToggleRow({
    label,
    description,
    checked,
    onChange,
    disabled,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5">
            <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
            </div>
            <Switch
                checked={checked}
                onCheckedChange={onChange}
                disabled={disabled}
            />
        </div>
    );
}

function NotificationsTab() {
    const { desktopEnabled, soundEnabled, sound, showPreview, update } =
        useNotificationPreferences();
    const [permission, setPermission] = useState<
        NotificationPermission | 'unsupported'
    >(
        typeof Notification === 'undefined'
            ? 'unsupported'
            : Notification.permission,
    );

    const handleDesktopToggle = async (checked: boolean) => {
        if (!checked) {
            update({ desktopEnabled: false });

            return;
        }

        if (permission === 'unsupported') {
            return;
        }

        if (permission === 'granted') {
            update({ desktopEnabled: true });

            return;
        }

        const result = await Notification.requestPermission();
        setPermission(result);
        update({ desktopEnabled: result === 'granted' });
    };

    return (
        <div className="flex flex-col divide-y divide-[var(--border)]/50">
            <NotificationToggleRow
                label="Notificaciones de escritorio"
                description={
                    permission === 'denied'
                        ? 'Bloqueadas por el navegador — habilítalas en los ajustes del sitio.'
                        : permission === 'unsupported'
                          ? 'Tu navegador no soporta notificaciones de escritorio.'
                          : 'Avisa cuando llega un mensaje y esta pestaña no está a la vista.'
                }
                checked={desktopEnabled && permission === 'granted'}
                onChange={handleDesktopToggle}
                disabled={
                    permission === 'denied' || permission === 'unsupported'
                }
            />
            <NotificationToggleRow
                label="Mostrar vista previa"
                description="Incluye el texto del mensaje en la notificación, no sólo el nombre."
                checked={showPreview}
                onChange={(checked) => update({ showPreview: checked })}
            />
            <NotificationToggleRow
                label="Sonido"
                description="Un tono corto al recibir un mensaje nuevo."
                checked={soundEnabled}
                onChange={(checked) => update({ soundEnabled: checked })}
            />
            <div className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                    <p className="text-sm font-medium">Tono</p>
                    <p className="text-muted-foreground text-xs">
                        Cuál sonido usar.
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Select
                        value={sound}
                        disabled={!soundEnabled}
                        onValueChange={(value) =>
                            update({ sound: value as typeof sound })
                        }
                    >
                        <SelectTrigger size="sm" className="w-32 rounded-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SOUND_OPTIONS.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <button
                        type="button"
                        disabled={!soundEnabled}
                        onClick={() => playNotificationSound(sound)}
                        className="border-border/60 hover:bg-foreground/5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                    >
                        Probar
                    </button>
                </div>
            </div>
        </div>
    );
}

function PrivacyTab() {
    const page = usePage();
    const auth = page.props.auth;
    const { showTypingIndicator, update } = usePrivacyPreferences();

    return (
        <div className="flex flex-col divide-y divide-[var(--border)]/50">
            <NotificationToggleRow
                label="Confirmación de lectura"
                description="Deja que los demás vean cuándo leíste sus mensajes. Si la apagas, tampoco ves la de ellos."
                checked={auth.user.read_receipts_enabled}
                onChange={(checked) =>
                    router.patch(
                        updatePreferences().url,
                        { read_receipts_enabled: checked },
                        { preserveScroll: true },
                    )
                }
            />
            <NotificationToggleRow
                label="Mostrar “escribiendo…”"
                description="Avisa a los demás en tiempo real cuando estás escribiendo un mensaje."
                checked={showTypingIndicator}
                onChange={(checked) => update({ showTypingIndicator: checked })}
            />
        </div>
    );
}

function SecurityTab() {
    const [loggingOut, setLoggingOut] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                    <p className="text-sm font-medium">
                        Cerrar sesión en todos los dispositivos
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Esta pestaña sigue activa; el resto se desconecta.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loggingOut}
                    onClick={() => {
                        setLoggingOut(true);
                        router.delete(logoutOtherDevices().url, {
                            preserveScroll: true,
                            onFinish: () => setLoggingOut(false),
                        });
                    }}
                >
                    {loggingOut ? 'Cerrando…' : 'Cerrar sesiones'}
                </Button>
            </div>

            <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-3 rounded-xl border p-4">
                <div>
                    <p className="text-destructive text-sm font-medium">
                        Eliminar cuenta
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Borra tu cuenta y todo lo asociado a ella. No se puede
                        deshacer.
                    </p>
                </div>
                {confirmingDelete ? (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deleting}
                            onClick={() => {
                                setDeleting(true);
                                router.delete(deleteAccount().url, {
                                    onFinish: () => setDeleting(false),
                                });
                            }}
                        >
                            {deleting
                                ? 'Eliminando…'
                                : 'Sí, eliminar mi cuenta'}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingDelete(false)}
                        >
                            Cancelar
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="w-fit"
                        onClick={() => setConfirmingDelete(true)}
                    >
                        Eliminar cuenta
                    </Button>
                )}
            </div>
        </div>
    );
}

export function SettingsModal({
    open,
    onOpenChange,
    initialTab = 'appearance',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialTab?: Tab;
}) {
    const [tab, setTab] = useState<Tab>(initialTab);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next);

                if (next) {
                    setTab(initialTab);
                }
            }}
        >
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

                {/* pt-11: el botón de cerrar del Dialog (top-4 right-4,
                    ver ui/dialog.tsx) flota sobre ESTE panel — sin este
                    espacio, cualquier control pegado arriba (el select
                    de tono, un switch) quedaba debajo/tapado por la X. */}
                <div className="min-w-0 flex-1 overflow-y-auto px-6 pt-11 pb-6">
                    {tab === 'appearance' && <AppearanceTab />}
                    {tab === 'notifications' && <NotificationsTab />}
                    {tab === 'privacy' && <PrivacyTab />}
                    {tab === 'security' && <SecurityTab />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
