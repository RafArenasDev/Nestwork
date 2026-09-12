# Prompt maestro — Rediseño y features avanzadas de Nestwork

> **Cómo usar este archivo:** pégalo completo como instrucción a Claude Code, o dile
> "lee `PROMPT-MEJORAS-NESTWORK.md` y ejecuta la Fase 1". Está pensado para
> ejecutarse **por fases** (sección 12), no todo de una sola sentada. Cada fase
> termina en un estado funcional y testeado, nunca a medias.

---

## 0. Contexto para Claude Code

Proyecto: **Nestwork** (Laravel 13 + Inertia + React 19 + Tailwind 4 + shadcn/ui,
PostgreSQL, Reverb pendiente de instalar). Multi-tenant por `team_id`. Login solo
Google/Firebase. Ver `CLAUDE.md`, `README.md`, `docs/*` para el resto de reglas
del proyecto — **no las repito acá, este archivo es un anexo funcional**, no
reemplaza el brief general.

**Estado actual (no tocar el estilo, sólo la fuente de datos):** ya existe una
mini-sidebar negra (iconos: Inicio, Mensajes, Notificaciones, Archivo) y una
sidebar expandida (Inicio → Bienvenida/Novedades/Guía rápida; Mensajes → lista
de conversaciones; selector de equipo arriba; menú de usuario abajo con
Profile/Log out). El look (dark glass, iconografía lineal, avatares con
iniciales, badge de tema) **se conserva**. Lo que cambia es:

1. De dónde salen esos items (hoy están quemados en componentes → deben salir
   de base de datos).
2. Qué hay dentro del panel de chat (header, burbujas, composer, llamadas).
3. Un rediseño puntual del header de conversación y la posición del toggle de tema.

---

## 1. Principio rector

> **Nada de títulos, iconos, rutas ni orden de sidebar/mini-sidebar puede estar
> quemado en el código.** Todo sale de tablas en BD, con seeders idempotentes,
> para que un admin (o una migración futura) pueda agregar/quitar/reordenar
> ítems sin tocar componentes React.

La mini-sidebar sigue siendo **siempre negra** (no personalizable). La sidebar
expandida sí permite personalizar color de fondo (sección 8).

---

## 2. Modelo de datos: navegación data-driven

### 2.1 Tabla `mini_sidebar_items`

Representa los iconos verticales de la barra angosta (Inicio, Mensajes,
Notificaciones, Archivo, y lo que se agregue: Llamadas, Favoritos, Ajustes…).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid/bigint pk | |
| `key` | string unique | slug estable (`home`, `messages`, `notifications`, `archive`, `calls`, `favorites`) — el código referencia por `key`, nunca por id |
| `icon` | string | nombre del icono (lucide-react), ej. `home`, `message-circle` |
| `label_es` / `label_en` | string | usado como `aria-label` y tooltip |
| `route_name` | string nullable | nombre de ruta Laravel/Inertia a resolver |
| `order` | integer | orden de aparición |
| `badge_source` | enum nullable | `unread_messages`, `unread_notifications`, `none` — de dónde saca el número del badge |
| `visible_roles` | jsonb nullable | null = todos; o `["owner","admin"]` |
| `is_active_match` | string nullable | patrón de ruta para resaltar el icono activo |
| `is_enabled` | boolean default true | permite desactivar sin borrar |
| `divider_after` | boolean default false | para separar visualmente (ej. antes de Ajustes) |

### 2.2 Tabla `sidebar_sections`

Agrupadores dentro de la sidebar expandida (hoy: "Inicio" agrupa
Bienvenida/Novedades/Guía rápida; a futuro: "Chats", "Favoritos", "Equipos").

