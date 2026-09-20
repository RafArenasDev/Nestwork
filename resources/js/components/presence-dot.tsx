export type Presence = 'available' | 'away' | 'busy' | 'dnd' | 'offline';

/** Verde=disponible, amarillo=ausente, rojo=ocupado — sin relleno (sólo
 *  el aro) cuando está totalmente desconectado. "Ocupado" y "No
 *  molestar" antes se veían idénticos (mismo rojo) — ahora "No
 *  molestar" lleva una barra blanca adentro (mismo lenguaje que Teams:
 *  no es sólo color, es una FORMA distinta), para que se puedan
 *  diferenciar de un vistazo sin tener que pasar el mouse. El fondo del
 *  punto usa `surfaceTone` para que el "cutout" que lo separa del
 *  avatar coincida con lo que sea que esté detrás (header del chat,
 *  fila del sidebar…). */
export function PresenceDot({
    presence,
    surfaceTone = 'var(--sidebar-accent)',
    className = '-top-0.5 -right-0.5 size-2.5',
}: {
    presence: Presence;
    surfaceTone?: string;
    className?: string;
}) {
    const isOffline = presence === 'offline';
    const stateClasses: Record<Exclude<Presence, 'offline'>, string> = {
        available: 'border-emerald-500 bg-emerald-500',
        away: 'border-amber-500 bg-amber-500',
        busy: 'border-red-500 bg-red-500',
        dnd: 'border-red-600 bg-red-600',
    };

    return (
        <span
            aria-hidden="true"
            className={`absolute flex items-center justify-center rounded-full border-2 ${className} ${
                isOffline ? 'border-zinc-400' : stateClasses[presence]
            }`}
            style={isOffline ? { backgroundColor: surfaceTone } : undefined}
        >
            {presence === 'dnd' && (
                <span className="h-[1.5px] w-1/2 rounded-full bg-white" />
            )}
        </span>
    );
}
