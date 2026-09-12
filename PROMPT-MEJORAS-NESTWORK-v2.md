# Prompt maestro v2 — Nestwork (corrige y amplía la v1 del 2026-09-12)

> **Cómo usar:** pégalo completo a Claude Code o referencialo por archivo. Está
> pensado para ejecutarse **por fases** (sección 17), sobre el schema **real**
> que ya existe (ver `postgres_-_chat_app_-_public.png` / migraciones
> actuales) — todo lo de acá es **aditivo** (nuevas tablas/columnas), no pide
> reescribir lo que ya funciona.

## 0. Qué corrige esta v2 respecto al documento de ayer

El documento anterior asumía una BD genérica. Ya me mandaste el ERD real, así
que esta versión:

1. Referencia **columnas que ya existen** (`conversation_participants.
archived_at/muted_at/last_read_message_id`, `messages.deleted_at` —o sea el
   soft-delete de mensajes **ya está resuelto**—, `users.status_preset/
status_emoji/status_text/status_expires_at`, `teams.is_personal` y
   `teams.deleted_at`, `team_members.role`) en vez de proponerlas de cero.
2. Agrega **email + contraseña** como segundo método de login, sin quitar
   Firebase/Google (`users.password` ya existe en la tabla, sólo hay que
   habilitar el flujo — hoy sólo se usa Firebase).
3. Corrige el diseño de burbuja: viñeta de cómic con pico hacia el avatar del
   emisor, sin punto de estado en el avatar-del-chat (el punto de presencia
   sólo va en el avatar del header).
4. Agrega todo lo que faltó ayer: búsqueda global real, saltar a una fecha,
   paginación anti-saturación, reacciones en el módulo Actividad, botón de
   responder dedicado (no clic derecho), reenviar, visor de imagen/video/PDF
   en modal, formato de texto (negrita/cursiva/subrayado), link previews tipo
   Slack/Jira, GIFs animados, estados de usuario configurables, roles de admin
   de workspace, baja de cuenta (soft delete + reactivación por admin),
   notificaciones de navegador + favicon badge, sidebar con gradientes, y un
   seeder de 50-100 usuarios falsos logueables con email+contraseña.
5. Aclara la posición del equipo sobre **BLOB vs. almacenamiento en disco/
   object storage** (sección 4.4) — es una decisión de arquitectura, no un
   detalle menor, y la dejo documentada como ADR para `docs/DECISIONS.md`.

Todo lo de la v1 que no se contradice acá (fases de UI, llamadas, chats
secretos, etc.) **sigue vigente** — este documento la reemplaza pero no repite
punto por punto lo que no cambió; ver v1 (`PROMPT-MEJORAS-NESTWORK.md`) para
el detalle de secciones no tocadas (composer de audio/emoji, mini-sidebar
data-driven, etc.), citadas acá donde aplica.

---

## 1. Principio rector (sin cambios)

Nada de navegación, texto, ni contenido puede estar quemado en componentes.
Todo sale de BD con seeders idempotentes. La mini-sidebar es siempre negra; la
sidebar expandida sí es personalizable (sección 15).

---

## 2. Autenticación: Google + Email/Password, pantalla split

### 2.1 Qué falta a nivel de datos

`users.password` **ya existe** en el schema actual — hoy probablemente está
`nullable` porque sólo se usaba Firebase. Cambios necesarios:

- Agregar columna `users.auth_provider` (enum: `google`, `password`, `both`)
  para saber cómo se registró y qué UI de seguridad mostrarle (ej. no ofrecer
  "cambiar contraseña" a alguien que sólo usa Google, a menos que quiera
  "vincular" un método adicional).
- Agregar `users.google_id` (string nullable, unique) si no existe ya
  separado — hoy puede estar resuelto vía la tabla de Firebase, confirmar en
  `FirebaseSessionController` antes de duplicar.
- Reactivar (o crear si se quitaron) las rutas de Fortify/Breeze para:
  registro con email, login con email+password, **verificación de email**
  (usar `email_verified_at`, que ya existe en la tabla), **recuperar
  contraseña** (la tabla `password_reset_tokens` ya existe y no se usa hoy —
  reactivar ese flujo).
- Un usuario puede tener **ambos** métodos habilitados a la vez (vincular
  Google a una cuenta que empezó con email, y viceversa) — UI en Ajustes >
  Seguridad.
- Mantener la regla de equipos por dominio de correo (decisión bloqueada #4
  del README): el alta por email también dispara el mismo auto-join por
  dominio que hoy dispara Google.

### 2.2 Diseño visual: pantalla dividida con panel deslizante

