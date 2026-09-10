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

- **Backend:** Laravel 13 + Fortify (auth) + Inertia
- **Frontend:** React 19 + Tailwind 4 + shadcn/ui + Wayfinder
- **Base de datos:** PostgreSQL
- **Tiempo real:** Laravel Reverb (🔲 pendiente de instalar)
- **Testing:** Pest + Larastan (🟢), Vitest + Playwright (🔲 pendientes)
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
2. **TDD desde el primer commit** para lógica de backend crítica y frontend con estado real.
3. **Multi-tenancy: schema compartido** con `team_id` (= `workspace_id` conceptual), no schema-per-tenant.
4. **Login social: Google OAuth en el MVP** (gratis de configurar); Microsoft OAuth diferido a V2. Email/password ya funciona con cualquier proveedor de correo.
5. **Auto-join por dominio:** versión liviana (solicitud + aprobación de admin) en el MVP; verificación DNS real de propiedad del dominio en V2.

Ver `CLAUDE.md` para el brief completo que gobierna cómo trabaja Claude Code en este proyecto.
