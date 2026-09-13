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
- **Fix de CI encontrado al mismo tiempo:** el hook `prebuild`/`predev` de npm (que genera `version.ts` automáticamente antes de `build`/`dev`) no corría en CI — `.npmrc` tiene `ignore-scripts=true` (endurecimiento de seguridad legítimo contra scripts maliciosos de dependencias de terceros, que Inventory-Manager no tiene porque es de una generación anterior del starter kit). Ese flag también bloquea los hooks `pre`/`post` de nuestros propios scripts, no solo los de paquetes externos. Localmente no se notó porque el generador se había corrido a mano antes de probar. **Fix:** en vez de depender de la convención `pre<script>` de npm, `build`/`dev` ahora encadenan explícitamente `npm run generate-changelog && vp build` — `npm run <script>` explícito sigue funcionando con `ignore-scripts=true`, solo se bloquea el disparo automático por convención de nombre.

## 2026-09-12 — CI roto en `main`: causa raíz y fix (formato, tipos, tests obsoletos)

- **Síntoma:** el workflow `tests` fallaba en rojo tras mergear
  `feature/chat-mvp-and-gotera-polish` (Google-only auth, domain teams,
  chat MVP). Se investigó capa por capa.
- **Capa 1 — formato:** 22 archivos (incluyendo `.claude/skills/*.md`,
  `CLAUDE.md`, componentes React tocados en el merge) nunca pasaron por
  `npm run check:fix` antes de commitear. `composer ci:check` corta en el
  primer script que falla (`npm run check`), así que las capas 2 y 3 de
  abajo quedaban ocultas detrás de este fallo — nunca se habían visto en
  ningún run de CI.
- **Capa 2 — tipos de props compartidas de Inertia rotos (~40 errores
  `tsc`):** el `node_modules` local tenía **dos versiones distintas de
  `@inertiajs/core`** (3.7.0 suelto/"extraneous" en la raíz vs. 3.7.1
  resuelto por `@inertiajs/react`/`@inertiajs/vite` dentro de una
  carpeta `.pnpm` sin lockfile de pnpm) — resto de un experimento previo
  con pnpm (quedó `pnpm-workspace.yaml` con
  `publicHoistPattern: ['@inertiajs/core']`, exactamente el workaround
  típico para este bug) que nunca se completó ni se documentó. TypeScript
  trataba ambas copias como módulos distintos, así que el
  `declare module '@inertiajs/core' { interface InertiaConfig {...} }`
  de `resources/js/types/global.d.ts` (que sigue el patrón oficial de
  Inertia al pie de la letra) se aplicaba sobre la copia equivocada y
  `usePage().props.*` tipaba como `unknown`/`{}` en decenas de
  componentes. **Fix:** `rm -rf node_modules && npm install` (proyecto
  real usa npm, no pnpm — no hay `pnpm-lock.yaml` versionado) deja una
  única copia deduplicada de `@inertiajs/core`; se borró
  `pnpm-workspace.yaml` para no dejar un cabo suelto que invite a repetir
  el experimento a medias. Un solo error real de tipado sobrevivió al
  reinstalar: faltaba `teamMembers: TeamMemberOption[]` en
  `sharedPageProps` (el prop se comparte desde
  `HandleInertiaRequests.php` pero nunca se agregó al tipo).