Tomando como referencia el patrón que mandaste (doble panel + overlay que se
desliza para invertir signup/signin), pero **reimplementado con el sistema
visual propio de Nestwork** (curvas/rounded + "goteras" ya cerradas el
2026-09-11) en vez de los colores/gradiente naranja del ejemplo. No es un
copy-paste del CSS del CodePen: es el mismo _mecanismo de interacción_
(desplazamiento de un panel de marca sobre un layout de dos columnas),
documentado acá como componente propio y reutilizable.

**Comportamiento:**

- Layout de 2 columnas dentro de un contenedor con **bordes muy redondeados**
  (`rounded-3xl` o superior) y sombra elevada — mismo lenguaje "curved" que ya
  usás en modales.
- **Estado por defecto = Iniciar sesión.** El formulario de login vive en un
  lado (ej. izquierda), y el panel de marca (logo, ilustración/imagen,
  descripción corta de Nestwork, botón "Crear cuenta") vive del otro lado
  (derecha).
- Al hacer click en "Crear cuenta": el **panel de marca se desliza al lado
  contrario** (izquierda) y el formulario que estaba oculto (Sign Up) ocupa el
  espacio que dejó, con una transición `transform: translateX(...)` + `ease-
in-out` de ~600ms, igual sensación que el ejemplo pero con la curva/paleta
  del proyecto. El botón dentro del panel de marca ahora dice "Ya tengo
  cuenta" y hace el camino inverso.
- El panel de marca es el elemento que **siempre lleva** el logo, una
  descripción corta (editorial, no quemada: sacarla de `content_blocks`,
  sección 6 de la v1, con `content_key = auth_panel_signin` / `
auth_panel_signup`) y el CTA. Nunca se queda vacío ni se duplica contenido.
- Cada formulario (Sign in / Sign up) incluye:
    - Botón "Continuar con Google" (Firebase) arriba, prominente.
    - Separador "o usa tu correo".
    - Campos de email + password (+ Nombre y confirmación de password en
      Sign Up).
    - En Sign in: link "¿Olvidaste tu contraseña?" → flujo con
      `password_reset_tokens`.
    - Validación en vivo (fuerza de contraseña, formato de email) sin recargar.
- **Responsive:** el efecto de panel deslizante lateral es un patrón de
  escritorio. En mobile (breakpoint `sm`), el layout cae a **una sola columna
  con transición vertical/fade** entre Sign in y Sign up (no forzar el slide
  horizontal en pantallas angostas, se ve roto) — dejar esto explícito para
  que Claude Code no intente forzar el mismo CSS a mobile.
- Documentar el componente resultante en `docs/ARCHITECTURE.md` o un nuevo
  `docs/UI-PATTERNS.md`, para reusarlo a futuro (ej. en un flujo de
  onboarding de equipo con el mismo mecanismo).

---

## 3. Arquitectura de conversaciones (sobre el schema real)

Tipos de conversación a cubrir con **una sola tabla `conversations`** (ya
existe con `type`), evitando tablas separadas por tipo:

| `type`    | Descripción                                                                | Participantes                                        |
| --------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `direct`  | Chat 1 a 1                                                                 | Exactamente 2, vía `conversation_participants`       |
| `group`   | Grupo privado (varios usuarios, sin jerarquía de "canal público")          | N usuarios invitados explícitamente                  |
| `channel` | Canal de un team, potencialmente abierto a todo el team o a un subconjunto | N usuarios, puede tener `is_public` a nivel de canal |

Agregar a `conversations` (aditivo):

- `is_public` (boolean, sólo aplica si `type='channel'`) — si cualquier
  miembro del team puede unirse sin invitación.
- `avatar_path` (nullable) — imagen de grupo/canal, ver 4.4 para dónde vive
  el archivo.
- `description` (text nullable) — bio del grupo/canal.
- `is_ephemeral` (boolean default false) + `ephemeral_ttl_seconds` (integer
  nullable) — para el chat secreto de la v1 (sección 7.2 de esa versión).
- `default_message_ttl_seconds` (integer nullable) — para "mensajes
  temporales" a nivel conversación (v1, sección 7.1: 24h/7d/90d).

`conversation_participants` **ya trae** `joined_at`, `muted_at`,
`archived_at`, `last_read_message_id` — perfecto, se mapea 1:1 con la sección
6 de la v1 (mute/archive/bloqueo a nivel de relación). Agregar:

- `role` (enum: `member`, `admin`) — sólo relevante para `group`/`channel`,
  para saber quién puede agregar/quitar gente, cambiar nombre/avatar, o
  bloquear el compartir pantalla en una llamada de ese grupo (v1, sección
  11.2).
