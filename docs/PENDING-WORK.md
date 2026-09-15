# Pendiente — punto de continuación (2026-09-15, sesión 3 — rediseño "liquid glass")

> **Regla de frontend que sigue vigente:** todo diseño/interacción de UI
> usa el skill `apple-design` — nada de librerías de diseño/animación
> nuevas. Excepciones concretas: `emoji-picker-react` (utilidad
> funcional, reskineada), extensiones de Tiptap ya instaladas, y el
> Combobox de shadcn/ui (ya existía en el proyecto, se empezó a usar
> también para selects de una sola opción como la duración del estado).
>
> Esta sesión se hizo completa en la rama `feat/liquid-glass-visual-polish`
> (4 rondas de feedback iterativo), commiteada/pusheada/mergeada a
> `main` al cierre — ver "Cómo retomar" para el commit real.

## Qué quedó terminado esta sesión — reconstrucción visual completa

Reemplazo del chrome de toda la app (mini-sidebar, sidebar, header y
composer del chat, menús, modales, burbujas, Home, Settings/Teams) por
un sistema de diseño nuevo ("Aurora" / liquid glass), a partir de un
mockup de referencia del usuario, adaptado con criterio propio (no
copiado literal — ver decisiones de abajo).

**Primitivos compartidos con "glass" real** (`ui/dropdown-menu.tsx`,
`ui/popover.tsx`, `ui/dialog.tsx`, `ui/alert-dialog.tsx`, `ui/sheet.tsx`):
blur + opacidad correctos en los DOS temas — el bug de fondo era que el
blur en oscuro se pintaba sobre `--popover` (casi negro) en vez de un
tinte blanco; con la fórmula `rgba(255,255,255,alpha)` (alpha bajo en
oscuro, alto en claro) se resuelve para cualquier superficie. Dos
tiers: `.glass-panel`/`.glass-panel-edge-*` (sutil, para chrome
ambiental como header/composer) y `.glass-popover` (opacidad fija
garantizada, para menús/modales con texto denso).

**Mini-sidebar** (`curved-nav-rail.css`/`.tsx`): la técnica vieja de
"gotera"/curve-outside (muescas cóncavas, `background-attachment:fixed`
compartido) se BORRÓ por completo — reemplazada por un dock simple
(ítems redondeados, barra de acento a la izquierda del activo). Mucho
menos CSS fràgil que antes.

**Sidebar expandida** (`sidebar-list.css`/`app-sidebar.tsx`): decisión
de arquitectura clave (confirmada explícitamente por el usuario tras
un primer intento equivocado) — la sidebar es chrome, **siempre
oscura, con el MISMO tono en claro y oscuro** (igual que la mini);
sólo el CONTENIDO (Home/chat/Settings) sigue el tema. La
personalización de color (`data-sidebar` reemplazado por variables
puestas directo desde JS, ver `use-customization.tsx`) es un TINTE
sobre ese tono fijo, nunca lo reemplaza — "Ninguno" conserva el tono
base, nunca queda "sin tema". Buscador SIEMPRE visible en el header de
la sidebar (antes sólo en algunos módulos). Filas de conversación sin
"card" (sin borde/sombra por fila) — selección = relleno sólido, no
borde+tinte.

**Header y composer del chat**: dejaron de ser tarjetas flotantes con
margen — ahora son barras a todo el ancho con blur y un solo borde
(`.glass-panel-edge-b`/`.glass-panel-edge-t`), mismo criterio "chrome
a todo el ancho, sin redondear" que el resto.

**Burbujas de mensaje** (`pages/messages/index.tsx`): recoloreadas al
sistema nuevo, con color de "burbuja propia" personalizable (antes
fijo). **Bug real resuelto**: el pico se veía de un color distinto a
la burbuja — dos elementos pintando el mismo degradé 135deg cada uno
sobre su propia caja (300px vs 12px) calculan extremos de color
distintos. Fix: el pico usa un sólido (el stop final del degradé,
`--bubble-sent-tail`), no el degradé repetido.

**Modal de Ajustes** (`components/settings-modal.tsx`, nuevo — dentro
del dropdown del avatar, ya no un ícono de engranaje aparte ni un
drawer lateral): layout tipo macOS System Settings (rail de tabs
Estado/Apariencia + panel ancho, sin scroll). Incluye:

- **Estado**: texto + emoji personalizado (reusa `ReactionPickerButton`),
  duración real vía Combobox (15 min / 30 min / 1 h / 2 h / 4 h / hoy /
  1 día / 1 semana / fecha y hora exacta con `datetime-local`) — el
  backend ya tenía la columna `status_expires_at` sin usar desde
  2026-09-11 y `User::activeStatusPreset()` ya sabía leerla; sólo se
  tocó `UserStatusController::update` para aceptar `duration_minutes`
  (no fue necesaria una migración nueva).
