# Decisiones técnicas (ADR ligero)

> Nota: estas entradas se generaron _antes_ de la ronda formal de planificación (`docs/DESCRIPTION.md`, `REQUIREMENTS.md`, etc. definida en `CLAUDE.md`) porque se saltó el gate para avanzar rápido con el setup inicial. Cuando se retome la documentación completa, revisar que estas decisiones sigan siendo válidas y trasladarlas a `ARCHITECTURE.md`/`STACK.md` donde corresponda.

## 2026-09-10 — Base de datos PostgreSQL local

- **Decisión:** BD `chat_app` creada en el Postgres 18 nativo ya instalado (no Docker todavía), usuario `postgres`.
- **Por qué:** coherente con la decisión ya bloqueada de usar PostgreSQL; Docker Compose para el resto de servicios (Redis, Reverb, MinIO) queda pendiente para cuando se documente `SETUP.md` formalmente.
- **Alternativas:** ninguna — ya estaba decidido en el brief.

## 2026-09-10 — Paquete `laravel-lang/lang` para traducciones ES/EN

- **Decisión:** se usó el paquete comunitario `laravel-lang/lang` (+ `laravel-lang/publisher`) para generar `lang/en/*.php` y `lang/es/*.php` (validation, auth, passwords, pagination) en vez de traducir a mano.
- **Por qué:** evita inventar traducciones de mensajes de validación de Laravel (arriesgado y propenso a errores/incompletitud); es el paquete estándar de la comunidad para este caso.
- **Alternativas consideradas:** traducir manualmente `validation.php` — descartado por riesgo de inconsistencia.

## 2026-09-10 — Middleware `HandleLocale` (cookie-based, mismo patrón que `HandleAppearance`)

- **Decisión:** nuevo middleware `App\Http\Middleware\HandleLocale` que lee la cookie `locale` (whitelisted a `en`/`es`) y llama `App::setLocale()`. Registrado en `bootstrap/app.php` junto a `HandleAppearance`.
- **Por qué:** el proyecto ya tenía un patrón idéntico para "appearance" (cookie + middleware); reutilizar el mismo patrón mantiene el código consistente y predecible para futuras sesiones de Claude Code.
- **Alternativas:** sesión en vez de cookie — descartado, cookie persiste entre sesiones sin fricción adicional, igual que appearance.

## 2026-09-10 — i18n de frontend: diccionario tipado en vez de librería (react-i18next, etc.)

- **Decisión:** traducciones ES/EN como objetos TS tipados (`resources/js/lib/translations/{en,es}.ts`) + hook `useLocale()` (mismo patrón que `useAppearance()`: `useSyncExternalStore` + cookie + localStorage). Al cambiar de idioma se hace `window.location.reload()` para que los mensajes generados en el backend (validación, Fortify) también se sincronicen.
- **Por qué:** con solo 2 idiomas y alcance MVP, una librería de i18n completa (react-i18next) es sobre-ingeniería. El objeto tipado da autocompletado y errores de compilación si falta una clave.
- **Alcance no cubierto todavía:** los títulos/descripciones estáticos definidos vía `Page.layout = { title, breadcrumbs }` (usados en todas las páginas de auth y settings) quedan sin traducir por ahora — ese mecanismo no es reactivo al locale actual sin un refactor más amplio que toca todas las páginas, no solo login. Pendiente para cuando se aborde la traducción completa de la UI.
- **Si se agregan más idiomas más adelante:** el switch binario (`LanguageToggle`, estilo `ThemeToggle`) deja de alcanzar — pasar a un dropdown de 3+ opciones como `appearance-dropdown` (ver Inventory-Manager).

## 2026-09-10 — Modales de Perfil/Contraseña reusando `Form` + Wayfinder (no `useForm` + `route()`)

- **Decisión:** `profile-modal.tsx` y `password-modal.tsx` replican el patrón visual de Inventory-Manager (Dialog en vez de página completa) pero usan el componente `<Form>` de Inertia + los controllers de Wayfinder (`ProfileController.update.form()`, `SecurityController.update.form()`) ya usados en `pages/settings/*.tsx`, no el helper `route()` clásico que usa Inventory-Manager (ese proyecto usa Ziggy, este starter kit usa Wayfinder).
- **Por qué:** mantener consistencia con el idioma de ruteo que ya trae este starter kit — mezclar Ziggy y Wayfinder en el mismo proyecto sería confuso.
- **Nota:** las páginas completas `settings/profile.tsx` y `settings/security.tsx` (con 2FA/passkeys) se dejaron intactas — los modales son un acceso rápido desde el dropdown de usuario, no un reemplazo.

