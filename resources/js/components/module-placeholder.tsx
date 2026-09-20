import {
    ArchiveBoxIcon,
    BellIcon,
    BookmarkIcon,
    UserGroupIcon,
    SpeakerWaveIcon,
    VideoCameraIcon,
} from '@heroicons/react/24/outline';
import type { RailModuleKey } from '@/components/curved-nav-rail';

const COPY: Partial<
    Record<RailModuleKey, { icon: typeof BellIcon; description: string }>
> = {
    activity: {
        icon: BellIcon,
        description:
            'Elige una conversación de la lista para ver qué novedades tiene.',
    },
    archived: {
        icon: ArchiveBoxIcon,
        description: 'Abre un chat archivado de la lista para verlo.',
    },
    saved: {
        icon: BookmarkIcon,
        description: 'Abre un mensaje guardado de la lista para verlo.',
    },
    groups: {
        icon: UserGroupIcon,
        description:
            'Elige un grupo de la lista, o crea uno nuevo con el botón de arriba.',
    },
    channels: {
        icon: SpeakerWaveIcon,
        description:
            'Elige un canal de la lista, únete a uno público, o crea uno nuevo.',
    },
    meetings: {
        icon: VideoCameraIcon,
        description:
            'Las videollamadas todavía no están disponibles — próxima novedad grande de Nestwork.',
    },
};

/** Contenido del panel cuando el módulo activo (Actividad/Archivo/
 *  Guardados) todavía no tiene página propia y no hay ninguna
 *  conversación puntual abierta — antes se veía lo que quedó de la
 *  última página real visitada (Home/chat), confuso y sin relación con
 *  el módulo que el rail decía tener activo. */
export function ModulePlaceholder({ module }: { module: RailModuleKey }) {
    const entry = COPY[module];

    if (!entry) {
        return null;
    }

    const Icon = entry.icon;

    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="bg-foreground/5 text-muted-foreground flex size-12 items-center justify-center rounded-full">
                <Icon className="size-6" strokeWidth={1.6} />
            </span>
            <p className="text-muted-foreground max-w-xs text-sm">
                {entry.description}
            </p>
        </div>
    );
}