- `is_favorite` (boolean) **o** mejor, tabla polimórfica aparte
  `favorites(user_id, favoritable_type, favoritable_id)` como ya proponía la
  v1 — preferir la tabla polimórfica para poder marcar favorito también a un
  `user` suelto (antes de tener chat con él) o a un `team`.
- `hidden_at` (nullable) — para el caso de "conversación oculta" que
  mencionaste (distinto de archivar: oculta no aparece en ningún listado
  hasta que el usuario la busca explícitamente por el buscador global).

### 3.1 `messages` — extender

`body`, `edited_at`, `created_at`, `deleted_at` ya existen (el soft-delete de
mensaje individual **ya está resuelto**, no hay que construirlo). Agregar:

- `type` (enum: `text`, `image`, `video`, `audio`, `file`, `code`, `system`,
  `call_log`) — el frontend renderiza la burbuja distinto según esto.
- `metadata` (**jsonb**, no BLOB — ver 4.4) — payload libre según `type`:
  para `code` guarda `{ "language": "php", "code": "..." }` conservando
  indentación tal cual (jsonb no trunca ni reformatea texto); para `call_log`
  guarda duración/participantes/estado.
- `reply_to_message_id` (fk nullable, self-reference) — soporta el botón
  "Responder" dedicado (sección 7).
- `forwarded_from_message_id` (fk nullable, self-reference) +
  `forwarded_from_conversation_id` — para "Reenviar a…".
- `is_hidden` (boolean default false) — mensajes/archivos ocultos
  (visualmente tapados hasta que el receptor decide revelarlos, estilo
  Telegram con timers cortos, o simplemente contenido sensible marcado por
  quien lo envía).
- Tabla nueva `message_deletions` (`message_id`, `user_id`, `deleted_at`) —
  para "eliminar sólo para mí" sin tocar el `deleted_at` global (que es
  "eliminar para todos"). El backend filtra por esta tabla al listar.

### 3.2 Tablas nuevas necesarias

- **`attachments`**: `id`, `message_id`, `type` (`image`/`video`/`audio`/
  `document`), `disk` (`local`/`s3`/`minio` — ver 4.4), `path`, `original_name`,
  `mime_type`, `size_bytes`, `duration_seconds` (audio/video), `width`/
  `height` (imagen/video), `thumbnail_path` (miniatura pre-generada para no
  procesar el archivo completo en el listado), `is_hidden` (boolean).
- **`reactions`**: `id`, `message_id`, `user_id`, `emoji`, `created_at` —
  unique en (`message_id`,`user_id`,`emoji`) para no duplicar. Alimenta tanto
  el contador sobre la burbuja como el módulo Actividad (sección 9).
- **`message_receipts`**: `id`, `message_id`, `user_id`, `delivered_at`,
  `read_at`. **Ojo con escala**: en conversaciones 1 a 1 esto es barato (una
  fila por mensaje); en canales grandes puede explotar. Mitigación: sólo
  generar filas de "leído" para conversaciones `direct` y `group` chicos
  (definir umbral, ej. ≤ 20 participantes); para `channel` grandes, usar sólo
  el contador agregado (`conversation_participants.last_read_message_id`) sin
  detalle por persona, y mostrar "visto por 42" en vez de la lista completa.
- **`link_previews`**: `id`, `url_hash` (unique), `url`, `title`,
  `description`, `image_url`, `site_name`, `favicon_url`, `fetched_at`,
  `expires_at`. Un job (`FetchLinkPreview`) hace el _scrape_ de OpenGraph la
  primera vez que alguien pega un link y cachea el resultado por hash de URL
  — así el mensaje sólo guarda `metadata.link_preview_id`, no repite el
  scrape por cada envío del mismo link.
- **`status_presets`**: `id`, `emoji`, `label_es`, `label_en`,
  `default_duration_minutes` (nullable), `order`, `is_enabled` — catálogo de
  estados sugeridos (ej. 🟢 Disponible, 🍽️ Almorzando, 🚗 En camino, 🎧 No
  molestar, 🌙 Fuera de línea) editable por seeder/admin, para no repetir el
  error de tener 3-4 estados quemados. `users.status_preset` pasa a ser un
  fk opcional a esta tabla; si el usuario escribe uno libre, se guarda sólo
  en `status_text`/`status_emoji` sin preset asociado.
- **`calls`**, **`call_participants`**, **`call_recordings`** — ver sección
  13 (llamadas), tal como ya bosquejaba la v1 sección 11.2 pero con nombres de
  tabla concretos acá.