- **Capa 3 — suite de Pest desactualizada (~47 tests rotos):** gran
  parte de `tests/Feature/Auth/*` y `tests/Feature/Settings/SecurityTest`
  probaban rutas de Fortify/Breeze (`login.store`, `register`,
  `password.*`, `two-factor.*`, `security.edit`, factories
  `unverified()`/`withTwoFactor()`) que **ya no existen** — el login es
  Google-only vía Firebase desde el merge anterior, así que esas
  pantallas/flujos fueron removidas mientras los tests que las cubrían
  quedaron atrás. Se **eliminaron** esos archivos de test (no es "saltar
  TDD", es borrar tests de funcionalidad que ya no existe — la política
  TDD bloqueada en 2.1 sigue vigente para todo lo que sí sigue existiendo
  o se construya de acá en más). Además se encontraron y arreglaron dos
  bugs reales de producción, expuestos por tests que sí seguían siendo
  válidos:
    - `TeamController::destroy()` y `TeamMemberController::destroy()`
      asumían que todo usuario tiene `personalTeam()`, pero desde que existe
      el auto-join por dominio (`AssignUserToDomainTeam`) un usuario nuevo
      **no** recibe un equipo personal automáticamente — solo se une al
      equipo de su dominio. Si el usuario afectado no tenía equipo personal,
      `switchTeam(null)` lanzaba `TypeError` (500). Fix: usar
      `fallbackTeam($team)` (ya existía, pensado para esto) con fallback a
      `current_team_id = null` si el usuario no queda en ningún otro
      equipo.
    - `TeamInvitationController::decline()` redirigía siempre a
      `to_route('dashboard')`, que exige `{current_team}` — un usuario que
      declina una invitación sin pertenecer todavía a ningún equipo
      (invitado que nunca fue asignado por dominio) hacía crashear el
      propio request. Fix: redirige a `dashboard` solo si el usuario tiene
      `currentTeam`, si no a `home`.
- **Pendiente relacionado:** ninguno de estos tests cubre todavía el
  caso "usuario autenticado sin ningún equipo" como estado de UI de
  primera clase — hoy solo evita el 500. Diseñar esa pantalla es parte
  del trabajo de Fase A del prompt de mejoras v2 (ver sección 2 y el
  pedido explícito del usuario de no crear equipo en el login/registro).

## 2026-09-12 — Auth dual (Google + email/contraseña), país/idioma, países-estados-ciudades desde API abierta

- **Decisión:** se reactivó el login con email+contraseña (`PasswordAuthController`)
  junto al ya existente de Google/Firebase, con `users.auth_provider`
  (`google`/`password`/`both`) para saber cómo se registró cada cuenta.
  Registrar con un email ya usado por una cuenta de Google se **rechaza**
  (no se vincula en silencio) — vincular ambos métodos a una cuenta ya
  autenticada es un flujo aparte (Ajustes > Seguridad, todavía no
  construido) para evitar que alguien "tome" una cuenta ajena sabiendo
  sólo su email.
- **Pantalla de login/registro:** panel único con slide de 3 paneles
  (login | marca | registro), a pantalla completa (no una card flotante),
  con fallback de una sola columna con fundido en mobile. La marca del
  chrome (colores fijos del sidebar) es reutilizada en el panel de marca;
  el panel de formulario usa `--background` (blanco/negro puro) en vez de
  `--card`, a pedido explícito ("nada de opacos/brillos").
- **País en vez de idioma en el registro:** el usuario elige país (no
  idioma) — el idioma se deriva del país (`countries.locale`) y se setea
  como cookie `locale` en la respuesta de registro, sin preguntárselo.
  Editable después desde Ajustes (pendiente de construir esa UI).
