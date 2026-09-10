# Estrategia de testing

## Estado actual

- **Pest**: 91 tests, 328 assertions, todos pasando (`php artisan test`).
- **PHPStan/Larastan**: instalado por el starter kit (`composer.json` script `phpstan analyse`).
- **Vitest + React Testing Library**: 🔲 no instalado todavía.
- **Playwright (E2E)**: 🔲 no instalado todavía.
- **CI (GitHub Actions)**: 🔲 no configurado todavía.

## Política: TDD desde el día uno (decisión bloqueada, `CLAUDE.md` 2.1)

Área no negociable desde el primer commit de cada feature: autenticación, políticas de autorización (quién puede ver/postear/gestionar qué por workspace/canal), lógica de envío/recepción/broadcast de mensajes, manejo de eventos de presencia/WebSocket.

**Nota de transparencia:** el trabajo de UI/infra hecho en la sesión del 2026-09-10 (middleware de idioma, modales de perfil/contraseña, toggle de tema/idioma) se hizo sin tests nuevos — desviación puntual documentada en `docs/DECISIONS.md`, pendiente de corregir antes de dar por cerrada esa porción de trabajo.

## Tipos de test y herramientas

| Capa                      | Herramienta                         | Qué cubre                                                                                                         |
| ------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Backend unit/feature      | Pest                                | Modelos, policies, controllers, jobs                                                                              |
| Backend análisis estático | Larastan                            | Errores de tipos/null antes de que lleguen a un test                                                              |
| Frontend unit/componentes | Vitest + React Testing Library (🔲) | Componentes con lógica real, no presentacionales puros                                                            |
| End-to-end                | Playwright (🔲)                     | Flujos críticos de tiempo real: login → crear workspace → crear canal → enviar/recibir mensaje entre dos sesiones |

## Cómo testear WebSockets (cuando exista Reverb)

- La mayoría de los tests de broadcast usan `Event::fake()` / aserciones de broadcast en el backend (sin socket real).
- Al menos un test E2E real en Playwright debe ejercitar dos contextos de navegador reales hablando a través de una instancia de Reverb corriendo — es la única capa que prueba el pipeline de punta a punta.

## CI (pendiente de configurar)

GitHub Actions debe correr lint + análisis estático + suite completa de tests en cada PR/push, bloqueando el merge si algo falla. No configurado todavía — se arma junto con el primer PR real de una feature del MVP.

## Cobertura esperada

Sin porcentaje global arbitrario. Cada área MVP-crítica (auth, policies, mensajería, presencia) necesita tests unitarios y de feature antes de considerarse terminada.
