/** Paleta compartida (color de sidebar + color de burbujas propias) —
 *  gradientes y sólidos, mezcla deliberada de tonos "tech" (no sólo
 *  pasteles/florales) inspirados en nomenclatura de Apple/marcas de
 *  hardware (Graphite, Titanium, Obsidian…). `solidEnd` es el color
 *  sólido que usa el pico de la burbuja (ver messages/index.tsx) —
 *  siempre el stop "final" del degradé en la dirección 135deg, así
 *  coincide con la esquina real donde el pico se apoya. */
export type ColorPreset = {
    key: string;
    label: string;
    /** Valor para background-image — gradiente real o, en los sólidos,
     *  un "gradiente" de un solo color (mismo mecanismo para los dos,
     *  bg-[image:var(...)] no necesita distinguir casos). */
    image: string;
    /** Sólido — pico de burbuja y usos de un solo tono. */
    solidEnd: string;
    /** Tinte de sidebar (overlay translúcido) derivado de los mismos
     *  dos tonos. */
    tint: string;
};

export const COLOR_PRESETS: ColorPreset[] = [
    {
        key: 'aurora',
        label: 'Aurora',
        image: 'linear-gradient(135deg,#5B7FFF,#8B6CFF)',
        solidEnd: '#8B6CFF',
        tint: 'linear-gradient(165deg, rgba(91,127,255,.16), rgba(139,108,255,.1))',
    },
    {
        key: 'cobalt',
        label: 'Cobalt',
        image: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
        solidEnd: '#1D4ED8',
        tint: 'linear-gradient(165deg, rgba(37,99,235,.16), rgba(29,78,216,.1))',
    },
    {
        key: 'indigo',
        label: 'Indigo',
        image: 'linear-gradient(135deg,#6366F1,#4338CA)',
        solidEnd: '#4338CA',
        tint: 'linear-gradient(165deg, rgba(99,102,241,.16), rgba(67,56,202,.1))',
    },
    {
        key: 'ocean',
        label: 'Ocean',
        image: 'linear-gradient(135deg,#0EA5E9,#0369A1)',
        solidEnd: '#0369A1',
        tint: 'linear-gradient(165deg, rgba(14,165,233,.16), rgba(3,105,161,.1))',
    },
    {
        key: 'emerald',
        label: 'Emerald',
        image: 'linear-gradient(135deg,#10B981,#047857)',
        solidEnd: '#047857',
        tint: 'linear-gradient(165deg, rgba(16,185,129,.16), rgba(4,120,87,.1))',
    },
    {
        key: 'volcano',
        label: 'Volcano',
        image: 'linear-gradient(135deg,#F97316,#C2410C)',
        solidEnd: '#C2410C',
        tint: 'linear-gradient(165deg, rgba(249,115,22,.16), rgba(194,65,12,.1))',
    },
    {
        key: 'amber',
        label: 'Amber',
        image: 'linear-gradient(135deg,#F59E0B,#B45309)',
        solidEnd: '#B45309',
        tint: 'linear-gradient(165deg, rgba(245,158,11,.16), rgba(180,83,9,.1))',
    },
    {
        key: 'crimson',
        label: 'Crimson',
        image: 'linear-gradient(135deg,#DC2626,#991B1B)',
        solidEnd: '#991B1B',
        tint: 'linear-gradient(165deg, rgba(220,38,38,.16), rgba(153,27,27,.1))',
    },
    {
        key: 'slate',
        label: 'Slate',
        image: 'linear-gradient(135deg,#64748B,#475569)',
        solidEnd: '#475569',
        tint: 'linear-gradient(165deg, rgba(100,116,139,.16), rgba(71,85,105,.1))',
    },
    {
        key: 'graphite',
        label: 'Graphite',
        image: 'linear-gradient(135deg,#52525B,#27272A)',
        solidEnd: '#27272A',
        tint: 'linear-gradient(165deg, rgba(82,82,91,.18), rgba(39,39,42,.12))',
    },
    {
        key: 'titanium',
        label: 'Titanium',
        image: 'linear-gradient(135deg,#71717A,#52525B)',
        solidEnd: '#52525B',
        tint: 'linear-gradient(165deg, rgba(113,113,122,.16), rgba(82,82,91,.1))',
    },
    {
        key: 'obsidian',
        label: 'Obsidian',
        image: 'linear-gradient(135deg,#18181B,#09090B)',
        solidEnd: '#09090B',
        tint: 'linear-gradient(165deg, rgba(24,24,27,.22), rgba(9,9,11,.16))',
    },
];

export function colorPresetByKey(key: string): ColorPreset {
    return (
        COLOR_PRESETS.find((preset) => preset.key === key) ?? COLOR_PRESETS[0]
    );
}
