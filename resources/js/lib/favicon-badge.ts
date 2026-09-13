/**
 * Punto rojo con el número de no leídos superpuesto al favicon de la
 * pestaña — la misma idea que Gmail/Slack. Dibuja el ícono base (SVG) +
 * el badge en un canvas y reemplaza el <link rel="icon"> por el
 * resultado. Sin librería (favico.js, etc.): el proyecto solo necesita
 * un punto + número, no animaciones ni múltiples estilos.
 */
let baseIconImage: HTMLImageElement | null = null;

function loadBaseIcon(): Promise<HTMLImageElement> {
    if (baseIconImage) {
        return Promise.resolve(baseIconImage);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            baseIconImage = img;
            resolve(img);
        };
        img.onerror = reject;
        img.src = '/favicon.svg';
    });
}

function setFaviconHref(href: string) {
    const existing =
        document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');

    if (existing.length === 0) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = href;
        document.head.appendChild(link);

        return;
    }

    existing.forEach((link) => {
        link.href = href;
    });
}

export async function updateFaviconBadge(count: number): Promise<void> {
    try {
        const icon = await loadBaseIcon();
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return;
        }

        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(icon, 0, 0, size, size);

        if (count > 0) {
            const label = count > 99 ? '99+' : String(count);
            const radius = label.length > 2 ? 22 : 18;
            const cx = size - radius + 4;
            const cy = radius - 4;

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${label.length > 2 ? 20 : 26}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, cx, cy + 1);
        }

        setFaviconHref(canvas.toDataURL('image/png'));
    } catch {
        // Si el favicon base no carga (offline, bloqueado, etc.) no
        // rompemos nada — simplemente no hay badge.
    }
}
