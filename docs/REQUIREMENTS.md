# Requisitos

## MVP (Fase 1) — Web only

Alcance mínimo para que alguien pueda registrarse, crear/unirse a un workspace y chatear en tiempo real de punta a punta.

- **Autenticación:**
    - Registro con email + password (cualquier proveedor de correo, sin distinción).
    - Login social con **Google OAuth** (gratis de configurar, cubre Gmail personal y Google Workspace).
    - Verificación de email obligatoria antes de acceso completo (ya scaffolded vía Fortify).
    - 2FA disponible como opción, no bloqueante (ya scaffolded vía Fortify — TOTP).
    - Passkeys (WebAuthn) disponibles como opción secundaria, no bloqueante (ya scaffolded vía Fortify) — es un método passwordless, no debe confundirse con 2FA; queda como conveniencia opcional, no se invierte más esfuerzo en pulirlo para el MVP.
- **Workspaces (Teams en el código):**
    - Cada usuario nuevo obtiene un workspace personal automáticamente al registrarse (ya scaffolded).
    - **Auto-join liviano por dominio:** si el dominio del email del usuario coincide con el de un workspace ya existente, se le ofrece "pedir unirse a [Empresa]" en vez de crear uno nuevo — sujeto a aprobación de un admin de ese workspace. _(Sin verificación DNS de propiedad del dominio — eso es V2, ver abajo.)_
    - Invitación manual de miembros por email (ya scaffolded vía Teams).
    - Roles: owner, admin, member (guest se evalúa en V2 junto con contactos externos).
- **Canales:** públicos y privados dentro de un workspace. Persistentes, tema/propósito estable, descubribles por los miembros del workspace.
- **Mensajería:**
    - DM 1:1, que puede crecer agregando más participantes (se vuelve "Grupo" — misma entidad de datos, `direct_conversations` soporta N participantes desde el diseño original, no es una tabla nueva).
    - **Canales vs. Grupos:** un Canal es persistente y descubrible dentro del workspace (como en Slack/Teams); un Grupo es una conversación privada ad-hoc entre varias personas (como un grupo de WhatsApp/Telegram) — no aparece en el listado público de canales. La sidebar refleja esta distinción (ver mockups).
    - Entrega en tiempo real vía WebSockets (typing indicators, presencia/online, entrega en vivo).
    - Búsqueda básica de mensajes (Postgres full-text).
- **No funcional:**
    - Escala esperada: cientos a bajos miles de usuarios concurrentes, no escala Slack.
    - Seguridad: auth, cifrado en tránsito (TLS), rate limiting en envío de mensajes.
    - Mantenible por un desarrollador solo.

## V2 (Fase 2 y 3)

- Threads/respuestas, reacciones, adjuntos de archivo/imagen, mensajes de voz (audio).
- Microsoft OAuth (si el público objetivo resulta ser mayormente shops de Microsoft 365).
- **Auto-join por dominio con verificación real de propiedad** (registro DNS TXT), reemplazando la versión liviana del MVP.
- Cliente Mobile (React Native/Expo) sobre la misma API.
- Notificaciones más ricas (push web + push mobile).
- Guests / contactos externos al workspace (tipo Slack Connect).
- Archivado formal de canales/grupos (ver sección "Archivado vs. borrado" abajo — la lógica de datos entra en V2 junto con la UI para gestionarlo).

## V3 / Futuro (condicional a que V2 esté estable)

- Cliente Desktop (Electron).
- Llamadas de voz/video (exploración).
- Integraciones/bots de terceros.
- Búsqueda avanzada (Meilisearch/Typesense).
- Federación con otros servidores de chat.
- GitHub OAuth (si el público objetivo termina siendo mayormente equipos técnicos) y Apple ID (solo se vuelve relevante si se publica una app nativa de iOS con otros logins sociales — no aplica hasta la Fase 3/Mobile).

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

## Archivado vs. borrado (canales, grupos, conversaciones)

Decisión explícita del usuario: en un entorno de negocio, el historial de conversación debe prevalecer — no se borra información de trabajo a la ligera. Regla general para toda la plataforma:

- **Canales y Grupos con miembros/historial no se pueden eliminar** — la única acción destructiva disponible es **archivar**, nunca un borrado real de la conversación completa (distinto del borrado de un mensaje individual, ver abajo).
- **Archivado manual:** cualquier admin del canal/grupo puede archivar la conversación en cualquier momento — deja de aparecer en la sidebar activa, pero el historial sigue accesible (de solo lectura) para quienes ya eran miembros.
- **Archivado automático por desactivación de usuario:** si un usuario se desactiva (deja la empresa, cuenta deshabilitada), sus DMs 1:1 con otras personas se archivan automáticamente del lado de la otra persona (seguir "chateando" con alguien desactivado no tiene sentido) — los Canales/Grupos con más miembros NO se archivan solo porque uno de los participantes se desactivó, simplemente se le remueve la membresía y el resto sigue con normalidad.
- **Eliminar el workspace completo** sigue siendo una acción de owner disponible (ya scaffolded vía Teams), pero eso es distinto a borrar una conversación puntual — no cambia con esta regla.

## Ciclo de vida de mensajes y conversaciones

- **Ediciones:** se guarda `edited_at`, no se sobreescribe en silencio.
- **Borrado de un mensaje individual:** soft delete (placeholder "mensaje eliminado"), preserva integridad de hilos/respuestas — esto sí es un borrado real de ESE mensaje puntual, no de la conversación entera (ver regla de archivado arriba).
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