---

## 4. Escalabilidad del historial

### 4.1 Paginación por cursor (no offset)

Nunca `OFFSET 100000` — usar `WHERE created_at < :cursor ORDER BY created_at
DESC LIMIT 40` (o por `id` si `created_at` no es único a la ms). El frontend
sólo pide "dame los siguientes 40 más viejos que este cursor", nunca "página
N". Esto es lo único que escala bien a conversaciones con cientos de miles de
mensajes.

### 4.2 Saltar a una fecha (badges de fecha interactivos)

El separador de fecha (v1, sección 4) deja de ser un chip decorativo y pasa a
ser **clickeable**: al tocarlo abre un mini selector de fecha (calendario
compacto) con **indicador de qué días tienen mensajes** (heatmap simple tipo
GitHub contributions, opcional en fase posterior). Al elegir una fecha:

1. Backend resuelve el primer mensaje con `created_at >= fecha_elegida`.
2. Devuelve una ventana centrada en ese mensaje (ej. 25 antes + 25 después).
3. Frontend reemplaza el viewport de mensajes con esa ventana (con una
   transición de fade, no salto brusco) y dos "extremos cargables" (arriba y
   abajo) para seguir paginando desde ahí en cualquier dirección.

Esto resuelve exactamente el caso que planteaste (saltar al 10 de agosto de
2026 desde el 12 de septiembre sin traer todo el historial de por medio).

### 4.3 Búsqueda dentro del chat vs. búsqueda global

- **Dentro del chat**: filtra `messages.body` (y `attachments.original_name`)
  sólo de esa conversación, usando el mismo mecanismo de "ventana centrada en
  el resultado" del punto anterior.
- **Global** (sección 6): usa índices `tsvector` de Postgres (nativo,
  gratis, no hace falta Elasticsearch para el volumen esperado de un chat
  interno) sobre `messages.body`, `users.name/username`, `conversations.name`,
  `teams.name`. Un job liviano recalcula el `tsvector` on write (columna
  generada `GENERATED ALWAYS AS`, Postgres lo soporta nativo desde v12+, así
  no hay que mantenerlo a mano).

### 4.4 Decisión de arquitectura: NO usar BLOB en la base de datos

Documentar esto como ADR en `docs/DECISIONS.md`:

> **Decisión:** los archivos (imágenes, videos, audios, documentos,
> grabaciones de llamadas) **no se guardan como BLOB en PostgreSQL**. Se
> guardan en almacenamiento de objetos (disco local en dev, y en producción
> algo S3-compatible — para mantener el espíritu open-source/self-hostable
> del proyecto, **MinIO** es buena opción porque se auto-hospeda igual que
> Postgres/Reverb, sin depender de un proveedor de pago). La BD sólo guarda
> **metadata y la ruta/clave del objeto** (tabla `attachments`, sección 3.2).
>
> **Por qué:** un chat corporativo con adjuntos multiplica el tamaño de la
> BD sin necesidad, hace los backups de BD lentísimos, no permite servir
> archivos con CDN/cache HTTP, y complica la replicación. Guardar sólo
> metadata + referencia es el patrón estándar de toda la industria
> (WhatsApp, Slack, Telegram funcionan así) y es lo que permite además la
> miniatura/streaming progresivo de videos e imágenes sin cargar el archivo
> completo en cada mensaje de la lista.
>
> Único uso legítimo de un campo binario en la BD: cachés muy chicos y
> efímeros (ej. blur-hash de una imagen, unos bytes) — eso sí puede ir como
> `bytea`/base64 corto dentro de `attachments.metadata`, no el archivo
> completo.

---

## 5. Búsqueda global

Barra fija (accesible con `Cmd/Ctrl+K` y desde un icono en la sidebar) que
busca en paralelo:

- **Personas** (nombre, username, email si el usuario tiene permiso de verlo).
- **Grupos y canales** (nombre, descripción).
- **Conversaciones** por contenido de mensaje (usa el índice `tsvector` de
  4.3), con resultado tipo "match en el chat con Camila Torres: '...ya casi
  terminamos la primera...'" y salto directo a ese mensaje.
- **Archivos compartidos** (por `attachments.original_name`).
- **Grabaciones de reuniones** (`call_recordings`, por nombre de
  reunión/fecha/participantes).

Resultados agrupados por categoría con tabs o secciones, no una lista plana
— mismo patrón que la búsqueda global de Slack/Teams. Debounce de input
(~300ms) y, si la lista de resultados por categoría es larga, aplicar la
misma paginación por cursor del punto 4.1.