| Campo | Tipo | Notas |
|---|---|---|
| `id` | pk | |
| `key` | string unique | `home_group`, `chats_group`, `favorites_group`... |
| `mini_sidebar_item_key` | fk a `mini_sidebar_items.key` | a qué icono de la mini-sidebar pertenece esta sección |
| `title_es` / `title_en` | string nullable | título visible de la sección (algunas no llevan, como la lista de chats) |
| `order` | integer | |
| `is_collapsible` | boolean | si el usuario puede colapsarla (se guarda en `user_preferences`) |
| `is_enabled` | boolean default true | |

### 2.3 Tabla `sidebar_items`

Los ítems de contenido dentro de una sección (Bienvenida, Novedades, Guía
rápida hoy; a futuro también puede alimentar listas semi-estáticas como
accesos directos fijados).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | pk | |
| `sidebar_section_key` | fk | |
| `key` | string unique | `welcome`, `whats_new`, `quick_guide` |
| `icon` | string nullable | |
| `label_es` / `label_en` | string | |
| `route_name` | string nullable | |
| `order` | integer | |
| `badge_type` | enum nullable | `dot_new`, `count`, `none` — ej. punto rojo en "Novedades" si hay versión no vista |
| `content_source` | enum nullable | `markdown_static`, `changelog_generated`, `custom_component` — de dónde saca el contenido del panel derecho |
| `content_key` | string nullable | referencia al contenido (ver 2.4) |
| `visible_roles` | jsonb nullable | |
| `is_enabled` | boolean default true | |

### 2.4 Tabla `content_blocks` (contenido de Bienvenida/Novedades/Guía)

Para que el contenido del panel "Bienvenida" tampoco esté quemado en JSX.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | pk | |
| `content_key` | string unique | `welcome_intro`, `quick_guide_steps`, etc. |
| `type` | enum | `markdown`, `card_grid`, `stat_cards` |
| `payload` | jsonb | estructura libre según `type` (título, texto, lista de tarjetas con icono+texto+link) |
| `locale` | string | `es` / `en`, una fila por idioma o payload con ambas claves — decidir en implementación y documentar en `docs/DECISIONS.md` |
| `is_enabled` | boolean | |

> El changelog (`whats_new`) **sigue generándose en build time** desde
> `CHANGELOG.md` como ya está documentado — no migrar eso a BD, sólo el ítem de
> menú que apunta a él.

### 2.5 Campos que faltan y deberías agregar ya

Sidebar grande (secciones/ítems a futuro, crear ahora los `keys` aunque el
feature no esté implementado, para no migrar de nuevo):

- **Favoritos** (sección con sub-tabs: Personas / Equipos / Grupos / Canales).
- **Chats** con filtros: Todos / No leídos / Grupos / Directos.
- **Equipos** (si el usuario pertenece a más de uno, además del selector arriba).
- **Llamadas** (historial de llamadas entrantes/salientes/perdidas).
- **Ajustes** (acceso directo, redunda con el menú de usuario pero muchas apps
  lo dejan también en sidebar — Slack y Teams lo hacen).

Mini-sidebar, ítems a futuro:

- `calls` (icono teléfono) con badge de llamadas perdidas.
- `favorites` (icono estrella).
- Footer fijo (no forma parte de la tabla, se queda como está): selector de
  equipo arriba, avatar+menú de usuario abajo.

### 2.6 Tabla `user_preferences` (una fila por usuario)

Necesaria para casi todo lo que sigue (tema, colores, orden personalizado).

| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | fk pk | |
| `theme_mode` | enum | `light`, `dark`, `system` |
| `sidebar_color` | string nullable | hex o key de preset (sección 8) |
| `sidebar_collapsed_sections` | jsonb | array de `sidebar_section.key` colapsadas |
| `chat_density` | enum | `comfortable`, `compact` |
| `font_scale` | enum | `sm`, `md`, `lg` (sección 9) |
| `locale` | string | `es`/`en` |
| `notification_sound_enabled` | boolean | |
| `show_read_receipts` | boolean | si comparte "visto" a otros (reciprocidad tipo WhatsApp: si lo apagas, tampoco ves el de otros) |

### 2.7 Seeders obligatorios

