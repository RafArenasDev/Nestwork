# Pendiente — punto de continuación (2026-09-15, sesión 2)

> **Regla de frontend que sigue vigente:** todo diseño/interacción de UI
> usa el skill `apple-design` (ver `docs/DECISIONS.md`) — nada de
> librerías de diseño/animación nuevas. Excepciones concretas:
> `emoji-picker-react` (utilidad funcional, reskineada por completo con
> variables `--epr-*` en `app.css`) y extensiones de Tiptap ya
> instaladas.
>
> Esta sesión continuó sobre la rama `main` (la sesión anterior,
> `feat/message-actions-and-fixes`, ya está mergeada). Todo lo de abajo
> se hizo directo sobre una rama nueva por tema y se mergeó al cierre —
> ver "Cómo retomar" para los nombres reales de rama/commit.

## Qué quedó terminado esta sesión

**Dos bugs críticos de raíz, arrastrados desde antes de esta sesión:**

1. **`Message::is_hidden` null en memoria** (`app/Models/Message.php`):
   `Message::create()` no reflejaba el default de BD (`is_hidden =
false`) en la instancia recién creada, así que
   `MessageData::fromMessage()` reventaba con `TypeError` en el
   argumento `$isDeleted` en **cada** creación/actualización de mensaje
   — capturado en silencio por el try/catch alrededor de
   `broadcast(new MessageSent(...))`. Esto rompía TODO broadcast en
   vivo (reacciones, ediciones, mensajes nuevos) para cualquier otro
   participante, en todo el histórico del proyecto, no sólo en
   funcionalidad nueva. Fix: `protected $attributes = ['is_hidden' =>
false];` en el modelo.
2. **Preview de PDF en blanco con LibreOffice**: `soffice --convert-to
png` directo sobre un PDF real producía una imagen totalmente en
   blanco (reproducido con un PDF real del usuario). Fix: pipeline en
   dos pasos — LibreOffice sólo convierte Office/texto → PDF; el
   render de la página a PNG lo hace **Poppler** (`pdftoppm`, instalado
   vía `winget install oschwartz10612.Poppler`), mucho más confiable
   para esa tarea puntual. Ver `app/Actions/Attachments/GenerateAttachmentPreview.php`.

**Reacciones — una sola por usuario:**

- Backend (`toggleReaction`) borra cualquier otra reacción del mismo
  usuario en ese mensaje antes de crear la nueva (antes se podían
  acumular varias).
- La burbuja muestra un badge de esquina (no una fila lateral) con
  overlay tipo Popover: tocarlo lista "Nombre — emoji" de cada
  reactor, con "(Tú)" si es el propio usuario. Ya no es un toggle al
  tocar el badge (sólo informativo); reaccionar sigue siendo desde el
  picker.

**Selector de emoji reskineado (`resources/js/components/reaction-picker.tsx`, nuevo):**

- Un solo componente (`ReactionPickerButton`) reusado en 3 lugares:
  burbuja de mensaje, composer y el modal de imagen/video — antes cada
  uno tenía su propia versión.
- Categorías en español, tema explícito claro/oscuro (`useAppearance()`,
  ya no `AUTO`), buscador en español, sin la vista previa nativa de la
  librería. Estilos vía variables `--epr-*`/`--epr-dark-*` en
  `app.css` (no queda otra forma de tocar esa librería sin CSS
  arbitrario — no expone props de estilo).

**Rediseño completo del modal de imagen/video (`media-viewer.tsx`, reescrito):**

- Panel acotado (`85vh`/`1000px` máx.), esquinas redondeadas, fondo con
  blur — ya no es la superposición transparente de antes.
- Reaccionar desde dentro del modal (antes sólo se podía desde la
  burbuja) — panel con z-index superior al scrim.