## 2026-09-10 — Nombre final del producto: Nestwork

- **Decisión:** el producto se llama **Nestwork** (repo de GitHub: `nestwork`). Reemplaza al candidato anterior "Recinto".
- **Por qué:** el usuario pidió explícitamente un nombre en inglés o español/inglés por ser "más comercial" — las rondas anteriores de research (Ágora, Recinto, Trenza, Corrillo, Cardumen, Claustro, Tertulia) terminaron siendo mayormente en español, lo cual no cumplía ese pedido. Se rehizo la búsqueda con candidatos en inglés (Nestwork, Firmchat, Domainly, Staffchat), verificados sin colisión de producto real. El usuario eligió Nestwork sobre la recomendación de Claude Code (Firmchat).
- **Verificación de colisión:** búsqueda web sin resultados de un producto de chat/mensajería activo llamado "Nestwork".

## 2026-09-10 — Fix CI: PHP 8.3 en el workflow no alcanza para las dependencias reales

- **Problema:** el primer push a GitHub falló el workflow `tests` (`composer setup` → `composer install`) con "Your lock file does not contain a compatible set of packages" — los paquetes ya resueltos en `composer.lock` (Symfony 8.x, `laravel/framework` 13.31, `sebastian/*` de Pest) requieren PHP ≥8.4.1, pero `.github/workflows/tests.yml` tenía `php-version: '8.3'`.
- **Causa raíz:** `composer.json` declaraba `"php": "^8.3"`, un mínimo desactualizado — cuando se instaló el proyecto localmente (PHP 8.5), Composer resolvió las versiones más nuevas de las dependencias, que en la práctica ya exigen 8.4+. El CI, en cambio, quedó fijado al mínimo declarado (8.3), no al mínimo real.
- **Mismo patrón ya visto en Inventory-Manager** (ese proyecto corrigió su CI a `php-version: 8.4` en algún momento, aunque `composer.json` ahí sigue en `^8.2` — igual de válido porque `^8.2` es compatible con 8.4, a diferencia del `^8.3` de acá que colisionaba con paquetes que ya pedían 8.4+).
- **Fix:** `.github/workflows/tests.yml` → `php-version: '8.4'`; `composer.json` → `"php": "^8.4"` (refleja la realidad en vez de mentir sobre el mínimo soportado); `composer update --lock` para sincronizar el content-hash sin tocar versiones de paquetes.
- **Regla para evitar que se repita:** cuando se actualicen dependencias mayores de Laravel/Symfony (o cuando falle CI con este mismo mensaje), verificar el PHP mínimo real corriendo `composer why-not php <version-vieja>` o simplemente mirando el mensaje de error de Composer — **no asumir que el `"php"` declarado en `composer.json` sigue siendo el mínimo real**, porque Composer no lo actualiza solo cuando resuelve versiones nuevas de paquetes. Aplica a todos los proyectos Laravel del usuario, no solo a este.

**Segundo problema en el mismo PR:** al arreglar lo anterior, CI volvió a fallar — esta vez en `php artisan migrate --force` (parte del script `composer setup`), con `Connection refused` a Postgres. Causa: `.env.example` ya apuntaba a `pgsql` (lo cambiamos nosotros al documentar el setup real), y `composer setup` copia `.env.example` → `.env` en un runner que no tiene Postgres. Los tests de Pest en sí no se ven afectados (`phpunit.xml` fuerza `DB_CONNECTION=sqlite` + `:memory:` para la suite de tests, independiente del `.env`), pero el paso de "Setup Application" sí necesita una Postgres real. **Fix:** se agregó un `services: postgres:` (imagen `postgres:18`, misma versión que la local) al workflow, con `env:` a nivel de job apuntando a ese servicio — Laravel usa `Dotenv::createImmutable()`, que no pisa variables de entorno del proceso ya existentes, así que el `env:` del job gana sobre lo que trae `.env.example`. Se decidió esto en vez de volver `.env.example` a SQLite para no perder la validación real de que las migraciones corren limpio contra el motor que efectivamente se usa en producción.

## 2026-09-10 — Términos y Condiciones: borrador profesional, mismo patrón que Inventory-Manager

