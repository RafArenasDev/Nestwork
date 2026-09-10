import * as SwitchPrimitive from '@radix-ui/react-switch';

import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

interface LanguageToggleProps {
    className?: string;
}

/**
 * Mismo look & feel que ThemeToggle (switch binario), pero para ES/EN —
 * se queda como switch de dos posiciones mientras solo haya dos idiomas
 * (ver 2.1 de CLAUDE.md: "ES/EN por ahora"); si se suman más, esto pasa
 * a un dropdown como appearance-dropdown en vez de un switch.
 */
export function LanguageToggle({ className }: LanguageToggleProps) {
    const { locale, updateLocale } = useLocale();
    const isSpanish = locale === 'es';

    return (
        <SwitchPrimitive.Root
            checked={isSpanish}
            onCheckedChange={(checked) => updateLocale(checked ? 'es' : 'en')}
            aria-label={isSpanish ? 'Switch to English' : 'Cambiar a español'}
            className={cn(
                'peer focus-visible:ring-ring/50 inline-flex h-5 w-10 shrink-0 items-center rounded-full border-2 shadow-inner transition-colors duration-300 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                'data-[state=unchecked]:border-white/30 data-[state=unchecked]:bg-zinc-800',
                'data-[state=checked]:border-black/25 data-[state=checked]:bg-amber-400',
                className,
            )}
        >
            <SwitchPrimitive.Thumb
                className={cn(
                    'pointer-events-none flex size-3.5 items-center justify-center rounded-full bg-white text-[7px] font-bold text-slate-700 shadow-md ring-0 transition-transform duration-300',
                    'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
                )}
            >
                {isSpanish ? 'ES' : 'EN'}
            </SwitchPrimitive.Thumb>
        </SwitchPrimitive.Root>
    );
}
