import EmojiPicker, {
    Categories,
    Theme as EmojiPickerTheme,
} from 'emoji-picker-react';
import { Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useAppearance } from '@/hooks/use-appearance';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/** Nombres de categoría en español — la librería sólo trae inglés de
 *  fábrica ("Frequently Used", "Smileys & People"...), y el resto de la
 *  app está en español. Exportado: el composer usa el mismo picker con
 *  la misma configuración (ver message-composer.tsx). */
export const EMOJI_CATEGORIES = [
    { category: Categories.SUGGESTED, name: 'Usados frecuentemente' },
    { category: Categories.SMILEYS_PEOPLE, name: 'Caritas y personas' },
    { category: Categories.ANIMALS_NATURE, name: 'Animales y naturaleza' },
    { category: Categories.FOOD_DRINK, name: 'Comida y bebida' },
    { category: Categories.TRAVEL_PLACES, name: 'Viajes y lugares' },
    { category: Categories.ACTIVITIES, name: 'Actividades' },
    { category: Categories.OBJECTS, name: 'Objetos' },
    { category: Categories.SYMBOLS, name: 'Símbolos' },
    { category: Categories.FLAGS, name: 'Banderas' },
];

/** Un solo picker de reacciones, compartido entre la burbuja y el
 *  visor de imagen/video — pedido explícito: "todas las reacciones
 *  aplica igual", no dos implementaciones que puedan divergir. El
 *  "+ más emojis" abre el picker completo (misma librería, tema y
 *  variables --epr-* reskineadas en app.css) dentro del mismo Popover
 *  — nunca dos Popover anidados. */
export function ReactionPickerButton({
    onPick,
    trigger,
    side = 'top',
    align = 'center',
}: {
    onPick: (emoji: string) => void;
    trigger: ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
}) {
    const [showFullPicker, setShowFullPicker] = useState(false);
    const { resolvedAppearance } = useAppearance();

    return (
        <Popover onOpenChange={(open) => !open && setShowFullPicker(false)}>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent
                side={side}
                align={align}
                // z-[60]: por encima del scrim del visor de imagen/video
                // (z-[55]) — Radix porta este contenido a un contenedor
                // compartido que puede quedar ANTES que ese scrim en el
                // DOM, y con el mismo z-index (ambos z-50 por defecto)
                // el orden en el DOM ganaba: el popover técnicamente se
                // abría, pero quedaba tapado detrás del modal (pedido
                // explícito: "no abre ahí").
                className={
                    showFullPicker
                        ? 'z-[60] w-fit border-none bg-transparent p-0 shadow-none'
                        : 'z-[60] w-fit rounded-2xl p-2'
                }
            >
                {showFullPicker ? (
                    <EmojiPicker
                        theme={
                            resolvedAppearance === 'dark'
                                ? EmojiPickerTheme.DARK
                                : EmojiPickerTheme.LIGHT
                        }
                        onEmojiClick={(data) => onPick(data.emoji)}
                        height={380}
                        width={320}
                        searchPlaceHolder="Buscar emoji"
                        categories={EMOJI_CATEGORIES}
                        previewConfig={{ showPreview: false }}
                    />
                ) : (
                    <div className="flex items-center gap-1">
                        {QUICK_REACTIONS.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onPick(emoji)}
                                className="flex size-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 active:scale-95"
                            >
                                {emoji}
                            </button>
                        ))}
                        <button
                            type="button"
                            aria-label="Más emojis"
                            onClick={() => setShowFullPicker(true)}
                            className="text-muted-foreground hover:bg-foreground/10 flex size-8 items-center justify-center rounded-full transition-colors"
                        >
                            <Plus className="size-4" />
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