- `MiniSidebarItemsSeeder`: inserta `home`, `messages`, `notifications`,
  `archive`, `calls`, `favorites` (los dos últimos `is_enabled=false` hasta que
  se implementen, para no romper nada, pero con la fila lista).
- `SidebarSectionsSeeder` + `SidebarItemsSeeder`: `home_group` (welcome,
  whats_new, quick_guide) tal cual existe hoy.
- `ContentBlocksSeeder`: migra el texto que hoy esté quemado en el componente
  de Bienvenida/Guía rápida a filas `content_blocks`, en ES y EN.
- Todos los seeders **idempotentes** (usar `updateOrCreate` por `key`), para
  poder correrlos en cada deploy sin duplicar filas — mismo patrón que ya usa
  `scripts/generate-changelog.mjs` para Inventory-Manager, mantener
  consistencia entre proyectos hermanos.

### 2.8 Backend

- Un `SidebarController` (o Inertia shared data en `HandleInertiaRequests`)
  que arma el árbol completo (mini items + secciones + ítems, ya filtrados por
  rol y `is_enabled`, ya resueltos los badges) y lo manda como prop compartida
  — el frontend **no decide qué mostrar**, sólo renderiza lo que llega.
- Cachear ese árbol por team/rol (Redis o cache de Laravel) e invalidar al
  tocar las tablas de navegación, para no pegarle a la BD en cada request.

---

## 3. Rediseño del header de conversación

### 3.1 Qué sobra hoy

El título genérico "Messages" / "Dashboard" arriba del panel de contenido no
aporta nada cuando ya estás dentro de un chat — ese espacio se reemplaza por
información real de la conversación.

### 3.2 Dónde va el toggle de tema

El toggle de tema (sol/luna) deja de estar arriba a la derecha del panel de
contenido. Nueva posición: **fijo en la sidebar expandida, en la fila del
título de sección, entre el título y el icono de "chat nuevo" (+)** — visible
siempre, sin importar en qué sección estés (Inicio, Mensajes, Notificaciones,
Archivo). Esto lo saca del área de contenido, que ahora es 100% del chat.

```
┌ Sidebar expandida ───────────────┐
│ Mensajes      [☾]        [+]     │  ← título | toggle tema | nuevo chat
├───────────────────────────────────┤
│ (lista de conversaciones)        │
```

### 3.3 Header de la conversación (nuevo)

Reemplaza el "Messages" actual. Estructura, de izquierda a derecha:

1. **Avatar** (o avatar-stack de hasta 3 si es grupo, con "+N" si son más) +
   indicador de presencia (punto verde/gris/amarillo — online, offline, away).
2. **Bloque nombre + estado**: nombre del contacto o del grupo; debajo, en
   texto secundario más chico: "En línea" / "Escribiendo…" / "Últ. vez hace
   2 h" / si es grupo: "5 miembros".
3. Espacio flexible.
4. **Iconos de acción** (sólo icono, tooltip al hover): Buscar en el chat 🔍,
   Llamada de audio 📞, Videollamada 🎥, y un botón **⋯ (más opciones)** que
   abre el dropdown con todo lo demás (sección 3.4).

Este header **no es una barra plana**: va dentro de una **card elevada**
(`shadow-lg`, borde muy sutil, fondo con leve blur si el tema es oscuro,
esquinas redondeadas ~12px, un pelín "flotando" sobre el fondo del chat con
`translateY` sutil en hover de sus botones) — efecto tipo macOS/iOS "elevated
surface", no un `<div>` pegado al borde superior. Sirve de ancla visual fija
mientras los mensajes scrollean por debajo (posición sticky).

### 3.4 Menú "⋯" del header (dropdown)

