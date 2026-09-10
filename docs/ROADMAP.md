# Roadmap

Sin estimaciones de tiempo (proyecto de aprendizaje/side project) — se avanza por completitud de features, no por calendario. Web-only hasta el final del MVP; Mobile/Desktop quedan condicionados a que el MVP funcione y esté estable.

## Fase 0 — Setup (🟡 en progreso)

- [x] Proyecto Laravel + React + Teams scaffolded (starter kit oficial).
- [x] PostgreSQL local conectado y migrado.
- [x] Laravel Boost instalado (contexto de IA para Claude Code).
- [x] i18n ES/EN (backend + frontend).
- [x] UI de auth con layout split, dropdown de usuario con tema/idioma, modales de perfil/contraseña.
- [x] Ruta raíz redirige a login (sin welcome page).
- [ ] Documentación completa (`docs/`) — **en curso, este mismo commit de documentos**.
- [ ] CI (GitHub Actions: lint + tests).
- [ ] Redis instalado y configurado.

## Fase 1 — MVP (🔲 no iniciada)

No se considera "hecha" hasta que un usuario pueda: registrarse (email/password o Google), crear o pedir unirse a un workspace, crear canales, y chatear en tiempo real de punta a punta.

- [ ] Google OAuth (Socialite + tabla `social_accounts`, con aprobación previa del diseño).
- [ ] Auto-join liviano por dominio (tabla `teams.domain` + `join_requests`, con aprobación previa del diseño).
- [ ] Instalar Reverb + Echo.
- [ ] Modelo de datos de Canales y Mensajes (`channels`, `channel_members`, `messages`, `direct_conversations`).
- [ ] Envío/recepción de mensajes en tiempo real (1:1 y en canal).
- [ ] Presencia (online/offline) y typing indicators.
- [ ] Búsqueda básica de mensajes (Postgres full-text).
- [ ] Rate limiting de envío de mensajes.

## Fase 2 — V2

- [ ] Threads/respuestas, reacciones.
- [ ] Adjuntos de archivo/imagen (+ MinIO local, S3-compatible en prod).
- [ ] Notificaciones (push web con VAPID, luego push mobile).
- [ ] Verificación real de dominio (DNS TXT) reemplazando el auto-join liviano del MVP.
- [ ] Guests / contactos externos al workspace.

## Fase 3 — V2, condicional

- [ ] Cliente Mobile (React Native/Expo), reutilizando la misma API — solo después de que la Fase 1 esté estable.

## Fase 4 — V3, condicional

- [ ] Cliente Desktop (Electron).
- [ ] Exploración de llamadas de voz/video.
- [ ] Integraciones de terceros.

## Fase 5 — Pulido y despliegue

- [ ] Hardening, entorno de producción real, backups.

**Regla:** no dejar que la planificación de una fase futura se filtre en el trabajo de la fase actual — cada fase se detalla recién cuando la anterior está funcionalmente completa.
