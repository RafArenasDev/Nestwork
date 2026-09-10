import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAppearance } from '@/hooks/use-appearance';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
    className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { appearance, updateAppearance } = useAppearance();
    const { t } = useLocale();

    // El switch es binario (claro/oscuro), sin "sistema" — el estado inicial
    // se lee directo del DOM (ya resuelto por initializeTheme() al arrancar
    // la app) para no parpadear mientras el hook resuelve 'system' desde
    // localStorage.
    const [isLight, setIsLight] = useState(
        () =>
            typeof document !== 'undefined' &&
            !document.documentElement.classList.contains('dark'),
    );

    useEffect(() => {
        if (appearance === 'system') return;
        setIsLight(appearance === 'light');
    }, [appearance]);

    const handleChange = (checked: boolean) => {
        setIsLight(checked);
        updateAppearance(checked ? 'light' : 'dark');
    };

    return (
        <SwitchPrimitive.Root
            checked={isLight}
            onCheckedChange={handleChange}
            aria-label={isLight ? t.theme.switchToDark : t.theme.switchToLight}
            className={cn(
                'peer focus-visible:ring-ring/50 inline-flex h-5 w-10 shrink-0 items-center rounded-full border-2 shadow-inner transition-colors duration-300 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                'data-[state=unchecked]:border-white/30 data-[state=unchecked]:bg-zinc-800',
                'data-[state=checked]:border-black/25 data-[state=checked]:bg-amber-400',
                className,
            )}
        >
            <SwitchPrimitive.Thumb
                className={cn(
                    'pointer-events-none flex size-3.5 items-center justify-center rounded-full bg-white shadow-md ring-0 transition-transform duration-300',
                    'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
                )}
            >
                {isLight ? (
                    <Sun
                        className="size-2.5 text-amber-500"
                        strokeWidth={2.5}
                    />
                ) : (
                    <Moon
                        className="size-2.5 text-slate-700"
                        strokeWidth={2.5}
                    />
                )}
            </SwitchPrimitive.Thumb>
        </SwitchPrimitive.Root>
    );
}
