# Nestwork (carpeta local/Herd: `chat-app`, pendiente de renombrar)

> Plataforma de chat interno para empresas — workspaces identificados por dominio de correo, mensajería en tiempo real, pensada para equipos chicos/medianos sin el costo de Slack/Teams.

**Estado:** 🚧 En desarrollo — Fase 0 (setup) completa. Del roadmap ampliado en `PROMPT-MEJORAS-NESTWORK-v2.md`: **Fase A** (auth dual + pantalla split, 2026-09-12/13) y **Fases B/C/D** (nav data-driven + schema extendido + seeder de volumen, 2026-09-13) terminadas — sigue la Fase E (burbujas/composer). Ver Pendientes para el detalle. Ver `docs/ROADMAP.md` para el detalle de fases originales.

---

## Documentación

| Documento                                      | Contenido                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| [`docs/DESCRIPTION.md`](docs/DESCRIPTION.md)   | Elevator pitch, usuarios objetivo, propuesta de valor (ES/EN)                  |
| [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Alcance MVP/V2/V3, fuera de alcance, trust & safety, ciclo de vida de mensajes |
| [`docs/ER_DIAGRAM.md`](docs/ER_DIAGRAM.md)     | Diagrama entidad-relación (Mermaid) + diccionario de datos                     |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Diagramas de arquitectura y secuencia, multi-tenancy, estructura de carpetas   |
| [`docs/STACK.md`](docs/STACK.md)               | Stack técnico validado, qué está instalado de verdad y qué falta               |
| [`docs/ROADMAP.md`](docs/ROADMAP.md)           | Fases, Web-only en el MVP, Mobile/Desktop condicionales                        |
| [`docs/SETUP.md`](docs/SETUP.md)               | Cómo levantar el entorno de desarrollo local                                   |
| [`docs/TESTING.md`](docs/TESTING.md)           | Estrategia de testing, TDD, cómo testear WebSockets                            |
| [`docs/QA.md`](docs/QA.md)                     | Checklist manual de QA por fase                                                |
| [`docs/DECISIONS.md`](docs/DECISIONS.md)       | Log de decisiones técnicas (ADR)                                               |

## Stack (resumen — ver `docs/STACK.md` para el detalle completo)

- **Backend:** Laravel 13 + Inertia. Auth **dual**: Google (Firebase) + email/contraseña propio (pantalla split con panel de marca deslizante), con verificación de correo real y recuperación de contraseña — passkeys/2FA siguen fuera de alcance.
- **Frontend:** React 19 + Tailwind 4 + shadcn/ui + Wayfinder
- **Base de datos:** PostgreSQL
- **Tiempo real:** Laravel Reverb (🔲 pendiente de instalar)
- **Testing:** Pest + Larastan (🟢), Vitest + Playwright (🔲 pendientes — TDD en pausa por presión de tiempo, ver Pendientes)
- **i18n:** ES/EN (diccionario propio + `laravel-lang` para mensajes del framework)

## Desarrollo local

```bash
cd C:\Users\usuario\Herd\chat-app
npm run dev          # hot-reload de assets (el sitio ya lo sirve Herd)
php artisan test     # suite de tests
php vendor/bin/pint  # estilo de código PHP
```

Sitio: `http://chat-app.test`

## Decisiones bloqueadas (no se vuelven a discutir sin pedirlo explícitamente)

1. **MVP = solo Web.** Desktop/Mobile son fase futura condicionada a que la web esté estable.
2. **TDD desde el primer commit** para lógica de backend crítica y frontend con estado real. _(En pausa desde el rediseño de auth — ver Pendientes.)_
3. **Multi-tenancy: schema compartido** con `team_id` (= `workspace_id` conceptual), no schema-per-tenant.
4. ~~Login: solo Google (Firebase) en el MVP, sin password ni passkeys.~~ **Actualizado 2026-09-13:** se reintrodujo login por email/contraseña (Fase A de `PROMPT-MEJORAS-NESTWORK-v2.md`) junto a Google — un usuario puede tener ambos métodos vinculados a la misma cuenta. Passkeys siguen fuera de alcance. Equipo asignado automático por dominio de correo (dominios públicos → equipo "Invitados" compartido; cualquier otro dominio → su propio equipo, primer usuario = Owner) — aplica igual para alta por Google o por contraseña. Sin aprobación manual ni verificación DNS.
5. **Multi-plataforma con la misma lógica, no proyectos aparte:** cuando la web llegue al punto de tener datos reales (no mocks), Android y desktop arrancan en paralelo reutilizando el mismo backend/lógica de dominio — no se tratan como iniciativas separadas.

Ver `CLAUDE.md` para el brief completo que gobierna cómo trabaja Claude Code en este proyecto.

## Fase A (auth dual + pantalla split) — terminada 2026-09-13

Ver `PROMPT-MEJORAS-NESTWORK-v2.md` sección 2 para el spec original y sección 17 para el plan de fases completo (B en adelante sigue pendiente, ver más abajo). Lo que quedó implementado y ya está en `main`:

- Pantalla `/login` y `/register` con panel deslizante: una sola card de formulario se mueve (curva animada hacia el centro, sin costuras/flash), el panel de marca queda fijo como fondo.
- Login por email+contraseña junto a Google, con vinculación automática de ambos métodos a la misma cuenta (`AuthProvider::Both`).
- Recuperar contraseña integrado al mismo panel (sin navegar a otra pantalla) + pantalla de `reset-password/{token}` por link de correo.
- Checkbox "Mantener sesión iniciada" (remember-me real, ya no forzado a `true`).
- **Verificación de correo real** (antes se auto-verificaba al registrarse) — `MustVerifyEmail` + rutas `verify-email`/`verify-email/{id}/{hash}`/reenvío. En dev, `MAIL_MAILER=log` — el link de verificación queda en `storage/logs/laravel.log` hasta que se configure Mailpit/SMTP real.
- Mensajes de validación en español para visitantes sin cuenta aún (antes salían en inglés) vía fallback por `Accept-Language` en `HandleLocale`.
- Ajustes visuales: color de error legible en tema oscuro, borde rojo en todos los inputs (antes solo contraseña), brillo de botones sin invadir campos vecinos, copyright dinámico.
- Skeleton (no spinner) al entrar al dashboard tras login/registro exitoso — login/registro conservan su spinner de botón, sin skeleton ahí.

**Pendiente dentro de la propia Fase A** (no bloqueante, pero sin resolver):

- No hay UI en Ajustes > Seguridad para que el usuario vea/gestione qué métodos de login tiene vinculados — hoy el vínculo pasa solo (automático), pero no es visible.
- `MAIL_MAILER` sigue en `log` — falta decidir/activar Mailpit (ya viene con Herd) o un SMTP real para que los correos de verificación/recuperación lleguen de verdad.

## Fases B/C/D (nav data-driven + schema extendido + seeder de volumen) — terminadas 2026-09-13

Ver `docs/DECISIONS.md` (entradas del 2026-09-13) para el detalle técnico completo. Resumen:

- **Estados de usuario data-driven:** tabla `status_presets` (sembrada por `StatusPresetSeeder`, 10 presets) reemplaza los arrays quemados que antes vivían en `curved-nav-rail.tsx`; se comparten al frontend vía Inertia (`statusPresets`), con el label ya resuelto en el idioma activo. Los 4 módulos del rail (Inicio/Mensajes/Actividad/Archivo) se dejaron intencionalmente como están — son IA estructural de la app, no contenido editable.
- **Schema extendido (aditivo, sin tocar nada existente):** `conversations` gana `is_public`/`avatar_path`/`description`/`is_ephemeral`/`ephemeral_ttl_seconds`/`default_message_ttl_seconds`; `conversation_participants` gana `role`/`hidden_at`; `messages` gana `type`/`metadata` (jsonb)/`reply_to_message_id`/`forwarded_from_message_id`/`forwarded_from_conversation_id`/`is_hidden`. Tablas nuevas: `attachments`, `reactions`, `message_receipts`, `link_previews`, `message_deletions`, `favorites` (polimórfica), `status_presets`. `ConversationType` gana el case `Channel`. **Todavía sin UI ni Actions propias** — es la base para las fases E en adelante.
- **ADR: no BLOB en la BD** para adjuntos/grabaciones — object storage (MinIO en prod) + solo metadata/ruta en `attachments`. Documentado en `docs/DECISIONS.md`.
- **Comando `php artisan nestwork:seed-demo`** (parametrizable, `--users`/`--messages`) genera volumen real: por defecto ~80 usuarios (contraseña `Nestwork2026!`, ver `SeedDemoData::DEMO_PASSWORD`) repartidos en 5 empresas falsas + el team "Invitados", con dms/groups/channels y miles de mensajes con reacciones y respuestas. No reemplaza a `ConversationsSeeder` (que sigue teniendo las 3 cuentas reales del dev) ni corre en `migrate:fresh --seed` — es opt-in.

## Pendientes (explícitos, para no perderlos de vista)

- **Resto del roadmap de `PROMPT-MEJORAS-NESTWORK-v2.md` (Fases E a K)** — burbujas de mensaje corregidas + composer con formato, paginación por cursor + salto a fecha + búsqueda global, Actividad/estados de usuario (UI)/roles de admin/baja de cuenta, notificaciones, personalización visual (gradientes de sidebar), chats secretos + mensajes temporales, llamadas. Fases B/C/D (nav data-driven, schema extendido, seeder de volumen) ya están — ver sección de arriba.
- **Tiempo real (Laravel Reverb):** WebSockets, indicador de "escribiendo...", notificaciones en vivo.
- **Sonidos + notificaciones de escritorio/navegador.**
- **UI de chat:** burbujas, scroll area, vista dividida (2-3 chats a la vez con foco automático en el que recibe mensaje), badges de no leídos, animaciones.
- **Módulos "Actividad" y "Archivado"** del mini-rail: hoy son pestañas placeholder, falta conectarlos a datos reales (ya existe `archived_at` en `conversation_participants` para esto).
- **Más proveedores de login:** Microsoft/Outlook, GitHub, Yahoo, o un enlace mágico por correo para quien no tiene Google.
- **Apps de escritorio/móvil:** en paralelo una vez la web tenga datos reales (ver decisión bloqueada #5) — mismo backend, sin duplicar lógica.
- **Tests Pest:** este proyecto exige TDD desde el día uno (ver decisión #2); quedó en deuda por la urgencia de tener el login/chat funcionando primero.
- **Traducciones ES/EN completas** de todo lo agregado en el rediseño de auth/equipos/chat.
- **Confirmación al cerrar modales con datos sin guardar:** el patrón (no cerrar con click afuera, preguntar antes de descartar, botón crear deshabilitado hasta llenar campos obligatorios) solo se aplicó a `CreateTeamModal` — falta propagarlo al resto de modales del proyecto (perfil, invitaciones, etc.).
- **`usePage().props` no trae bien los tipos compartidos:** `npx tsc --noEmit` marca `auth`/`currentTeam`/`teams`/`conversations` como `unknown`/`{}` en varios archivos aunque `types/global.d.ts` los declara — es un problema previo a esta sesión (confirmado comparando contra el commit anterior), no afecta el build real (Vite no tipa en serio, solo transpila) pero sí ensucia `tsc --noEmit`. Falta investigar por qué la augmentación de `@inertiajs/core` no está enganchando con el `usePage()` real de esta versión.
- **Offline-first / Service Workers (PWA):** el usuario quiere investigar y validar esto más adelante — que la app siga siendo usable (al menos lectura de conversaciones ya cargadas) sin conexión. Todavía sin decisión de alcance ni de herramienta (Workbox, Vite PWA plugin, etc.) — queda como tema a investigar antes de comprometerse a una implementación.