- Ver perfil / Ver info del grupo
- Buscar en la conversación
- Silenciar notificaciones (submenú: 1 h / 8 h / 1 semana / Siempre)
- Fijar conversación (pin arriba de la lista)
- Marcar como favorito ⭐
- Asignar color / tema a este chat (sección 8.2)
- Programar mensaje… (sección 10.2)
- Recordarme sobre este chat… (sección 10.1)
- Exportar / descargar historial de multimedia compartida
- Activar modo temporal/secreto (sección 7) — sólo en chats 1 a 1
- Bloquear / Desbloquear contacto
- **Archivar conversación** (nunca "Eliminar" — ver sección 6)
- Si es grupo, además: Agregar participantes, Ver miembros, Salir del grupo,
  Config. de conferencia (quién puede llamar, aprobación de entrada)

---

## 4. Burbujas de mensaje (rediseño visual)

Objetivo: efecto **iOS/macOS Messages** — burbujas con más volumen, no planas.

- **Propias**: alineadas a la derecha, color de acento (personalizable, ver
  8.2), esquina inferior derecha con "cola" sutil o esquina recta (estilo
  iMessage) según preferencia del usuario en Ajustes.
- **De otros**: alineadas a la izquierda, fondo neutro (gris claro en modo
  claro, gris carbón en oscuro), avatar pequeño sólo en la primera burbuja de
  una racha consecutiva (agrupar burbujas seguidas del mismo emisor sin
  repetir avatar/hora en cada una, como Slack/Telegram).
- **Sombra + profundidad**: `box-shadow` suave de dos capas (una difusa larga,
  una nítida corta) para dar sensación 3D; en hover, elevar 1-2px con
  transición `150ms ease-out`. Nada exagerado — sutil, "material design"
  discreto, no skeuomorfismo pesado.
- **Cola/pico** de la burbuja sólo en el primer y último mensaje de una racha,
  las intermedias van con esquinas simétricas (patrón estándar de iMessage/
  WhatsApp).
- **Estados de envío** dentro de la burbuja (esquina inferior): reloj
  (enviando) → check simple (enviado) → doble check (entregado) → doble check
  azul/acento (leído). Respetar `show_read_receipts` de 2.6.
- **Reacciones** tipo emoji flotando sobre el borde inferior de la burbuja
  (long-press o hover + botón "😀+"), con contador si hay más de una persona
  reaccionando igual — como Slack/Telegram/iMessage tapback.
- **Responder a un mensaje** (quote/reply): franja delgada arriba de la
  burbuja con extracto del mensaje citado, click para saltar a él.
- **Reenviar** mensaje a otro chat.
- **Copiar texto**, **Editar** (propio, con marca "editado"), **Eliminar para
  mí / eliminar para todos** (con ventana de tiempo, como WhatsApp — esto es
  distinto de "archivar chat", acá sí se puede borrar un mensaje puntual, la
  regla de "nunca eliminar" es sólo a nivel de **conversación completa**).
- **Separador de fecha central tipo badge**: chip centrado, pequeño,
  redondeado, con fondo semitransparente (`bg-black/5` claro / `bg-white/10`
  oscuro), texto tipo "Hoy", "Ayer", o `"viernes, 11 de septiembre de 2026"`
  cuando cambia el día — igual patrón que WhatsApp/Telegram/Slack.
- **Mensajes del sistema** (alguien entró al grupo, cambiaste el tema, etc.):
  texto centrado, sin burbuja, gris tenue.

---

## 5. Composer (barra de escritura) y tipos de contenido

Barra inferior fija, también con leve elevación (misma familia visual que el
header). De izquierda a derecha:

1. **Adjuntar (📎)**: menú con Foto/Video (galería), Documento, Contacto,
   Ubicación (opcional, evaluar si aplica a un chat corporativo), Encuesta/poll.
2. **Botón de código `</>`**: inserta un bloque de código con selector de
   lenguaje (usar `highlight.js` o `shiki`), fuente monoespaciada, número de
   línea opcional, botón "Copiar" en el bloque renderizado — pensado para
   equipos de developers (mencionado explícitamente por el usuario).
