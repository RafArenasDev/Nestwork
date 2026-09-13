# Checklist de QA manual

Se corre antes de marcar una fase como "terminada" en `ROADMAP.md`. Los tests automáticos no reemplazan esta pasada manual, sobre todo en comportamiento de tiempo real/multi-sesión.

## Fase 0 — Setup (correr ahora)

- [ ] `http://chat-app.test/` redirige a `/login` sin mostrar la welcome page de Laravel.
- [ ] Login funciona con un usuario de prueba (email + password).
- [ ] Registro crea un usuario nuevo + workspace personal automáticamente.
- [ ] Dropdown de usuario (header y sidebar) muestra Perfil, Contraseña, Tema, Idioma, Cerrar sesión.
- [ ] Cambiar el switch de Tema alterna claro/oscuro sin recargar.
- [ ] Cambiar el switch de Idioma recarga la página y el texto de la UI (login, dropdown, modales) cambia a ES/EN correctamente.
- [ ] Modal de Perfil: editar nombre/email guarda y muestra confirmación.
- [ ] Modal de Contraseña: cambiar contraseña funciona, botón "generar contraseña" llena ambos campos, mensaje de "no coinciden" aparece si corresponde.
- [ ] `.env` con la contraseña real de Postgres no aparece en ningún archivo versionado (`git status` limpio de `.env`).

## Fases B/C/D (nav data-driven + schema extendido + seeder de volumen)

- [ ] El dropdown "Cambiar estado" del avatar en el rail muestra los 10 presets sembrados (no los 8 hardcodeados de antes), con el label en el idioma activo (ES/EN).
- [ ] Elegir un preset del dropdown sigue actualizando el estado (emoji + texto) en el header/avatar como antes.
- [ ] `php artisan migrate` corre limpio desde cero (`migrate:fresh`) sin errores, y `php artisan migrate:rollback` revierte las migraciones nuevas sin dejar la BD en un estado roto.
- [ ] Login/chat existentes (cuentas reales del dev) siguen funcionando igual después de correr `nestwork:seed-demo` — el comando es aditivo, no debería romper nada.
- [ ] `php artisan nestwork:seed-demo --users=15 --messages=150` corre sin errores y deja usuarios logueables con la contraseña documentada.

## Fase 1 — MVP (cuando exista la feature)

- [ ] Registro con Google OAuth crea usuario y lo asocia correctamente si ya existía por email.
- [ ] Registrarse con un dominio que ya tiene workspace ofrece "pedir unirse" en vez de crear uno nuevo.
- [ ] Un admin puede aprobar/rechazar una solicitud de join por dominio.
- [ ] Dos usuarios en el mismo canal: typing indicator visible en <1s.
- [ ] Entrega de mensaje en tiempo real entre dos sesiones de navegador distintas, <1s.
- [ ] Presencia (online/offline) se actualiza al desconectar/reconectar.
- [ ] Rate limiting bloquea envío de mensajes en ráfaga excesiva.

## Plantilla para nuevas features

```
### [Nombre de la feature]
- [ ] Caso feliz
- [ ] Caso de error/validación
- [ ] Comportamiento multi-sesión (si aplica)
- [ ] Verificado en ambos idiomas (ES/EN)
- [ ] Verificado en tema claro y oscuro
```
