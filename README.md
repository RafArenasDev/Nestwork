# Nestwork (carpeta local/Herd: `chat-app`, pendiente de renombrar)

> Plataforma de chat interno para empresas — workspaces identificados por dominio de correo, mensajería en tiempo real, pensada para equipos chicos/medianos sin el costo de Slack/Teams.

**Estado:** 🚧 En desarrollo — Fase 0 (setup) casi completa, Fase 1 (MVP) no iniciada. Ver `docs/ROADMAP.md` para el detalle.

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

- **Backend:** Laravel 13 + Inertia. Auth vía Firebase (Google OAuth) — Fortify/passkeys/2FA/password se quitaron por completo.
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
4. **Login: solo Google (Firebase) en el MVP**, sin password ni passkeys. Equipo asignado automático por dominio de correo (dominios públicos → equipo "Invitados" compartido; cualquier otro dominio → su propio equipo, primer usuario = Owner). Sin aprobación manual ni verificación DNS.
5. **Multi-plataforma con la misma lógica, no proyectos aparte:** cuando la web llegue al punto de tener datos reales (no mocks), Android y desktop arrancan en paralelo reutilizando el mismo backend/lógica de dominio — no se tratan como iniciativas separadas.

Ver `CLAUDE.md` para el brief completo que gobierna cómo trabaja Claude Code en este proyecto.

## Pendientes (explícitos, para no perderlos de vista)

- **Skeleton/spinner en el dashboard** para cargas que tarden — evitar pantalla en blanco durante una navegación/refresh.
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