---

## 6. Actividad: feed de reacciones y eventos

El módulo "Actividad" de la sidebar (hoy placeholder, según tu roadmap) debe
mostrar un feed cronológico de eventos que te involucran, no sólo mensajes
nuevos:

- "**Juan** reaccionó 👍 a tu mensaje: _'ya está en el repo'_" (con
  mini-preview del mensaje original, click salta al chat).
- "**Camila** te mencionó en #proyecto-final".
- "**Rafael** te agregó al grupo **Equipo Backend**".
- "Tienes una llamada perdida de **Valentina Suárez**".
- Agrupar reacciones múltiples al mismo mensaje en una sola entrada
  ("Juan y 2 más reaccionaron a tu mensaje") en vez de una fila por cada una
  — igual criterio que usan Slack/WhatsApp para no saturar el feed.

Fuente de datos: tabla `activity_events` (o reusar `reactions` +
notificaciones existentes con una vista/consulta agregada) — decidir en
implementación si conviene una tabla dedicada vs. componer la consulta desde
`reactions`+`conversation_participants`+`calls`; documentar la elección.

---

## 7. Burbujas de mensaje — corrección de diseño

Reemplaza la sección 4 de la v1 en estos puntos puntuales (el resto de esa
sección sigue vigente: agrupar racha, check de estados, separador de fecha):

- **Forma**: viñeta de diálogo tipo cómic — cuerpo redondeado con un
  **pico/triángulo apuntando hacia el avatar** de quien escribió el mensaje
  (a la izquierda si es de otro, a la derecha si es propio), no la cola tipo
  iMessage genérica. Sólo la primera burbuja de una racha lleva pico; las
  siguientes de la misma racha van con esquinas simétricas sin pico
  (evita ruido visual si alguien manda 5 mensajes seguidos).
- **Avatar dentro del chat**: **sin punto de presencia**. El punto de estado
  (online/offline/away) vive únicamente en el avatar del header de la
  conversación (v1, sección 3.3) y en las listas de contactos — dentro del
  cuerpo del chat el avatar es puramente identificador de autor, para no
  repetir información redundante en cada racha de mensajes.
- **Botón de responder dedicado**: un icono de flecha-de-respuesta que
  aparece **al hacer hover sobre la burbuja** (o siempre visible en mobile,
  sin hover), pegado al borde de la burbuja — no depende de abrir un menú
  contextual con clic derecho. Al usarlo, el composer muestra el "quote" del
  mensaje citado arriba del campo de texto (ya descrito en v1 sección 4).
- Junto a ese botón, en el mismo grupo de acciones al hover: reaccionar 😀,
  reenviar ↪, más opciones ⋯ (copiar, editar si es propio, eliminar para
  mí/para todos, ocultar).

---

## 8. Visores de media dentro del chat

- **Imágenes**: miniatura recortada a proporción fija dentro de la burbuja
  (con `object-fit: cover`), click abre **modal** con la imagen a resolución
  completa, zoom (rueda/pellizco), flechas para navegar entre las demás
  imágenes de la conversación sin cerrar el modal, botón descargar.
- **Videos**: miniatura con botón de play superpuesto y duración en la
  esquina; click abre **modal reproductor**, con opción de expandir a
  **pantalla completa** (Fullscreen API), controles estándar (play/pausa,
  barra de progreso, volumen, velocidad), y la posibilidad de reproducir en
  miniatura _inline_ sin abrir el modal si el usuario prefiere sólo confirmar
  de qué se trata.
- **PDF**: visor en modal casi pantalla completa (mismo tamaño de modal que
  el reproductor de video), paginación interna del PDF, zoom, sin necesidad
  de descargarlo para verlo — usar `pdf.js` (o el visor que ya defina el
  skill/paquete PDF del stack) embebido.
- **Audio** (notas de voz): dentro de la burbuja, forma de onda estática
  pre-calculada (guardada en `attachments.metadata` al subir el archivo) +
  botón play/pause + tiempo transcurrido/total — igual patrón visual que
  WhatsApp/Telegram.
- **Archivos ocultos**: attachment con `is_hidden=true` se muestra tapado
  (blur + icono de ojo "Mostrar contenido"), un tap lo revela sólo en esa
  sesión de visualización (no persiste "revelado" para siempre, vuelve a
  taparse al recargar, salvo que se decida lo contrario en implementación).

---

## 9. Composer: formato, código, links, GIFs

Amplía la sección 5 de la v1:

- **Barra de formato** (aparece al seleccionar texto, o fija arriba del
  campo, a decidir en diseño): **negrita**, _cursiva_, <u>subrayado</u>,
  ~~tachado~~, cita en bloque, lista, bloque de código inline. Se traduce a
  Markdown ligero guardado en `messages.body`, renderizado en la burbuja.
- **Input y botón de enviar del mismo alto** (`h-11` o el que defina el
  design system), alineados verticalmente, sin que uno se vea más chico que
  el otro.
- **Placeholder** contextual: `"Escribe un mensaje a Camila Torres…"` /
  `"Escribe en #proyecto-final…"` — nunca un placeholder genérico "Message".
- **Bloque de código**: al pegar o insertar código, **conservar indentación
  exacta** (usar `<pre>`/`white-space: pre` en el render, y no hacer trim
  agresivo de espacios en el backend); selector de lenguaje para el resaltado
  de sintaxis (`shiki` o `highlight.js`), número de línea opcional, botón
  "Copiar".
- **Links con preview tipo Slack/Jira**: al detectar una URL en el texto, el
  mensaje se renderiza con el texto normal **y además** una card debajo con
  imagen/título/descripción/dominio (de `link_previews`, sección 3.2) — la
  URL cruda (`https://...`) no se muestra pelada en la burbuja, se reemplaza
  visualmente por el dominio corto o el título de la página como texto
  clickeable, igual criterio que usan Slack y Jira para no ensuciar el chat
  con URLs largas.
- **GIFs animados**: picker separado del de emoji (tab dentro del mismo
  popover), buscando contra una API tipo Tenor/GIPHY (evaluar cuál tiene tier
  gratuito compatible con uso comercial para no romper el espíritu
  open-source del proyecto — documentar la elegida en `docs/STACK.md`).
- El resto (voz, adjuntos, emoji, menciones) queda igual que v1 sección 5.

---

## 10. Estados de usuario (dropdown de perfil)

Reemplaza/amplía lo que hoy es un dropdown simple:

- Lista de **presets** desde `status_presets` (sección 3.2): cada uno con
  emoji + texto corto + duración sugerida (ej. "Almorzando" auto-expira en 1h).
- Opción **"Personalizado…"**: el usuario elige cualquier emoji (picker
  completo) + escribe su propio texto + define duración (30 min / 1h / 4h /
  Hoy / Hasta que lo cambie).
- El estado activo se refleja: en el punto de presencia del avatar (con el
  emoji chiquito superpuesto, como Slack), en el header de cada chat donde
  ese usuario participa, y expira solo vía job programado que limpia
  `status_expires_at` vencidos.
- Guardar los últimos 3-5 estados personalizados usados como accesos rápidos
  (tabla `user_recent_statuses` o array en `user_preferences`).

---

## 11. Roles de administrador de workspace y baja de cuenta

### 11.1 Roles

`team_members.role` ya existe — formalizar los valores permitidos
(`owner`, `admin`, `member`) y qué puede hacer cada uno:

| Acción                                            | Owner | Admin | Member                    |
| ------------------------------------------------- | ----- | ----- | ------------------------- |
| Cambiar nombre/dominio del team                   | ✅    | ❌    | ❌                        |
| Invitar/expulsar miembros                         | ✅    | ✅    | ❌                        |
| Crear/archivar canales                            | ✅    | ✅    | Sólo los propios que creó |
| Ver historial completo de cualquier canal público | ✅    | ✅    | Sólo los que integra      |
| **Reactivar cuenta dada de baja** (11.2)          | ✅    | ✅    | ❌                        |
| Forzar cierre de sesión de un miembro             | ✅    | ✅    | ❌                        |
| Transferir ownership                              | ✅    | ❌    | ❌                        |

Falta UI: una vista "Miembros del equipo" con cambio de rol inline (sólo
visible/editable para owner/admin), y un badge de rol junto al nombre en
listas de miembros.

### 11.2 Baja de cuenta (soft delete, no borrado real)

- El usuario puede "Dar de baja mi cuenta" desde Ajustes: esto marca
  `users.deleted_at` (soft delete de Laravel) + `users.deactivated_by = null`
  (auto-baja) + `users.is_active = false`.
- Un usuario dado de baja **no puede iniciar sesión**, desaparece de listas
  de "agregar a chat nuevo" pero **sus mensajes existentes se conservan**
  (mostrando su nombre tachado o "Cuenta desactivada" en vez de borrarlos —
  coherente con la regla general de "nunca se elimina" de la v1).
