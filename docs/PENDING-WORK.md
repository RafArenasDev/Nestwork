# Pendiente — punto de continuación (2026-09-14)

> Se agotaron los créditos de la sesión a mitad de una ronda intensiva de
> composer/adjuntos. Este documento es el estado real para retomar sin
> perder contexto — reemplaza la necesidad de releer todo el chat.
> **Regla de frontend que sigue vigente:** todo diseño/interacción de UI
> usa el skill `apple-design` (ver `docs/DECISIONS.md`, entrada
> 2026-09-14) — nada de librerías de diseño/animación nuevas.

## Qué quedó terminado y commiteado esta sesión

Rama `feat/composer-attachments-and-polish` (2 commits, 109 tests + build
+ lint + Pint en verde en cada uno):

- **Mensajes no leídos**: dejaron de marcarse como leídos sólo por abrir
  el chat — ahora requiere interacción real (scroll, mousemove/click/
  tecla al fondo, o enviar una respuesta). Divisor visual "N mensajes
  nuevos" en la primera apertura.
- **Composer (Tiptap)**: negrita/cursiva/subrayado/tachado/código real
  (bug real: a la fuente autoalojada le faltaba el peso 700, por eso
  NINGUNA negrita se veía negrita en toda la app — ya corregido en
  `vite.config.ts`), enlaces con popover (texto + URL, autolink),
  bloque de código con resaltado y lenguaje **auto-detectado** (sin
  obligar a elegirlo), deshacer/rehacer, mayúscula automática al
  escribir (evita mayúscula en URLs), placeholder centrado
  verticalmente.
- **Adjuntos end-to-end**: botones separados por tipo (foto/video/
  documento) + grabación de voz (MediaRecorder). Backend valida el MIME
  REAL del archivo (no sólo la extensión) contra la categoría declarada
  — rechaza un ejecutable disfrazado de imagen. Sin BLOB en BD (ADR ya
  documentado), disco `public` en dev.
- **Render de adjuntos en la burbuja**: fotos/videos arrancan
  borrosos con un ícono de "ojo" — tocarlo revela nítido EN LA BURBUJA
  (no es un modal). Burbuja "edge-to-edge" estilo WhatsApp para
  foto/video sin caption (sin fondo/padding propio), con el pico
  SIEMPRE presente (nunca se negocia). Audio con reproductor propio
  (vidrio, play/pausa, barra de progreso). Documentos como chip
  descargable. Nada se descarga solo — todo requiere click explícito.
- **Links como chips de vidrio** (glassmorphism): en vez de URL cruda o
  dominio pelado, muestran `owner/repo.git` para GitHub/GitLab/
  Bitbucket, o el slug de la URL humanizado, o el nombre del sitio — sin
  fetch/scraping a ningún servidor.
- **Botones/inputs redondos** (macOS): nuevo chat, buscar usuario,
  cerrar chat, botón flotante de bajar/no-leídos (negro en tema claro,
  blanco en oscuro — misma lógica que el botón de Google en el login).

## Bugs/ajustes visuales reportados, AÚN sin resolver

Reportados en la última tanda de feedback, no alcanzaron a corregirse:

1. **El pico de la burbuja de foto/video debe taparlo la propia
   imagen/video, no el fondo de la burbuja** — hoy el pico usa el color
   fijo de la burbuja (`bubbleColor`) y se dibuja con `z-10` ENCIMA del
   media; el pedido es que sea la imagen/video la que "tape" hasta el
   borde, con el pico como parte de esa silueta (posible solución:
   pico con un pequeño recorte del propio `<img>`/`<video>` en esa
   esquina en vez de un cuadrado de color aparte — revisar con cuidado,
   ya hubo 3 rondas de ida y vuelta en este punto específico).
2. **El estado "revelado" de una foto/video no persiste** — hoy es sólo
   `useState` en memoria: al reabrir el chat vuelve a aparecer borroso.
   Pedido explícito: que sea permanente tipo "ya lo descargué a este
   chat" (localStorage/cookie del lado cliente, o mejor, un campo real
   en `message_deletions`-like tabla o en el propio `Attachment`
   marcando `revealed_by_user_id` — decidir diseño antes de programar,
   ver [[feedback_new_models_need_approval]] si aplica una tabla
   nueva).
3. **Modal de imagen/video debe ser un reproductor propio diseñado**, no
   el genérico actual — con botón de cerrar visible, controles propios
   (no depender sólo del `<video controls>` nativo dentro del modal).
