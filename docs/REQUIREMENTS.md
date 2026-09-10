# Requisitos

## MVP (Fase 1) — Web only

Alcance mínimo para que alguien pueda registrarse, crear/unirse a un workspace y chatear en tiempo real de punta a punta.

- **Autenticación:**
    - Registro con email + password (cualquier proveedor de correo, sin distinción).
    - Login social con **Google OAuth** (gratis de configurar, cubre Gmail personal y Google Workspace).
    - Verificación de email obligatoria antes de acceso completo (ya scaffolded vía Fortify).
    - 2FA disponible como opción, no bloqueante (ya scaffolded vía Fortify — passkeys y TOTP).
- **Workspaces (Teams en el código):**
    - Cada usuario nuevo obtiene un workspace personal automáticamente al registrarse (ya scaffolded).
    - **Auto-join liviano por dominio:** si el dominio del email del usuario coincide con el de un workspace ya existente, se le ofrece "pedir unirse a [Empresa]" en vez de crear uno nuevo — sujeto a aprobación de un admin de ese workspace. _(Sin verificación DNS de propiedad del dominio — eso es V2, ver abajo.)_
    - Invitación manual de miembros por email (ya scaffolded vía Teams).
    - Roles: owner, admin, member (guest se evalúa en V2 junto con contactos externos).
- **Canales:** públicos y privados dentro de un workspace.
- **Mensajería:**
    - DMs 1:1 y grupales.
    - Entrega en tiempo real vía WebSockets (typing indicators, presencia/online, entrega en vivo).
    - Búsqueda básica de mensajes (Postgres full-text).
- **No funcional:**
    - Escala esperada: cientos a bajos miles de usuarios concurrentes, no escala Slack.
    - Seguridad: auth, cifrado en tránsito (TLS), rate limiting en envío de mensajes.
    - Mantenible por un desarrollador solo.

## V2 (Fase 2 y 3)

- Threads/respuestas, reacciones, adjuntos de archivo/imagen.
- Microsoft OAuth (si el público objetivo resulta ser mayormente shops de Microsoft 365).
- **Auto-join por dominio con verificación real de propiedad** (registro DNS TXT), reemplazando la versión liviana del MVP.
- Cliente Mobile (React Native/Expo) sobre la misma API.
- Notificaciones más ricas (push web + push mobile).
- Guests / contactos externos al workspace (tipo Slack Connect).

## V3 / Futuro (condicional a que V2 esté estable)

- Cliente Desktop (Electron).
- Llamadas de voz/video (exploración).
- Integraciones/bots de terceros.
- Búsqueda avanzada (Meilisearch/Typesense).
- Federación con otros servidores de chat.

## Explícitamente fuera de alcance (por ahora)

- **Sin cifrado end-to-end (E2EE).** Mensajes cifrados en tránsito (TLS) y en reposo a nivel infraestructura, pero el servidor puede leer el contenido. Documentado para que no se asuma lo contrario más adelante.
- Sin federación con servidores de chat externos.
- Sin marketplace de bots/integraciones de terceros en MVP ni V2.
- Sin SSO/SAML empresarial en MVP (Google OAuth + email/password alcanza por ahora).

## Trust & safety básico (MVP)

- Verificación de email obligatoria antes de acceso completo.
- Rate limiting en envío de mensajes por usuario/canal (anti-spam) — a implementar cuando se construya el módulo de mensajería.
- Tamaño máximo y tipos de archivo permitidos para adjuntos — se define cuando se construya esa feature (V2).
- 2FA como opción, no bloqueante (ya disponible).

## Ciclo de vida de mensajes

- **Ediciones:** se guarda `edited_at`, no se sobreescribe en silencio.
- **Borrado:** soft delete (placeholder "mensaje eliminado"), preserva integridad de hilos/respuestas.
- **Adjuntos borrados:** ventana de retención antes de purga definitiva del storage (valor exacto a definir al construir adjuntos, V2).

## Modelo de autenticación — detalle de la decisión tomada

| Vía                   | Estado                                            | Costo                                                         | Notas                                                                         |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Email + password      | ✅ Ya funciona (Fortify)                          | Gratis                                                        | Cualquier proveedor de correo (Gmail, Outlook, Proton, Yahoo, dominio propio) |
| Google OAuth          | 🔲 Por construir, MVP                             | Gratis (credenciales OAuth en Google Cloud Console sin costo) | Vía Laravel Socialite                                                         |
| Microsoft OAuth       | 🔲 V2                                             | Gratis (Azure App registration sin costo)                     | Diferido para no duplicar esfuerzo antes del chat funcionando                 |
| Registro              | ✅ Autoservicio, abierto                          | —                                                             | Cerrarlo a "solo invitación" mataría la adquisición orgánica                  |
| Auto-join por dominio | 🔲 Versión liviana en MVP, verificación DNS en V2 | —                                                             | Ver arriba                                                                    |

**Nueva tabla propuesta (pendiente de aprobación antes de construir):** vincular cuentas de Google a un `User` requiere una tabla `social_accounts` (o columnas `provider`/`provider_id` en `users`, a decidir en `ARCHITECTURE.md`/`ER_DIAGRAM.md`) — no se construye hasta que se revise el diseño.