- **Decisión:** `resources/js/components/terms-content.tsx` (fuente única) + `terms-and-conditions-modal.tsx` (modal de solo lectura, enlazado desde el pie del login) — mismo patrón de UX que Inventory-Manager, pero con contenido propio de una plataforma SaaS multi-tenant (no un EULA freeware de un solo negocio).
- **Cubre:** naturaleza del servicio (SaaS, MVP en desarrollo activo), cuentas/Workspaces, propiedad del Contenido del Usuario, privacidad y cifrado (coherente con REQUIREMENTS.md — TLS en tránsito, sin E2EE), retención/borrado (coherente con la regla de "archivar, no borrar"), poderes de administradores de Workspace, uso aceptable, edad mínima, propiedad intelectual, límite de responsabilidad, terminación, ley aplicable.
- **⚠️ Esto es un borrador, no un documento legal validado.** Antes de operar comercialmente falta: (1) revisión por un abogado real (jurisdicción, cumplimiento normativo del mercado objetivo), (2) completar los placeholders `[ENTRE CORCHETES]` (jurisdicción, razón social/titular, correo de contacto legal) — no se inventaron esos datos porque no están definidos todavía.
- **No construido en esta sesión:** el paso de aceptación obligatoria post-login (checkboxes + bloqueo de acceso + `terms_version` versionado), que si existe en Inventory-Manager (`accept-terms.tsx` + `config/legal.php`) — requiere una columna nueva en `users` (o tabla de aceptaciones), así que se propone como diseño aparte antes de construirlo, no se coló de arriba.

## 2026-09-10 — Paridad visual real con Inventory-Manager + bug de modales

- **Bug encontrado y corregido:** los modales de Perfil/Contraseña no abrían — el estado `open`/`setOpen` vivía dentro de `UserMenuContent`, que se renderiza dentro de `DropdownMenuContent`. Radix desmonta todo el contenido del dropdown al cerrarse, así que el modal se cerraba de inmediato junto con el menú que lo abría. Se corrigió subiendo el estado un nivel (a `nav-user.tsx` y `app-header.tsx`, los dos puntos donde se renderiza el menú de usuario), pasando `onOpenProfile`/`onOpenPassword` como callbacks — exactamente el patrón que ya usa Inventory-Manager (`nav-user-menu.tsx`), que tiene el comentario explicando esta misma razón.
- **`ui/dialog.tsx` alineado con Inventory-Manager:** overlay con `bg-black/70 backdrop-blur-sm` (antes `bg-black/80` sin blur); botón de cerrar rediseñado como círculo gris sólido (antes una X fantasma casi invisible); ancho del contenido con `w-[calc(100%-2rem)]` en vez de `max-w-[...]` (evita que el margen se pierda en breakpoints medianos, mismo fix que ya tenían documentado).
- **Cierre solo por botón "X":** `onInteractOutside={(e) => e.preventDefault()}` agregado a los modales de Perfil y Contraseña (formularios con datos que se perderían con un clic accidental) — mismo patrón que Inventory-Manager usa en sus modales de formulario. El modal de Términos y Condiciones (solo lectura) se deja con el comportamiento default, igual que en Inventory-Manager.
- **Footer de sidebar reemplazado:** se sacaron los links genéricos del starter kit ("Repository"/"Documentation", apuntando al repo del starter kit de Laravel, no a Nestwork) tanto de la sidebar como del header — se reemplazaron por versión + "Novedades" + copyright, igual que Inventory-Manager. El link "Dashboard" se mantuvo porque es una ruta real de la app, no boilerplate.
- **Sistema de versionado/changelog completo, no simplificado:** por pedido explícito del usuario ("debe hacerse desde ahora"), se portó el pipeline completo de Inventory-Manager — `CHANGELOG.md` como fuente de verdad, `scripts/generate-changelog.mjs` genera `resources/js/version.ts` en cada `build`/`dev` (hooks `prebuild`/`predev` en `package.json`), `version.ts` gitignorado igual que en Inventory-Manager. El modal de Novedades usa el componente `Select` que ya existía en el proyecto en vez de portar el `Combobox` propio de Inventory-Manager — misma función (elegir versión, ver su detalle), sin sumar un componente nuevo.
- **No portado (por ahora):** personalización de color de la sidebar — es una decisión de diseño real y nueva (no una réplica de algo ya definido), queda para la ronda de mockups en vez de improvisarse en código.

## Pendiente / no cubierto en esta sesión

- No se escribieron tests nuevos para `HandleLocale` ni para los modales (violación puntual de la política de TDD bloqueada en 2.1 — se hizo así por la urgencia de dejar el entorno andando; hay que volver y cubrir esto antes de dar por cerrada esta porción de trabajo).
- Traducción de títulos estáticos de página (`Page.layout`) pendiente, ver nota arriba.
- La carpeta local y el sitio de Herd siguen llamándose `chat-app` — el nombre de marca/repo ya es `Nestwork` (ver entrada de abajo), pero renombrar la carpeta es un paso aparte, no aplicado todavía.