3. **Campo de texto** multilínea auto-expandible, con:
   - Markdown ligero (negrita `**`, cursiva `_`, tachado `~~`, código
     inline con backticks) — igual convención que Slack/Discord/Telegram.
   - `@menciones` con autocompletar (resalta y notifica al mencionado).
   - Indicador "Fulano está escribiendo…" en tiempo real vía Reverb.
4. **Emoji (😀)**: picker con categorías + búsqueda + recientes.
5. **GIF/Stickers**: integración con API tipo GIPHY/Tenor (evaluar en
   `docs/STACK.md` si se agrega dependencia externa) + stickers propios del
   equipo (paquete configurable).
6. **Nota de voz**: botón de micrófono; **mantener presionado o click para
   iniciar grabación en tiempo real** con:
   - Forma de onda animada mientras grabás.
   - Cronómetro.
   - Deslizar para cancelar (patrón WhatsApp).
   - Al soltar: previsualización con play/pause antes de enviar, opción de
     re-grabar.
   - También se puede **adjuntar un audio ya grabado** desde archivo (no sólo
     grabar en vivo).
7. **Enviar (➤)**: se habilita sólo con contenido; `Enter` envía, `Shift+Enter`
   hace salto de línea (configurable en Ajustes, porque hay gente que lo
   prefiere al revés, como en Slack).

**Vista previa de adjuntos** antes de enviar: miniaturas en fila arriba del
campo de texto, con "x" para quitar cada una, y opción de agregar un
comentario/caption a fotos/videos antes de mandarlos.

**Documentos/archivos** dentro de una burbuja: icono según extensión, nombre,
peso, botón de descarga/vista previa (PDF e imágenes inline, otros con icono
genérico).

---

## 6. Estados de conversación: nunca se elimina

Regla dura del proyecto (ya la trajiste, formalizarla en `docs/DECISIONS.md`
como ADR):

- Un chat **jamás se borra**. Único destino posible: **Archivar** /
  **Desarchivar** (ya existe la pestaña Archivo).
- **Bloquear contacto**: deja de recibir mensajes de esa persona, no ve su
  estado de "escribiendo"/presencia, pero el historial existente se conserva
  intacto y sigue archivable. Bloquear no es lo mismo que archivar — pueden
  combinarse.
- **Desbloquear**: revierte lo anterior, no borra ni recupera nada porque
  nunca se borró.
- **Silenciar** (mute) ≠ bloquear: sólo deja de notificar, el chat sigue activo
  y visible.
- **Fijar** (pin): sube el chat al tope de la lista, con límite razonable
  (ej. máx. 5 fijados, como WhatsApp/Telegram) para no romper el layout.
- **Favoritos**: aplica a Personas, Equipos/Teams, Grupos y Canales por igual
  — una tabla `favorites` polimórfica (`favoritable_type`, `favoritable_id`,
  `user_id`) para no repetir estructura por cada tipo.

---

## 7. Chats secretos / mensajes temporales

Dos conceptos distintos, implementar ambos:

### 7.1 Mensajes temporales (nivel conversación normal)

Como WhatsApp: se activa un temporizador de auto-borrado sobre una
conversación **que sigue existiendo normalmente**. Opciones de duración
sugeridas (estándar de industria): **24 horas, 7 días, 90 días** — mismo
patrón que usa WhatsApp para su "Mensajes temporales" por defecto. Al
cumplirse el plazo, el mensaje se borra para ambos lados (texto, adjuntos,
metadata) de forma permanente e irrecuperable (hard delete, no soft delete).

### 7.2 Conversación secreta/efímera (nivel superior — nueva sesión)

Inspirado en "Secret Chats" de Telegram, pero simplificado:

- Se activa explícitamente para una conversación 1 a 1 (no grupos, por
  complejidad de sincronización — igual restricción que Telegram).
- Mientras está activa: **nada se persiste en la tabla histórica normal**;
  usar almacenamiento en memoria/caché con TTL (Redis) o una tabla marcada
  `is_ephemeral=true` con `expires_at` corto y un job que la purga sin dejar
  rastro ni en logs de aplicación.