- Reactivación: sólo un `owner`/`admin` del/los team(s) a los que pertenecía
  puede reactivarlo desde una vista "Miembros desactivados" (filtra
  `withTrashed()->whereNotNull('deleted_at')`), lo cual limpia `deleted_at`
  y `is_active`. Registrar quién reactivó y cuándo
  (`users.deactivated_by`/`reactivated_by`, `reactivated_at`).

---

## 12. Notificaciones

- **Tiempo real in-app**: ya hay canal `presence-team.{team}` con Reverb;
  agregar broadcast de eventos `MessageSent`, `ReactionAdded`,
  `UserMentioned`, `CallIncoming` a canales privados por conversación/usuario.
- **Notificaciones del navegador** (Web Notifications API): pedir permiso la
  primera vez que llega un mensaje con la pestaña en background, mostrar
  avatar+nombre+preview del mensaje, click enfoca la pestaña y navega al chat.
- **Service Worker** para notificaciones aunque la pestaña esté cerrada (PWA
  parcial) — coordinar con el pendiente de "Offline-first/Service Workers"
  que ya está anotado en el README como tema a investigar; esta pieza puede
  adelantarse sin comprometerse todavía al alcance completo de PWA offline.
- **Badge en el favicon**: punto/número superpuesto al favicon de la pestaña
  (librería tipo `favico.js` o un canvas propio) reflejando no-leídos totales,
  se limpia al leer.
- Preferencias por usuario en `user_preferences` (v1, sección 2.6): sonido
  on/off, navegador on/off, por-conversación (silenciar ya existe vía
  `conversation_participants.muted_at`).

---

## 13. Llamadas y conferencias (esquema de tablas)

Completa la sección 11 de la v1 con tablas concretas:

- **`calls`**: `id`, `conversation_id` (nullable si es reunión ad-hoc sin
  chat previo), `type` (`audio`/`video`/`conference`), `started_by`,
  `started_at`, `ended_at`, `status` (`ringing`/`ongoing`/`ended`/`missed`/
  `declined`), `join_link_token` (para invitar por link a gente fuera del
  chat, con expiración).
- **`call_participants`**: `id`, `call_id`, `user_id` (nullable si entra
  como invitado externo por link, en ese caso `guest_name`), `joined_at`,
  `left_at`, `is_muted`, `camera_enabled`, `is_screen_sharing`, `role`
  (`host`/`cohost`/`participant`).
- **`call_recordings`**: `id`, `call_id`, `attachment_id` (fk a
  `attachments`, sección 3.2, para no duplicar el patrón de almacenamiento de
  archivos), `duration_seconds`, `has_audio`, `has_video`, `resolution`,
  `created_at`.
- **Compartir pantalla con selección de ventana/pestaña**: usar
  `getDisplayMedia()` del navegador, que ya deja al usuario elegir entre
  pantalla completa / ventana de app / pestaña específica en el picker nativo
  del SO — no hay que construir un selector propio, es del navegador; sí hay
  que dar la opción en la UI de "Compartir pantalla" antes de invocarlo.
- **Grabación en alta calidad**: usar `MediaRecorder` combinando los streams
  de video+audio mezclado de todos los participantes (mezcla en el cliente
  del host o vía SFU si el proveedor de media server lo soporta — decidir
  proveedor antes de esta fase, ver v1 sección 11.2/12).
- El resto (roles de host, mute remoto, sala de espera, link de invitación,
  historial de llamadas en sidebar) queda igual que v1 sección 11.

---

## 14. Seeder de datos de prueba

- Reemplazar el seeder actual (pocos usuarios) por uno que genere **entre 50
  y 100 usuarios falsos** con Faker (`fake()->name()`, emails
  `@gmail.com`/dominios variados para probar el auto-join por dominio),
  **contraseña conocida y documentada** (ej. `password` para todos, o una
  fija por seeder tipo `Nestwork2026!`) para poder loguearse con
  email+password una vez esté ese flujo activo (sección 2).
- Generar también: conversaciones variadas (varios `direct`, algunos `group`
  de 3-8 personas, un par de `channel` con 20+ miembros), **cientos o miles
  de mensajes** distribuidos en fechas pasadas (usar `Carbon` con fechas
  aleatorias de los últimos 6-12 meses) para poder probar de verdad scroll
  infinito, salto a fecha, y búsqueda con volumen real — no 10 mensajes de
  ejemplo.
- Reacciones y algunos hilos de respuesta (`reply_to_message_id`) también
  sembrados al azar, para que el módulo Actividad tenga contenido real desde
  el primer `php artisan migrate:fresh --seed`.
- Un comando artisan dedicado, ej. `php artisan nestwork:seed-demo
--users=80 --messages=5000`, parametrizable, para poder generar distintos
  volúmenes según qué se esté probando (UI normal vs. estrés de paginación).