4. **Hora + check de leído**: pedido repetido de centrar verticalmente
   respecto al ALTO de la burbuja (no pegado abajo, como está ahora) —
   **ojo**: esto contradice una decisión ya documentada en comentarios
   del código ("la hora vive FUERA de la burbuja, pedido explícito de
   una sesión anterior") — aclarar con el usuario cuál de las dos
   versiones vale antes de tocarlo, para no deshacer una decisión
   bloqueada sin confirmar.
5. **Miniatura de adjunto en el composer**: debe animarse DENTRO del
   propio input de mensaje al cargar (no como una barra/badge separada
   arriba, que es lo que hay hoy). El botón "X" para descartar debe
   vivir en la esquina de esa miniatura (no aparte), con una animación
   de "papelera" al descartar.
6. **Reproductor de audio en la burbuja**: pulir más el diseño (ya se
   hizo una v1 propia con vidrio + barra de progreso, pero pide seguir
   mejorándolo).
7. **Pantalla/card de "chats"**: mejorar diseño en ambos temas (no hay
   detalle más específico todavía, preguntar antes de tocar mucho).

## Feature grande #1 (ya elegida como próxima) — Acciones por mensaje

Reaccionar, responder (ya existe), reenviar, editar, copiar, eliminar —
hoy son botones deshabilitados ("próximamente") en `MessageBubble`.

- **Editar**: debe tener una ventana de tiempo prudente (a definir, ej.
  15-30 min) — pasado ese tiempo la opción de editar desaparece, no
  sigue disponible indefinidamente. Al editar, mostrar "Editado" debajo
  de la hora/check, en un gris más apagado que el texto normal.
- **Eliminar**: coherente con la regla general del proyecto ("archivar,
  no borrar" — ver `docs/DECISIONS.md`/brief) — probablemente soft
  delete + "mensaje eliminado" visible, no desaparición total; definir
  si es "eliminar para mí" (ya existe `message_deletions` en el schema)
  vs "eliminar para todos".
- **Reenviar**: elegir conversación destino, copiar el mensaje (y sus
  adjuntos) a esa conversación.
- **Reaccionar**: definir en qué punto de la burbuja se sobreponen los
  emojis (badge flotando en una esquina, como casi todas las apps) —
  falta tabla de uso real (`reactions` ya existe en el schema, migración
  ya corrida, sólo falta el CRUD + UI).
- **Copiar**: al portapapeles, con el texto plano (no el Markdown
  crudo).

## Feature grande #2 — Menciones (@usuario) en chats grupales

No existe todavía. Necesita: detectar `@nombre.apellido` en el
composer (autocompletar contra los miembros del team/conversación),
resaltar la mención en el render del mensaje, y notificar al
mencionado (encaja con el módulo de Actividad, sección siguiente).

## Feature grande #3 — Separar Grupos/Canales de los chats 1:1

Hoy "General" y otros grupos aparecen mezclados en la misma lista que
los DMs. Pedido: **módulo aparte** para grupos/canales, no la misma
lista. Esto ya estaba parcialmente previsto en el schema (`type` en
`conversations`: `dm`/`group`, y las migraciones de "channel columns"
ya corridas) — falta la separación real en la navegación/UI.

## Feature grande #4 — Búsqueda global

No existe. Ver sección 5 de `PROMPT-MEJORAS-NESTWORK-v2.md` (ya en el
repo) para el diseño original: personas, grupos/canales, mensajes
(`tsvector` de Postgres), archivos compartidos.

## Feature grande #5 — Home/Chats/Actividad deben diferenciarse

Hoy los tres módulos del rail muestran básicamente lo mismo. Falta
definir contenido real y distinto para cada uno (Home como dashboard,
Actividad como feed de eventos — reacciones, menciones, etc., ya
descrito en sección 6 de `PROMPT-MEJORAS-NESTWORK-v2.md`).

## Visión ampliada del producto — pedido explícito, requiere brainstorming propio antes de tocar código

El usuario planteó un cambio de alcance importante que **necesita su
propia ronda de diseño** (no es una feature chica, es una decisión de
arquitectura/seguridad que toca el modelo de datos entero de mensajes):

> Quiere que Nestwork sirva tanto para uso corporativo (como hoy) como
> para dos personas que quieran chatear con privacidad total, "tipo
> hackers, configurable": mensajes cifrados de punta a punta (cada
> conversación con sus propias llaves, o algún esquema dinámico donde
> sólo los participantes puedan descifrar), **guardados en la base de
> datos siempre cifrados, nunca en texto plano**, con toggles por
> conversación para desactivar confirmación de lectura, indicador de
> "escribiendo...", y mensajes efímeros/temporales (ya estaba
> parcialmente en el v1 del prompt de mejoras, sección 7).

**Antes de programar esto:** es una decisión de arquitectura real (qué
esquema de cifrado — libsodium/Web Crypto API con intercambio de
llaves tipo Signal Protocol es lo estándar de la industria para "E2E de
verdad", no un cifrado simétrico compartido ingenuo), con implicaciones
en cómo se buscan mensajes (ya no se puede hacer `tsvector` sobre texto
cifrado), cómo se broadcastea en tiempo real (Reverb ve el payload,
tiene que viajar ya cifrado), y qué se pierde (fuera del cifrado nunca
hay "recuperar cuenta y seguir viendo mensajes viejos" sin guardar la
llave privada en algún lado seguro del lado cliente). **Pasar esto por
`superpowers:brainstorming` como tarea arquitectónica propia** en la
próxima sesión, no implementarlo directo.

## Tarea de investigación pedida (NO hecha todavía — se difirió a propósito por créditos)

El usuario pidió una comparación escrita de cómo resuelven esto (y
otras features) Google Meet, Microsoft Teams, Skype, Slack, WhatsApp,
Line, Viber, Telegram y "cualquier otra plataforma" — versiones más
recientes, mensajes ocultos/temporales, archivos efímeros, todo lo que
se pueda encontrar — para decidir qué construir en Nestwork más allá de
lo que ya existe. Es una tarea de investigación (WebSearch/WebFetch)
que vale la pena correr como su propia sesión/fork dedicado, dado el
volumen de fuentes a revisar — no se hizo esta vez para no seguir
gastando créditos a mitad de la ronda de código.

## Cómo retomar

1. Leer este archivo primero.
2. Confirmar con el usuario cuál de los "bugs visuales aún sin
   resolver" quiere primero (especialmente el punto 4, que puede
   chocar con una decisión ya bloqueada).
3. Si se retoma "Acciones por mensaje": ya está bien acotado arriba,
   se puede ir directo a brainstorming (bounded, no architectural) y
   codear.
4. Si se retoma la visión de cifrado/privacidad: pasar por
   `superpowers:brainstorming` como tarea architectural completa antes
   de tocar código — no es un bugfix chico.
5. La investigación competitiva puede correr en paralelo como un fork
   de investigación, sin bloquear el resto.
