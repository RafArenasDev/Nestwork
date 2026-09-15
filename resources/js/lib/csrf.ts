/** Headers para un fetch() manual fuera del ciclo de Inertia (acciones
 *  de mensaje: reaccionar, editar, reenviar, guardar, fijar, etc.) —
 *  esos endpoints devuelven JSON plano, no una respuesta Inertia, así
 *  que no pueden ir por router.post(). */
export function csrfHeaders(): HeadersInit {
    const csrfToken = document.querySelector<HTMLMetaElement>(
        'meta[name="csrf-token"]',
    )?.content;

    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
    };
}