---

## 15. Personalización de la sidebar: gradientes + tonos planos

Amplía la sección 8.1 de la v1 (que ya proponía presets + picker libre):

- Agregar **presets con gradiente** además de los planos, ej.: `Aurora`
  (violeta→azul), `Sunset` (naranja→rosa, sutil, no el rojo del ejemplo del
  CodePen), `Ocean` (azul→verde azulado), `Midnight` (negro→azul muy oscuro,
  cercano al actual pero con un poquito de profundidad).
- Y presets planos opacos adicionales a los ya sugeridos: `Grafito`,
  `Ciruela`, `Bosque`, `Arena` (para quien prefiera flat total).
- Guardar en `user_preferences.sidebar_color` un valor que puede ser:
  `preset:aurora` o `custom:#1a2b3c` o `custom-gradient:#1a2b3c,#334455` — el
  frontend interpreta el prefijo y arma la CSS variable correspondiente
  (`--sidebar-bg` para plano, `--sidebar-bg-gradient` con `linear-gradient`
  para los degradados).
- Sigue aplicando la restricción de la v1: el color/gradiente elegido debe
  respetar el mecanismo de "goteras" ya cerrado, no romperlo.

---

## 16. Licencia y espíritu open-source

Dejar definido (aunque sea una línea en el README) que el proyecto se libera
bajo una licencia permisiva u open-core (ej. **MIT** para uso libre total, o
**AGPL-3.0** si se quiere forzar que forks hospedados también sean abiertos —
elegir según qué tan cómodos están con que alguien tome el código y lo
revenda sin devolver mejoras; AGPL lo dificulta más que MIT). Esto no bloquea
que una empresa tome el software y lo monetice puertas adentro (soporte,
hosting, features enterprise) — es compatible con "gratis para el usuario
final, la empresa que lo adopta decide su modelo".

---

## 17. Plan de fases (revisado)

Reordenado para reflejar dependencias reales entre lo nuevo y lo de la v1:

1. **Fase A — Auth dual + pantalla split** (sección 2): sin esto, no hay
   forma de loguear a los 50-100 usuarios de prueba con email+password.
2. **Fase B — Navegación data-driven** (v1 sección 2) + **Fase C — Schema
   extendido** (secciones 3, 4.4 de este documento): migraciones aditivas de
   `attachments`, `reactions`, `message_receipts`, `link_previews`,
   `status_presets`, columnas nuevas en `messages`/`conversations`.
3. **Fase D — Seeder de volumen real** (sección 14) — hacerlo temprano, no al
   final, porque sin datos reales es imposible validar paginación/scroll/
   búsqueda con criterio.
4. **Fase E — Header + burbujas corregidas + composer con formato** (v1
   secciones 3-5, más las correcciones de este documento secciones 7-9).
5. **Fase F — Paginación por cursor + salto a fecha + búsqueda global**
   (secciones 4, 5).
6. **Fase G — Actividad (reacciones) + estados de usuario + roles de admin +
   baja de cuenta** (secciones 6, 10, 11).
7. **Fase H — Notificaciones** (sección 12).
8. **Fase I — Personalización visual** (v1 sección 8-9, más sección 15 de
   este documento).
9. **Fase J — Chats secretos y mensajes temporales** (v1 sección 7).
10. **Fase K — Llamadas y conferencias** (sección 13) — sigue siendo la
    última por su costo de infraestructura; para este punto ya hay volumen de
    datos y navegación reales sobre los que construir el historial de
    llamadas sin inventar mocks.

Cerrar cada fase con: migración corrida y revertible, seeder actualizado si
aplica, entrada en `CHANGELOG.md`, QA manual (`docs/QA.md`), y recién ahí
pasar a la siguiente — mismo criterio que ya definía la v1.

---

## 18. Qué NO hacer (sin cambios respecto a v1, reforzado)

- No usar BLOB para archivos (sección 4.4) — es la corrección más importante
  de esta versión, no negociarla "por simplicidad" a mitad de implementación.
- No usar `OFFSET` para paginar historial de mensajes (sección 4.1).
- No mostrar URLs crudas en las burbujas cuando hay preview disponible
  (sección 9).
- No poner el punto de presencia en el avatar dentro del cuerpo del chat
  (sección 7) — sólo en header y listas.
- No implementar "eliminar cuenta" de forma destructiva — siempre soft
  delete + reactivación por admin (sección 11.2).
- No avanzar a Fase K sin decisión documentada de proveedor de media
  server/SFU (arrastrado de la v1).
