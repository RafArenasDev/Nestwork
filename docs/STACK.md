# Stack técnico

> 🟢 instalado/configurado y funcionando · 🔲 decidido pero no instalado todavía

## Backend & tiempo real

| Pieza | Estado | Nota |
|-------|--------|------|
| Laravel 13 (PHP) | 🟢 | |
| Laravel Fortify | 🟢 | Auth: login, registro, 2FA, passkeys |
| Laravel Reverb | 🔲 | WebSocket server — a instalar cuando arranque el módulo de Mensajería |
| Laravel Socialite | 🔲 | Para Google OAuth (MVP) |
| Laravel Echo | 🔲 | Se instala junto con Reverb |

## Base de datos

**PostgreSQL** — decisión validada y ya en uso (`chat_app`, local, ver `SETUP.md`).

| Motivo | Detalle |
|--------|---------|
| Full-text search nativo | Evita depender de Elasticsearch para búsqueda de mensajes en el MVP |
| JSONB | Útil para metadata de mensajes, payloads de notificaciones |
| Concurrencia | Mejor comportamiento bajo escrituras concurrentes que MySQL, relevante para un chat |
| Costo de adopción | El usuario ya la tenía instalada localmente — cero curva nueva |

MySQL queda descartado como alternativa (ya no es punto de discusión, decisión tomada).

## Caching, colas y pub/sub

**Redis** — 🔲 no instalado todavía. Requerido para: scaling horizontal de Reverb, estado de canales de presencia, caching, rate limiting, colas de Laravel (notificaciones push, procesamiento de archivos).

## Almacenamiento de archivos

**S3-compatible** — 🔲 no configurado. MinIO en desarrollo local, proveedor real (S3, DigitalOcean Spaces, Cloudflare R2) en producción. Se instala cuando se construya la feature de adjuntos (V2).

## Búsqueda

Postgres full-text para el MVP. Meilisearch/Typesense si el volumen de mensajes lo justifica más adelante — nunca Elasticsearch (overkill para un dev solo).

## Frontend Web

| Pieza | Estado |
|-------|--------|
| React 19 + Inertia 3 | 🟢 |
| Tailwind CSS 4 + shadcn/ui (Radix primitives) | 🟢 |
| Laravel Wayfinder (rutas tipadas) | 🟢 — reemplaza el patrón `route()` clásico (Ziggy) de proyectos anteriores del usuario |
| Sonner (toasts) | 🟢 |
| i18n ES/EN (diccionario propio + hook `useLocale`) | 🟢 — ver `docs/DECISIONS.md` para por qué no se usó una librería como react-i18next |

## Desktop y Mobile

**No decidido en esta ronda de documentación** — quedan fuera del MVP (ver `REQUIREMENTS.md`). La dirección de largo plazo sigue siendo Electron (Desktop) y React Native/Expo (Mobile), pero la comparación formal se hace recién cuando arranque esa fase (decisión ya bloqueada en `CLAUDE.md` 3.6).

## Autenticación social

**Google OAuth vía Laravel Socialite** — 🔲 por construir, MVP. Gratis de configurar (Google Cloud Console, sin costo para login estándar). Requiere:
1. Instalar `laravel/socialite`.
2. Crear proyecto + credenciales OAuth en Google Cloud Console (esto lo hace el usuario, no Claude Code — son credenciales de su cuenta).
3. Nueva tabla `social_accounts` (ver `ER_DIAGRAM.md`) — **pendiente de aprobación antes de migrar**.

Microsoft OAuth: mismo mecanismo, diferido a V2.

## Documentación de API

🔲 No instalado. Recomendación: **Laravel Scribe** (genera OpenAPI desde rutas/controllers) — se instala cuando la API tenga endpoints reales de Mensajería/Canales, no tiene sentido antes.

## Versionado de API

**`/api/v1/...` desde que exista la primera ruta de API real** (decisión bloqueada en `CLAUDE.md` 3.6) — hoy el proyecto no tiene rutas `/api/*` propias todavía (todo es Inertia server-rendered), así que no aplica aún, pero queda como regla para cuando se construya.

## Testing

| Pieza | Estado |
|-------|--------|
| Pest | 🟢 — 91 tests pasando |
| PHPStan / Larastan (nivel configurado por el starter kit) | 🟢 |
| Vitest + React Testing Library | 🔲 no instalado todavía |
| Playwright (E2E) | 🔲 no instalado todavía |
| GitHub Actions (CI) | 🔲 no configurado todavía |

## DevOps / Local Dev

- **Herd** sirve el proyecto (`chat-app.test`) — reemplaza el rol de "servidor de desarrollo" de Docker para PHP.
- **PostgreSQL nativo** instalado localmente, sin contenedor — ver `SETUP.md` para la justificación completa.
- **Docker Compose**: pendiente, se suma cuando se necesiten Redis + Reverb + MinIO + Mailpit juntos (no urgente mientras el MVP no tiene tiempo real ni adjuntos).
- **Despliegue:** no decidido todavía — recomendación por defecto sigue siendo VPS simple + Docker Compose o Laravel Forge, sin Kubernetes.

## Monitoreo/Debugging (dev-time)

🔲 No instalado. Laravel Telescope y Horizon quedan para cuando haya colas/jobs reales que inspeccionar (con Redis instalado).

## Secrets / entornos

`.env` por entorno, no versionado (ya confirmado: `.env`, `.env.backup`, `.env.production` en `.gitignore`). Sin gestor externo de secrets en el MVP (decisión bloqueada en `CLAUDE.md` 3.8).