- **Apariencia**: selector de tema tipo iOS (3 miniaturas con preview
  real, no texto), paleta de 12 colores (gradiente+sólido, nombres
  "tech" — Cobalt/Graphite/Obsidian/Titanium/etc., a propósito nada
  floral) compartida entre sidebar y burbujas, intensidad de glass con
  slider propio (`.glass-slider` en `app.css`, ya no el control nativo
  del navegador) que de verdad cambia blur+opacidad juntos, densidad de
  mensajes en 3 niveles reales (Minimalista/Cómoda/Compacta — cambian
  padding/tamaño de avatar/sombra, no sólo el margen), tamaño de
  interfaz (chico/mediano/grande, escala texto e íconos vía un único
  `font-size` en `html`).

**Home y Settings/Teams**: stat tiles con material real (antes
`rounded-xl border` plano), filas de "chats recientes"/equipos/
miembros pasadas de tarjetas con sombra a listas planas tipo Apple
Settings (`divide-y`, hover, sin borde por fila). Toggle de tema
duplicado (sidebar + settings) eliminado — vive sólo en Ajustes, con
detección de tema del sistema por defecto ya existente desde antes
(`use-appearance.tsx`).

**Decisión de arquitectura deliberada**: NO se copió el mockup literal
(tarjeta centrada de tamaño fijo flotando sobre fondo ambiental) — se
mantuvo el layout a todo el viewport (como Slack/Discord/Teams) porque
habrá apps desktop/Android/iOS/tablet, donde una tarjeta de tamaño fijo
no sirve.

Verificado en verde antes del cierre de sesión: Pint, PHPStan
(`types:check`), `vp check` (lint+format), `tsc --noEmit`, build de
producción, suite Pest completa (125 tests / 441 aserciones).

## ⚠️ Pendiente crítico heredado — bug real, causa raíz encontrada, sin fix

**No se tocó esta sesión** (era explícitamente visual). Resumen: al
enviar un mensaje con adjunto, el remitente ve para siempre la vista
previa local (`blob:`) en vez de la real — el POST devuelve 503
(probable timeout del proxy de Herd/prod durante la conversión síncrona
de preview), así que Inertia nunca recibe el redirect que reconcilia
el mensaje optimista. Diagnóstico completo y 3 caminos de fix evaluados
en el historial de git de este archivo (commit de la sesión 2 de ese
mismo día, "sesión 2 — 2026-09-15" antes de este rediseño). Sigue
siendo lo primero a resolver cuando retome trabajo de backend/tiempo
real.

## Pendientes nuevos de esta sesión (rediseño)

1. **Responsive real / navegación tipo bottom-tabs para apps nativas**:
   pedido explícito del usuario (habrá desktop/Android/iOS/tablet) —
   discutido pero deliberadamente fuera de alcance de esta ronda (era
   visual de escritorio). El layout a todo el viewport elegido en vez
   del mockup centrado ya lo tiene en cuenta, pero falta el trabajo real
   de breakpoints + navegación alternativa en pantalla angosta.
2. **Formularios de Perfil/Team name** (`settings/profile.tsx`,
   `teams/edit.tsx` — el input, no las filas que sí se tocaron):
   siguen con el Input default de shadcn (radio chico), no se
   uniformaron al lenguaje más redondeado del resto del rediseño — bajo
   impacto, pendiente menor.
3. **`status_expires_at` es de vencimiento "perezoso"**: `User::activeStatusPreset()`
   ya lo trata como vencido al leerlo, pero no hay job que limpie
   `status_text`/`status_emoji` de la fila cuando vence sin que el
   usuario vuelva a tocar nada — cosmético (el badge visual ya no lo
   muestra), pero la fila queda con datos viejos en la base.
4. **Paleta de color no se probó con daltonismo/contraste WCAG** —
   los 12 presets se eligieron a ojo, no se corrió ningún check de
   contraste automático (texto blanco sobre cada preset, sobre todo
   los más claros como Titanium/Ocean).

## Pendientes menores heredados de sesiones anteriores (sin tocar)

1. Multi-adjunto por mensaje (diferido a propósito).
2. "Editar" visible sólo mientras corre el tiempo permitido,
   independiente del estado de envío.
3. Reacciones y ediciones reflejadas en "Actividad" (pedido dos veces).
4. Probar el pipeline de preview de documentos con un `.docx`/`.xlsx`
   real (sólo se verificó con PDF).

## Qué NO se tocó a propósito

- Cifrado E2E/conversación secreta (Épica 6.6, espera brainstorming
  aparte), separar Canales/Grupos/DMs (Épica 6.2), autenticación
  alternativa (Épica 6.7), menciones/búsqueda global.
- La pantalla de login/registro — ya estaba bien, confirmado por el
  usuario, no se tocó salvo lo que ya tenía el material glass de antes.

## Cómo retomar

1. Bug crítico del adjunto/503 (ver sección de arriba) sigue siendo lo
   más visible para un usuario real — recomendado antes que nada nuevo.
2. Responsive/bottom-nav para móvil es el siguiente bloque grande de
   diseño, ya con la base (chrome a todo el viewport) puesta para eso.
3. Pendientes menores en el orden que priorice el usuario.