- **Al cerrar la conversación secreta (por cualquiera de los dos lados) todo
  se borra sin posibilidad de recuperación**: texto, imágenes, archivos,
  audios, metadata, notificaciones push guardadas — nada queda en BD, backups
  de aplicación ni búsqueda global.
- Mostrar un indicador visual claro (icono de candado en el header, cambio de
  color de fondo del chat) para que quede claro que estás en modo secreto,
  igual que Telegram lo marca con un candado junto al nombre.
- Opcional (fase futura, dejar diseñado pero no bloquear el MVP): aviso si el
  otro lado hace captura de pantalla — técnicamente limitado en web, factible
  en app nativa a futuro.
- Temporizador de autodestrucción por mensaje configurable dentro del chat
  secreto (ej. 5s / 30s / 1 min / 1 h / 1 día — rango corto porque el propósito
  es distinto al de "mensajes temporales" normales).

---

## 8. Personalización visual

### 8.1 Color de la sidebar expandida

- La **mini-sidebar siempre es negra**, no se toca.
- La **sidebar expandida** sí acepta color de fondo elegido por el usuario:
  selector con presets (ej. Carbón/negro actual, Azul noche, Verde bosque,
  Vino, Gris neutro) + un color picker libre (hex/HSL) para quien quiera algo
  a medida.
- **Mantener el detalle de "goteras"** (el degradado/textura que comparte el
  fondo entre dashboard y sidebar, que ya está resuelto en el diseño actual):
  el color elegido debe aplicarse respetando ese mismo mecanismo de transición
  de fondo entre panel y sidebar, no romperlo por poner un color plano.
- Guardar en `user_preferences.sidebar_color`; aplicar vía CSS variable
  (`--sidebar-bg`) para no tener que recompilar Tailwind por usuario.

### 8.2 Tema por chat / color por contacto

- Cada conversación puede tener asignado un **color de acento** (afecta el
  color de las burbujas propias y detalles del header de ese chat
  específico) — igual concepto que "Chat theme" de Messenger o "colores de
  chat" de Telegram.
- Guardar en una tabla `conversation_preferences` (`user_id`,
  `conversation_id`, `accent_color`, `wallpaper` opcional a futuro).
- Es **por usuario y por chat**, no global: si Ana le pone verde a su chat con
  Camila, Camila no ve ese verde a menos que también lo configure ella.

---

## 9. Tipografía, tamaños y densidad

- Fuente base: mantener la que ya define `docs/STACK.md`/Tailwind config; si
  no hay una definida aún, proponer **Inter** (UI) + **JetBrains Mono** o
  **Fira Code** para bloques de código — combinación estándar en apps de chat
  para developers (Slack usa Lato/Helvetica; Discord usa gg sans; ambas caen
  en la misma familia "sans neutra + mono para código").
- Escalas de texto sugeridas (Tailwind): nombre de contacto `text-sm
  font-semibold`, mensaje `text-sm`, hora `text-xs text-muted-foreground`,
  separador de fecha `text-xs font-medium`.
- `font_scale` en `user_preferences` multiplica estas escalas (accesibilidad):
  `sm` (-1 paso), `md` (base), `lg` (+1 paso).
- `chat_density`: `comfortable` (padding actual) vs `compact` (burbujas más
  pegadas, menos padding vertical) — mismo concepto que Slack/Teams.

---

## 10. Recordatorios, mensajes programados y utilidades

### 10.1 Recordar sobre un mensaje

Desde el menú contextual de un mensaje: "Recordarme sobre esto" → elegir
fecha/hora → se guarda en `message_reminders` y dispara una notificación
interna (y push si aplica) en el momento indicado, con deep-link al mensaje
original.

### 10.2 Programar mensaje

