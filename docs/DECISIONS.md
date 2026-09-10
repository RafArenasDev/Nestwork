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

## Pendiente / no cubierto en esta sesión

- No se escribieron tests nuevos para `HandleLocale` ni para los modales (violación puntual de la política de TDD bloqueada en 2.1 — se hizo así por la urgencia de dejar el entorno andando; hay que volver y cubrir esto antes de dar por cerrada esta porción de trabajo).
- Traducción de títulos estáticos de página (`Page.layout`) pendiente, ver nota arriba.
- La carpeta local y el sitio de Herd siguen llamándose `chat-app` — el nombre de marca/repo ya es `Nestwork` (ver entrada de abajo), pero renombrar la carpeta es un paso aparte, no aplicado todavía.