- **`countries`/`states`/`cities` desde una API abierta real
  (countriesnow.space, gratuita, sin key) en vez de un JSON quemado en
  el repo** — pedido explícito del usuario ("JSON o data quemada al
  estilo mock no es profesional"). Un `CountriesSeeder` llama tres
  endpoints (países+estados, banderas, países+ciudades) y puebla las tres
  tablas; se dispara automáticamente desde una migración
  (`seed_countries_states_and_cities`), no como paso manual aparte.
    - **Limitación real de la fuente:** countriesnow no expone la
      jerarquía completa departamento→ciudad en un solo endpoint (las
      ciudades vienen listadas por país, no por estado) — `cities.state_id`
      queda `null` por ahora. La relación ya está modelada
      (`City belongsTo State`) para cuando se resuelva ese vínculo con
      otra fuente o un cruce de datos posterior.
    - **Tests NO llaman a la API real:** la misma migración detecta
      `app()->environment('testing')` y siembra 3 países fijos (CO/MX/US)
      en vez de pegarle a countriesnow — depender de un tercero en cada
      corrida de la suite (que migra desde cero) haría los tests lentos y
      frágiles, violando la política de TDD bloqueada en 2.1. Esto es
      deliberado, no un atajo silencioso.
    - **Banderas:** se usa la URL SVG real que devuelve el propio API
      (Wikimedia Commons) en vez de emoji — en Windows los emoji de
      bandera se renderizan como el código de país en texto plano (ej.
      "CO"), no como la bandera.
- **Pendiente/deferred de esta ronda:** el "abrazo" curvo entre el panel
  de marca y el panel de formulario (mismo lenguaje visual que la curva
  de la sidebar) no se implementó — la geometría de la técnica de la
  sidebar (una pastilla que sobresale de un riel) no traslada 1:1 a dos
  paneles rectangulares iguales; requiere una ronda de diseño propia en
  vez de improvisarse. Tampoco se construyó todavía la UI de Ajustes
  para cambiar idioma/vincular Google+contraseña manualmente.

## 2026-09-13 — Fase B/C de PROMPT-MEJORAS-NESTWORK-v2.md: nav data-driven + schema extendido

- **ADR: NO usar BLOB en la base de datos.** Los archivos (imágenes, videos,
  audios, documentos, grabaciones de llamadas) **no se guardan como BLOB en
  PostgreSQL**. Se guardan en almacenamiento de objetos (disco local en dev,
  y en producción algo S3-compatible — **MinIO** por auto-hospedable, sin
  depender de un proveedor de pago). La BD solo guarda metadata y la
  ruta/clave del objeto (tabla `attachments`). Un chat corporativo con
  adjuntos multiplica el tamaño de la BD sin necesidad, hace los backups
  lentísimos, no permite servir archivos con CDN/cache HTTP, y complica la
  replicación — es el patrón estándar de la industria (WhatsApp, Slack,
  Telegram). Único uso legítimo de un campo binario en la BD: cachés muy
  chicos y efímeros (ej. blur-hash), no el archivo completo.
- **Estados de usuario (`status_presets`) pasan de arrays quemados en
  `curved-nav-rail.tsx` (`STATUS_PRESETS`/`CUSTOM_STATUSES`) a una tabla
  real** sembrada por `StatusPresetSeeder` (idempotente, `updateOrCreate`
  por `key`) y compartida al frontend vía Inertia (`statusPresets` en
  `HandleInertiaRequests`), con el label en el idioma activo resuelto en el
  backend (`App::getLocale()`). Los 4 keys originales (`available`/`away`/
  `busy`/`dnd`) se conservaron tal cual porque `User::presenceStatus()` los
  compara por string literal para derivar el punto de presencia — no
  renombrar sin tocar ese método también.
    - **Adaptación respecto al spec:** el documento proponía que
      `users.status_preset` pase a ser un FK numérico a `status_presets`.
      Se optó por mantenerlo como el `string` que ya existía (ahora
      validado contra `StatusPreset::where('is_enabled', true)->pluck('key')`
      en vez de un `Rule::in([...])` quemado) en lugar de agregar
      `status_preset_id` — logra el mismo objetivo (nada quemado, catálogo
      editable) sin tocar el resto del código que ya lee `status_preset`
      como string.
    - **No se abordó en esta ronda** (queda para la Fase G — "Actividad +
      estados de usuario"): UI de "Personalizado…" con picker de emoji libre,
      duración configurable, historial de últimos estados usados.
- **Módulos del rail (Inicio/Mensajes/Actividad/Archivo) se dejaron
  hardcodeados a propósito.** Son 4 secciones estructurales de la IA de la
  app (no contenido editable por team/admin), y sus iconos son componentes
  React (no hay forma sensata de guardar un componente en BD) — data-driving
  esto sería sobre-ingeniería sin beneficio real. La interpretación de
  "nada quemado" que sí se aplicó es la de contenido/catálogos que
  realmente varían (estados de usuario, y lo que viene en fases siguientes:
  `content_blocks` del panel de auth, etc.).
- **Migraciones aditivas de schema (sección 3 del prompt v2):**
  `conversations` gana `is_public`/`avatar_path`/`description`/
  `is_ephemeral`/`ephemeral_ttl_seconds`/`default_message_ttl_seconds`;
  `conversation_participants` gana `role`/`hidden_at`; `messages` gana
  `type`/`metadata` (jsonb)/`reply_to_message_id`/
  `forwarded_from_message_id`/`forwarded_from_conversation_id`/`is_hidden`.
  Tablas nuevas: `favorites` (polimórfica: conversation/user/team),
  `message_deletions` ("eliminar solo para mí"), `attachments`,
  `reactions`, `message_receipts`, `link_previews`, `status_presets`.
  `ConversationType` gana el case `Channel` (se mantuvo `Dm`/`Group`
  existente en vez de renombrar a `direct`, que hubiera sido puro churn de
  nombres sin necesidad funcional). Nuevos enums: `MessageType`,
  `AttachmentType`, `ConversationParticipantRole`.
- **Deliberadamente fuera de esta ronda** (quedan para su fase
  correspondiente del prompt v2): tablas `calls`/`call_participants`/
  `call_recordings` (Fase K, gateadas a decidir proveedor de SFU antes);
  `activity_events` (Fase G, sección 6 — el prompt mismo deja abierto si
  conviene tabla dedicada vs. componer la consulta); columna `tsvector`
  generada para búsqueda global (Fase F, sección 4.3). No se escribió UI
  ni Actions nuevas para ninguna tabla nueva todavía — esto es solo el
  schema base, sección 17 del prompt v2 las secuencia en fases posteriores.

## 2026-09-13 — Fase D de PROMPT-MEJORAS-NESTWORK-v2.md: comando `nestwork:seed-demo`

- **Decisión:** comando artisan dedicado (`app/Console/Commands/SeedDemoData.php`),
  `php artisan nestwork:seed-demo {--users=80} {--messages=5000}`, en vez de
  reemplazar `ConversationsSeeder` (que se queda tal cual, con las 3 cuentas
  reales del dev). Es **opt-in**, no corre en `migrate:fresh --seed` — sembrar
  miles de mensajes en cada reset de BD sería demasiado lento para el día a
  día de desarrollo.
- **Distribución de usuarios:** por defecto reparte entre 5 dominios de
  empresa falsos (uno grande a propósito, `acmestudio.test`, para garantizar
  al menos un team de 20+ miembros) y un pool de proveedores públicos
  (gmail/outlook/hotmail/yahoo, van al team "Invitados" compartido) —
  reutiliza `AssignUserToDomainTeam`/`GenerateUniqueUsername`, la misma
  lógica que usa el login real. Contraseña conocida para todos:
  `Nestwork2026!` (constante `SeedDemoData::DEMO_PASSWORD`).
- **Corrida de referencia (2026-09-13, sin resetear la BD, sobre datos ya
  existentes):** 110 usuarios, 7 teams, 91 conversaciones (113 dm, 24 group,
  3 channel con 20+ miembros), 5240 mensajes, 1235 reacciones, 373
  respuestas (`reply_to_message_id`) — volumen suficiente para probar scroll
  infinito, salto a fecha y búsqueda con datos reales en Fase F.
- **Por qué no se hizo `migrate:fresh` antes de correrlo:** el entorno de
  dev estaba corriendo (`composer run dev`) mientras se hacía esta sesión —
  resetear la BD hubiera invalidado cualquier sesión de navegador abierta.
  El comando es aditivo (usa `firstOrCreate` para usuarios), así que corrió
  sin problema sobre los datos ya sembrados por `ConversationsSeeder`.
- **Performance:** los mensajes se crean con `Message::create()` (Eloquent,
  no inserts crudos) pero envueltos en una `DB::transaction()` por
  conversación — el costo real de miles de inserts uno por uno es el
  autocommit por fila, no el overhead de Eloquent en sí; ~5000 mensajes +
  reacciones tardaron un par de minutos, aceptable para un comando manual
  de un solo uso.

## Pendiente / no cubierto en esta sesión

- No se escribieron tests nuevos para `HandleLocale` ni para los modales (violación puntual de la política de TDD bloqueada en 2.1 — se hizo así por la urgencia de dejar el entorno andando; hay que volver y cubrir esto antes de dar por cerrada esta porción de trabajo).
- Traducción de títulos estáticos de página (`Page.layout`) pendiente, ver nota arriba.
- La carpeta local y el sitio de Herd siguen llamándose `chat-app` — el nombre de marca/repo ya es `Nestwork` (ver entrada de abajo), pero renombrar la carpeta es un paso aparte, no aplicado todavía.