Desde el composer: en vez de "Enviar" inmediato, botón secundario
"Programar envío…" → date/time picker → el mensaje queda en estado
`scheduled` (tabla `messages` con `send_at` y `status`), visible sólo para el
autor en una lista "Programados" (accesible desde el menú "⋯" del chat o
desde Ajustes), editable/cancelable hasta el momento de envío. Un job
(`SendScheduledMessages`, cron cada minuto) los publica.

### 10.3 Chat contigo mismo ("Mensajes guardados")

Conversación especial, una por usuario, creada automáticamente (patrón
"Saved Messages" de Telegram / "You" en Slack): sirve para notas, archivos
propios, borradores. No cuenta para "no leídos" globales, no admite bloqueo
ni archivo (o si se archiva, siempre debe quedar accesible por un atajo fijo).

### 10.4 Búsqueda

- Búsqueda **dentro de un chat** (icono 🔍 del header): resalta coincidencias,
  navega entre resultados con flechas arriba/abajo, salta al mensaje en el
  historial con scroll suave.
- Búsqueda **global** (desde el icono de Mensajes o un atajo `Cmd/Ctrl+K`):
  busca en nombres de contacto, texto de mensajes, y archivos compartidos —
  patrón estándar Slack/Teams/Telegram.

### 10.5 Rendimiento con historiales largos

- **Virtualización de la lista de mensajes** (ej. `react-virtuoso` o
  `@tanstack/react-virtual`) para no montar miles de nodos DOM.
- **Paginación hacia atrás** (infinite scroll ascendente): cargar de a bloques
  (ej. 30-50 mensajes) al acercarse al tope, con un loader discreto tipo
  skeleton, nunca bloqueando la UI.
- **Transiciones suaves** (Framer Motion o CSS transitions) al insertar
  mensajes nuevos o cargar bloques antiguos, para que no se sienta un "salto"
  brusco de scroll.
- Cachear en el cliente (React Query/Inertia + SWR pattern) los últimos chats
  abiertos para que cambiar entre conversaciones no vuelva a pedir todo del
  servidor cada vez.

---

## 11. Llamadas y videoconferencia

### 11.1 Llamada 1 a 1

- Audio y video, iniciables desde el header del chat (íconos 📞/🎥) o desde el
  perfil del contacto.
- Pantalla de llamada: video propio en miniatura (picture-in-picture,
  arrastrable), video remoto a pantalla completa; controles inferiores:
  mute mic, apagar cámara, colgar, compartir pantalla, chat lateral
  (mensajes durante la llamada sin colgar).
- Mientras suena: pantalla de "llamando…"/"te está llamando" con
  aceptar/rechazar, y opción de responder con mensaje rápido en vez de
  contestar (patrón de llamadas móviles clásico).

### 11.2 Conferencia grupal (tipo Meet/Zoom/Teams)

- Desde un grupo existente: "Iniciar llamada" convierte el chat en
  conferencia; todos los miembros reciben notificación para unirse.
- También se puede **crear una reunión ad-hoc** con link para invitar gente
  que no está en un chat previo (útil para lo "corporativo" que mencionás),
  con sala de espera opcional (el admin aprueba el ingreso).
- **Roles de conferencia**: quien la crea es *host/admin* y puede:
  - Silenciar a un participante o a todos.
  - Quitar a un participante.
  - Bloquear el compartir pantalla de otros (sólo host comparte, o abierto a
    todos).
  - Ceder el rol de host.
- **Compartir pantalla**: propia app o ventana específica (usar
  `getDisplayMedia`), con indicador visible de "estás compartiendo tu
  pantalla".
- **Grabación de la reunión**: botón visible para host (y para quien el host
  autorice), con aviso a todos los participantes de que se está grabando
  (requisito legal/ético en la mayoría de países — igual que hacen
  Zoom/Meet/Teams). Graba video de todos los feeds activos + audio mezclado;
  el archivo resultante queda disponible en el chat del grupo al finalizar,
  como un adjunto de video normal.