- Video: sin panel de acciones fijo (pedido explícito, "sólo quiero
  reproducirlo") — un popover de opciones colgado de la barra de
  controles en su lugar. Imagen/documento sí conservan el panel de
  acciones (reaccionar, responder, reenviar, fijar, más…).
- Zoom (1×–3×) sin estirar imágenes pequeñas; expandir a pantalla
  completa dentro del propio modal (independiente del fullscreen nativo
  de video).

**Adjuntos — paridad imagen/video/documento (`message-attachment.tsx`, reescrito):**

- Mismo patrón de blur + revelar con un tap en los tres tipos; ícono
  cambiado de "ojo" a "descargar" (más preciso: revela **y** guarda al
  chat).
- Video ya no autoreproduce al revelar — muestra poster estático,
  reproduce recién al segundo tap (mismo modal que imagen).
- Documentos con preview real (ver pipeline abajo) usan el MISMO
  componente/patrón que imagen — ya no es una tarjeta aparte con ícono
  genérico.

**Preview real de la primera página de documentos (PDF/Word/Excel/txt) — SÍNCRONO:**

- `app/Actions/Attachments/GenerateAttachmentPreview.php` (nuevo):
  Office/texto → PDF (LibreOffice) → PNG de la página 1 (Poppler).
  Corre dentro del mismo request que sube el adjunto — pedido explícito
  del usuario ("la preview... la quiero desde la miniatura que se
  carga, no al rato").
- **Ambos binarios van en el servidor de despliegue** (Docker/imagen de
  build: `apt-get install -y libreoffice poppler-utils` o equivalente),
  nunca algo que el usuario final necesite instalar — el código busca
  primero rutas típicas de instalación y cae a `where`/`which` en
  PATH, así que funciona igual en Windows (dev) y Linux (prod) sin
  cambios.
- Burbuja: cuando el adjunto es documento con preview real
  (`thumbnailUrl !== null`), se ve edge-to-edge igual que imagen/video,
  con una franja de info (nombre, tipo, peso) entre la imagen y el pie
  de mensaje. Sin preview (zip, sql, exe…) sigue la tarjeta con ícono a
  color (`lib/file-type-style.ts`, nuevo) — a propósito, no tiene
  sentido intentar previsualizar esos.

**⚠️ Hallazgo importante — NO resuelto, ver sección de pendientes:**
el mensaje con adjunto que uno mismo envía se queda mostrando la
preview local (`blob:`) para siempre en vez de actualizarse con la
real del servidor. Diagnosticado a fondo, causa raíz identificada, sin
fix todavía — detalle completo abajo.

**Guardados — vista real (cerraba un pendiente de la sesión anterior):**

- `app/Actions/Messages/ListSavedMessagesForUser.php` +
  `app/Data/SavedMessageSummary.php` (nuevos): lista guardados del
  usuario, con excerpt ("Mensaje eliminado" / cuerpo / "📎 Adjunto").
- Prop compartido `savedMessages` (`HandleInertiaRequests`), entrada
  "Guardados" en el mini-rail y sidebar dedicado
  (`SavedMessagesSidebarList`) — clic salta al mensaje real en su
  conversación (`jumpToMessageId`, mismo mecanismo que el badge de
  fijado).

**Pulido menor:**

- Indicador de "escribiendo…" con 3 puntos animados (antes texto
  plano) — cierra un pendiente de la sesión anterior.
- Saltar al mensaje citado al tocar el badge de "respondiendo a" dentro
  de la burbuja (mismo `jumpToMessage()` que el badge de fijado) —
  cierra otro pendiente de la sesión anterior.
- Forma del pico y sombra de burbuja ajustadas; título "Reenviado" se
  reubica dentro del pie cuando el adjunto es edge-to-edge; bloque de
  mensaje más angosto cuando está vacío (sólo adjunto, sin texto) y más
  amplio cuando trae texto.
- Corrección de hidratación SSR: `revealed` (si ya se tocó "revelar" un
  adjunto) leía `localStorage` en el initializer de `useState`, lo cual
  no existe durante SSR — ahora arranca en `false` y se corrige en un
  `useEffect` posterior al montaje.

Verificado en verde antes del cierre de sesión: `tsc --noEmit`, Pint,
`vp check` (lint+format), build de producción, suite Pest completa
(125 tests / 441 aserciones).

## ⚠️ Pendiente crítico — bug real, causa raíz encontrada, sin fix

**Síntoma:** al enviar un mensaje con adjunto (probado con PDF), el
remitente ve para siempre la vista previa local (con ícono/tarjeta
genérica, usando una URL `blob:` del propio navegador) en vez de
actualizarse con la preview real ya generada en el servidor — ni
esperando 10+ segundos sin recargar. **Recargar la página sí la
muestra bien** (ahí el HTML sale del SSR con datos frescos de BD).

**Se descartó la hipótesis inicial** ("es sólo que el SSR de Inertia en
dev tarda ~4.7s y no esperé lo suficiente") — se confirmó con
`read_page` del navegador que el nodo del DOM sigue usando literalmente
`href="blob:https://chat-app.test/...`, la URL de
`URL.createObjectURL()` generada del lado del cliente ANTES de
enviar. Eso sólo es posible si el mensaje optimista nunca fue
reemplazado por el real — no es un tema de qué tan rápido carga el
render, es que la reconciliación nunca llega a ejecutarse para este
mensaje.

**Causa raíz encontrada:** el POST de `messages.store` con un adjunto
PDF devolvió **503** en la pestaña de Network del navegador — pese a
que el servidor sí completó el trabajo (el `Attachment` y su
`thumbnail_path` quedan bien guardados en BD, confirmado con
`php artisan tinker` de sólo lectura). La hipótesis más probable: el
pipeline sync de conversión (LibreOffice arranca en frío + Poppler)
puede tardar varios segundos, y el proxy de Herd (o el servidor de
desarrollo) tiene un timeout de lectura más corto que eso — el
navegador recibe un 503 de gateway/timeout mientras PHP-FPM sigue
procesando en background hasta terminar. Inertia entonces nunca recibe
el redirect+props frescos que reconciliarían el mensaje optimista, así
que éste se queda con el `status: 'failed'` (o sin reconciliar) para
siempre, con la preview `blob:` local.

**No se intentó ningún fix todavía** — quedó pendiente por pedido
explícito del usuario de cerrar la sesión (documentar + commit/push/
merge). Caminos a evaluar la próxima sesión, de más a menos simple:

1. Medir cuánto tarda realmente `GenerateAttachmentPreview::handle()`
   en caliente vs. en frío (primer `soffice` de la sesión suele ser el
   lento) y comparar contra el timeout real del proxy de Herd/del
   servidor de producción — puede que sólo haga falta subir ese
   timeout.
2. Si el timeout no es ajustable o el pipeline sigue siendo lento:
   mantener el guardado del `Attachment` síncrono (rápido — sólo mover
   el archivo), pero mover **sólo la conversión a preview** a que
   corra igual dentro del request pero con un límite de tiempo más
   corto y agresivo, devolviendo la respuesta al cliente ANTES de que
   el proxy corte, y que el cliente haga un pequeño polling (2-3
   intentos, unos segundos) para recoger el `thumbnail_path` si no
   llegó a tiempo — sigue siendo "casi síncrono" sin violar el pedido
   original tan literalmente.
3. Investigar por separado por qué la reconciliación (`useEffect(() =>
setLiveMessages(messages), [messages])` en
   `resources/js/pages/messages/index.tsx`) deja el mensaje pegado en
   optimista ante CUALQUIER error de red, no sólo timeouts de
   preview — hoy `onError` sólo marca `status: 'failed'`, nunca
   reintenta ni recarga; vale la pena revisar si eso es aceptable o
   si debería reintentar el POST o al menos forzar un `router.reload()`
   para traer el estado real aunque el mensaje haya fallado del todo.

## Otros pendientes menores, quedaron a medio camino

1. **Multi-adjunto por mensaje**: explícitamente diferido por el
   usuario a una rama/sesión aparte (decisión tomada esta sesión, no
   es un olvido).
2. **"Editar" visible sólo mientras corre el tiempo permitido,
   independiente del estado de envío** (enviando/enviado/leído): pedido
   explícito, no implementado todavía.
3. **Reacciones y ediciones deberían reflejarse en "Actividad"**: pedido
   dos veces por el usuario, es un gap real — la vista de Actividad no
   se tocó esta sesión.
4. **Probar el pipeline de preview con un .docx/.xlsx real** (no sólo
   PDF) — el código está escrito para ambos casos pero no se verificó
   end-to-end con un archivo Office real todavía.
5. **Curva del pico**: el usuario pidió verificarla de nuevo una vez
   terminado el trabajo de preview ("puede lograrlo cuando termines lo
   que haces de preview") — ajustada (`skew-y-32deg`,
   `rounded-tr-[4px]`/`rounded-bl-[9px]`) pero no reconfirmada con el
   usuario en esta sesión.

## Qué NO se tocó a propósito

- Igual que la sesión anterior: cifrado E2E/conversación secreta
  (Épica 6.6, espera brainstorming aparte), separar Canales/Grupos/DMs
  (Épica 6.2), autenticación alternativa (Épica 6.7), menciones/
  búsqueda global — nada de esto se tocó.
- Multi-adjunto (ver pendientes arriba) — diferido a propósito, no un
  olvido.

## Cómo retomar

1. Resolver primero el bug crítico de arriba (mensaje con adjunto
   pegado en optimista) — es el más visible/confuso para un usuario
   real, y ya tiene causa raíz diagnosticada, sólo falta decidir el
   camino de fix (ver las 3 opciones arriba) e implementarlo.
2. Verificar el pipeline de preview con un .docx/.xlsx real de
   `Downloads` del usuario.
3. Seguir con los pendientes menores de la lista de arriba en el orden
   que el usuario priorice.
4. La vista de Actividad reflejando reacciones/ediciones es la próxima
   pieza de alcance mediano razonable después de cerrar lo anterior.