- Límite de participantes: definir un número inicial razonable para el MVP
  (ej. 8-12) e ir subiendo según la infraestructura de media server elegida
  (evaluar en `docs/STACK.md`: SFU tipo LiveKit/mediasoup/Daily — no intentar
  P2P puro más allá de 1 a 1, no escala).
- **Historial de llamadas**: registrar cada llamada (tipo, duración,
  participantes, si fue perdida) como entrada especial dentro del chat
  correspondiente y también en la sección "Llamadas" de la sidebar (2.5).

---

## 12. Plan de fases sugerido (para no perder foco)

No intentar todo en un solo sprint. Orden sugerido, cada uno cerrado y
testeado antes de pasar al siguiente:

1. **Fase A — Navegación data-driven**: tablas + seeders + endpoint que arma
   el árbol de sidebar/mini-sidebar (sección 2). Sin esto, todo lo visual
   nuevo se vuelve a quemar en el código.
2. **Fase B — Header + burbujas + composer básico**: rediseño del header
   (sección 3), burbujas nuevas (sección 4), composer con texto/emoji/adjuntos
   de imagen y archivo (sin audio ni código todavía).
3. **Fase C — Mensajería avanzada**: notas de voz, bloques de código, GIFs,
   responder/reenviar/reaccionar, separadores de fecha, búsqueda en chat,
   virtualización/paginación (secciones 5, 10.4, 10.5).
4. **Fase D — Estados y privacidad**: bloquear/desbloquear, fijar, favoritos
   polimórficos, mensajes temporales (sección 6, 7.1).
5. **Fase E — Personalización**: color de sidebar, tema por chat, densidad,
   tamaño de fuente (sección 8, 9).
6. **Fase F — Utilidades**: recordatorios, mensajes programados, chat
   contigo mismo (sección 10.1-10.3).
7. **Fase G — Chats secretos** (sección 7.2) — dejarla para el final porque
   toca infraestructura sensible (TTL, purga garantizada, no-logging).
8. **Fase H — Llamadas y conferencias** (sección 11) — la más costosa en
   infraestructura (WebRTC/SFU), evaluar proveedor externo vs. self-hosted
   antes de arrancar, documentar la decisión en `docs/DECISIONS.md`.

Al cerrar cada fase: actualizar `CHANGELOG.md` con el formato ya definido,
correr QA manual (`docs/QA.md`), y sólo entonces pasar a la siguiente.

---

## 13. Referencias funcionales usadas para este documento

Patrones tomados (sin copiar código ni assets, sólo comportamiento/UX
estándar de la industria) de: **WhatsApp** (mensajes temporales 24h/7d/90d,
vista única, doble check), **Telegram** (chats secretos con candado,
temporizador de autodestrucción, "Mensajes guardados", reacciones tipo
tapback), **Slack** (agrupación de sidebar en secciones colapsables, atajo de
búsqueda global, densidad compacta/cómoda), **Microsoft Teams** (conferencias
con sala de espera, host que silencia participantes, grabación con aviso
legal), **Skype/Viber/Line** (historial de llamadas como sección propia,
stickers, llamadas desde el header) — usados como referencia de expectativas
de usuario, no como spec exacta a clonar.

---

## 14. Qué NO hacer (para no desviarse)

- No tocar el estilo visual ya aprobado de mini-sidebar (negra) ni el patrón
  de "goteras"/degradado compartido entre sidebar y dashboard.
- No implementar "eliminar chat" en ningún punto de la UI — sólo archivar.
- No usar `localStorage` para nada persistente entre sesiones si en algún
  momento se prueba parte de esto en un artifact/demo — usar el backend real.
- No mezclar mensajes/archivos de un chat secreto con el almacenamiento
  normal, ni loguearlos en application logs, colas, o error tracking (Sentry
  y similares) — deben quedar explícitamente excluidos.
- No avanzar a la Fase H (llamadas) sin haber decidido y documentado el
  proveedor de media server — evita reescribir todo a mitad de camino.
