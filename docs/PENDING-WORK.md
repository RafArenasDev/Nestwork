# Pendiente — punto de continuación (2026-09-20, sesión "auditoría + Chats/Grupos/Canales/Reuniones")

> **Regla de frontend que sigue vigente:** todo diseño/interacción de UI
> usa el skill `apple-design` — nada de librerías de diseño/animación
> nuevas. Excepciones concretas: `emoji-picker-react`, extensiones de
> Tiptap ya instaladas, Combobox de shadcn/ui.
>
> Esta sesión se hizo completa en la rama `feat/unified-search-redesign`
> (que ya traía trabajo previo sin mergear: búsqueda unificada, diálogo
> de estado, diferenciación Home/Mensajes). Todo lo de abajo se agregó
> encima, en varios commits, y se mergeó a `main` al cierre.

## 0. Contexto: por qué esta sesión fue distinta

Arrancó como una auditoría pedida explícitamente ("llevamos meses
agregando minucias, nunca una revisión completa de qué falta frente a
Slack/Teams/WhatsApp/Discord"). Esa auditoría encontró:

1. Dos bugs reales y críticos en cosas que se creían terminadas
   (presencia en tiempo real rota de raíz; adjuntos con preview que se
   quedaban pegados en `blob:` para siempre por un 503).
2. Un hueco estructural: Nestwork sólo tenía chats 1:1 — nada de
   grupos/canales, pese a que el schema ya estaba migrado para eso
   desde el 13 de septiembre y nunca se usó.
3. "Actividad" y el sidebar de "Inicio" eran ambos, literalmente, la
   misma lista de conversaciones reordenada — no mostraban nada
   específico de su propio nombre.

A partir de ahí, la sesión se volvió una ronda larga de diseño/
implementación iterativa con feedback en vivo del usuario (probando
con `composer run dev` + Chrome mientras se construía). Quedó mucho
más por hacer de lo que se alcanzó a construir — ver sección 4, que es
la más importante para la próxima sesión.

## 1. Bugs críticos — RESUELTOS

**Presencia/estado no se reflejaba en tiempo real (el disparador de
toda la sesión).** Causa raíz, en dos partes:

- `routes/channels.php` registraba el canal de presencia como
  `presence-team.{team}` — con el prefijo "presence-" puesto a mano en
  el patrón. Laravel quita ese prefijo del nombre real del canal antes
  de compararlo contra las rutas registradas
  (`UsePusherChannelConventions::normalizeChannelName`), así que ese
  canal era **imposible de unirse** para cualquier cliente, siempre.
  Corregido a `team.{team}`.
- Ni `UserPresenceController` ni `UserStatusController` hacían
  `broadcast()` de nada — sólo `return back()`. Un cambio de estado
  sólo lo veía quien lo hacía. Nuevo evento `UserPresenceUpdated`,
  disparado desde ambos controllers.
- `User::presenceStatus()` derivaba "disponible/ausente/desconectado"
  de `last_seen_at`, que sólo se tocaba al iniciar sesión — nunca
  durante el uso. Un usuario activo se veía "ausente" a los 5 minutos
  de login. Nuevo middleware `TouchLastSeen` (throttleado a 1/minuto).
- **Bug encontrado EN VIVO durante la misma sesión** (probando en
  Chrome): el canal se unía por `id` numérico de equipo, pero
  `Team::getRouteKeyName()` es `"slug"` — el binding implícito nunca
  resolvía el equipo, Reverb devolvía 403 en `/broadcasting/auth`.
  Corregido: unirse por slug en frontend y backend.
- Frontend: `resources/js/hooks/use-live-presence.tsx` (nuevo) — se
  une al canal de presencia del equipo y aplica overrides en vivo
  sobre las filas/headers que muestran presencia de otro usuario.
- **Pendiente real, no resuelto esta sesión:** el "online ahora mismo"
  sigue derivándose de `last_seen_at`/presets manuales, no del
  `here`/`joining`/`leaving` real del canal de presencia (eso daría
  desconexión instantánea al cerrar pestaña/perder red, sin depender
  de ningún timeout). Se evaluó y se dejó fuera a propósito por
  riesgo/tiempo — ver nota en el commit `a955d5d`.

**Adjuntos con preview atascada en `blob:` (bug heredado, ya
diagnosticado en una sesión anterior, nunca arreglado).** Causa raíz:
`GenerateAttachmentPreview` corría SÍNCRONO dentro del propio POST de
subida — LibreOffice en frío + Poppler podían tardar más que el
timeout del proxy de Herd, el navegador veía un 503 mientras el
servidor seguía trabajando, e Inertia nunca recibía el redirect que
reconcilia el mensaje optimista. Fix: nuevo
`GenerateAttachmentPreviewJob` (cola — `QUEUE_CONNECTION=database`, ya
corre con `queue:listen` en `composer run dev`), que al terminar
dispara el mismo `MessageUpdated` que ya usan reacciones/ediciones. El
POST responde de inmediato; la miniatura real llega 1-3s después por
el canal en vivo. **Trade-off marcado a propósito:** el pedido
original era que la preview fuera síncrona ("no al rato") — se decidió
que un envío que puede tumbarse en silencio es peor que una demora
corta con confirmación en vivo.

## 2. Arquitectura nueva: Chats / Grupos / Canales / Reuniones

Diferenciación pedida explícitamente, corrigiendo dos rondas de
malentendido de mi parte hasta llegar a esto (ver historial de commits
de esta sesión para el razonamiento completo):

| Tipo                    | Módulo                 | Quién publica                                | Hilos                                                         | Permisos                        |
| ----------------------- | ---------------------- | -------------------------------------------- | ------------------------------------------------------------- | ------------------------------- |
| DM (`dm`)               | Chats                  | los dos, bidireccional                       | no                                                            | ninguno                         |
| Minichat (`group_chat`) | Chats (junto a los DM) | todos igual                                  | no                                                            | ninguno, nadie administra       |
| Grupo (`group`)         | Grupos (aparte)        | todos, libre                                 | sí (responder ya existente, reetiquetado "Responder en hilo") | admin/creador configura ajustes |
| Canal (`channel`)       | Canales (aparte)       | **sólo admin/creador** en la línea principal | sí, obligatorio para el resto                                 | admin/creador                   |

Todo esto **reusa las columnas migradas desde el 13 de septiembre**
(`name`, `is_public`, `avatar_path`, `description`, `role` en
participantes) que llevaban meses sin una sola línea de código
usándolas — no se creó ninguna tabla nueva.

**Lo que quedó real y funcionando:**

- `ConversationType::GroupChat` nuevo + helpers
  (`isFlatChat()`/`supportsThreads()`/`restrictsTopLevelPostingToAdmin()`).
- Crear grupo (`GroupsController`/`CreateGroup`), crear canal
  (`ChannelsController`/`CreateChannel`, con `is_public` y unirse
  solo), minichat desde "Nuevo chat" eligiendo 2+ personas
  (`ConversationsController::store` extendido).
- **Backend enforcement real** en `MessagesController::store`: en un
  canal, publicar en la raíz (`reply_to_message_id === null`) está
  bloqueado con 403 para quien no sea admin — probado, no es sólo un
  candado visual. El frontend refleja esto: composer reemplazado por
  un aviso para no-admins, con el "Responder" ya existente etiquetado
  "Responder en hilo" en Grupo/Canal.
- Favoritos (tabla `favorites`, migrada 2026-09-13, nunca usada hasta
  ahora) con toggle real + sección propia en Inicio.
- "Actividad" real (reacciones recibidas en tus mensajes,
  `ListActivityForUser`) — ya no la lista de conversaciones reordenada.
- Etiquetas tipo Slack (agrupar chats/grupos/canales bajo un nombre
  propio) — **sólo localStorage por ahora**
  (`use-conversation-tags.tsx`), a propósito: una versión compartida en
  equipo necesita tabla nueva y eso se propone aparte, no se construye
  sin avisar (ver regla de "modelos nuevos necesitan aprobación").
- Reuniones y llamadas de audio/video: **100% mockup visual**, sin
  WebRTC/SFU real (ver sección 4, es la pieza de infraestructura más
  grande que falta). Todo lo que se ve ahí es intencional para que el
  usuario apruebe la forma antes de construir el backend.

## 3. Diseño de listas/filas — qué se corrigió esta sesión

- El toggle de favorito era un ícono de estrella siempre visible,
  centrado en TODA la fila (`position:absolute; top:50%`) — colisionaba
  visualmente con la hora arriba y el badge de no-leídos abajo.
  Reemplazado por un chevron que ocupa el MISMO cupo que la hora (swap
  por `visibility`, no una capa encima) y abre un menú con Favorito/
  Archivar/Silenciar/Marcar no leído/Limpiar/Eliminar.
- El preview de la fila mezclaba un emoji unicode dentro del nodo de
  texto para indicar foto/video/audio/documento — quedaba desalineado
  verticalmente contra el texto (varía por fuente/SO). Reemplazado por
  íconos lucide reales en un contenedor flex.
- Un mensaje de código (bloque ` `lang…``` ```` ) se anunciaba con
  las comillas invertidas crudas en el preview — ahora dice "Código";
  el código en línea (una sola comilla) se limpia de sus comillas en
  el preview normal.
- Ícono de Canales cambiado de bocina (se leía como "volumen") a `#`,
  igual que Slack/Discord.
- El header del CONTENIDO repetía el título del módulo activo como
  breadcrumb sintético — ya se veía en el header de la sidebar
  expandida. Quitado.
- Orden de secciones en Inicio: Recientes (chats) → Favoritos → Grupos
  recientes → Canales recientes → Etiquetas — ninguna sección de
  "recientes" incluye lo que ya está en Favoritos, tope de 20 filas
  por sección, toggle de orden (reciente/alfabético) por sección.

## 4. Lo más importante para la próxima sesión (pedido explícito, sin construir)

Esta lista es larga a propósito — es exactamente lo que el usuario
pidió dejar documentado en vez de construido a medias, dado el límite
de créditos de esta sesión (llegamos a ~68-70% de uso de sesión antes
de cerrar). Cada punto necesita su propia ronda de diseño/aprobación,
no se debe empezar a codificar directo.

### 4.1 Llamadas y Reuniones son DOS conceptos distintos, no uno

Pedido explícito, todavía no separado: una llamada de audio/video con
un contacto o dentro de un grupo/canal es una cosa; una "reunión"
programada (con agenda, invitados, posible grabación) es otra. Hoy
todo vive mezclado dentro de `meetings-view.tsx`. Falta:

- Un módulo "Llamadas" separado de "Reuniones", con su **historial
  bien definido**: entrante/saliente/perdida, de voz o de video, con
  quién, cuánto duró — como el historial de llamadas de WhatsApp/
  Teams. Necesita tabla nueva (`calls` o similar) — proponer antes de
  construir.
- El flujo de llamada 1:1/grupal (desde el botón del header del chat)
  es distinto del flujo de "Reunión" (agendada, con invitados fijos).

### 4.2 Pantalla de llamada — rediseño real, no sólo "así se vería"

El mock actual (`call-mock-dialog.tsx`) fue explícitamente rechazado
por quedarse en placeholders de texto ("así se vería") en vez de un
diseño real. Para la próxima ronda:

- Usar los avatares reales de los participantes (no un ícono
  genérico), con tooltip en cada control (mute, cámara, compartir
  pantalla, grabar, colgar, pantalla completa).
- **Abrir en una pestaña/ventana nueva, no en un `Dialog`** — un modal
  se cierra solo al hacer click afuera y no hay lógica para evitarlo
  todavía; una llamada real nunca debe poder cerrarse por accidente.
  Sólo debe cerrarse con el botón de colgar (o si falla la conexión).
- Opción de pantalla completa.
- Compartir pantalla estilo Meet: elegir pestaña, ventana, o
  monitor completo (monitor 1/monitor 2/etc.) — la Screen Capture API
  del navegador (`getDisplayMedia`) ya ofrece ese selector nativo, hay
  que diseñar alrededor de eso, no reinventarlo.
- Grabar llamadas de **voz** también (no sólo video) — por temas de
  seguridad/auditoría, según el usuario.

### 4.3 Calendario real para Reuniones

Pedido explícito: vistas de mes/semana/día con las reuniones ubicadas
en su franja horaria real (como Google Calendar/Outlook), no una lista
plana. El selector de fecha/hora actual (`datetime-local` nativo) debe
reemplazarse por separar fecha y hora en controles propios de
shadcn/ui (Calendar + selector de hora), con estética tipo
apple-design — nada de inputs nativos del navegador.

Al crear una reunión hace falta además: editar, compartir (link/
notificar a los invitados), eliminar — hoy sólo existe crear. Y NO se
debe abrir el modal de llamada automáticamente al crear una reunión
"para ahora" (como hace hoy) — debe quedar agendada/listada, y el
usuario decide cuándo entrar.

### 4.4 Sidebar de "Reuniones" — necesita más que una frase

El panel lateral de ese módulo hoy es sólo un párrafo de texto. Falta
contenido real: accesos rápidos, próximas reuniones, quizás un
mini-calendario — mismo criterio que el resto de módulos (que si
tienen datos, los muestran en la lista lateral).

### 4.5 Home: navegar no debe recargar mini-rail ni sidebar expandida

Bug de UX real detectado: al hacer clic en Inicio (o cualquier módulo
routeado), la mini-sidebar y la sidebar expandida se recargan enteras
— se ve un parpadeo/"salto" a un diseño más chico un instante antes de
asentarse, molesto. Debería ser un partial reload que sólo toque el
`AppContent` (con un esqueleto/skeleton mientras carga si tarda),
dejando rail y sidebar expandida sin re-renderizarse. Esto es un
cambio de arquitectura de navegación (cómo `handleModuleChange`/
`router.visit` deciden qué repintar), no un ajuste chico — amerita su
propia sesión.

### 4.6 Actividad: saltar a mensajes viejos no precargados

Hoy el salto a un mensaje reaccionado usa `jumpToMessageId`, que sólo
funciona si ese mensaje cayó dentro de los últimos
`INITIAL_MESSAGE_LIMIT` (150) cargados — la misma limitación que ya
tiene el badge de fijado. Si la reacción es sobre un mensaje más viejo,
hoy no hay forma de traerlo. Falta paginación por cursor real (Fase F
del roadmap viejo) antes de que esto quede resuelto de verdad. Además,
al llegar al mensaje reaccionado, debería haber una señal visual clara
sobre CUÁL mensaje es (no sólo centrarlo/hacer scroll) — hoy no existe
ese resaltado.

### 4.7 Cosas más chicas pendientes de esta ronda de feedback

- Menú de fila: falta "Bloquear" (contacto/usuario) — necesita tabla
  nueva (`blocked_users` o similar), proponer antes de construir.
- "Silenciar" necesita duración real (1h/1 día/1 semana/1 año/
  siempre/hasta reactivar) — hoy es sólo on/off. Necesita una columna
  nueva (`muted_until`, distinta de `muted_at`) — proponer antes de
  construir.
- Revisar sistemáticamente qué otros diferenciadores tienen Slack/
  Teams/Discord/WhatsApp que todavía no se evaluaron uno por uno
  (pedido repetido varias veces esta sesión) — la comparación
  detallada de la primera auditoría de esta sesión sigue siendo el
  punto de partida, pero falta profundizar por función concreta antes
  de decidir qué construir.

## 5. Qué NO se tocó a propósito

- Cifrado E2E/conversación secreta (espera su propia sesión de
  `superpowers:brainstorming`, confirmado en sesiones anteriores).
- Épica 6.1 (navegación desde BD, rail/mini-rail hardcodeados) —
  relacionado con 4.5 de arriba, mismo criterio: no tocar navegación a
  medias.
- Contactos como módulo aparte — evaluado y descartado esta sesión: el
  directorio del equipo ya vive donde se necesita (picker de "nuevo
  chat/grupo/canal", bloque de compañeros en Inicio); un ícono más en
  un rail ya cargado con 7 entradas no sumaba.

## 6. Cómo retomar

1. Antes de tocar código nuevo: decidir con el usuario el alcance real
   de Llamadas vs. Reuniones (4.1) — es la base de todo lo demás en
   esa área.
2. El rediseño de la pantalla de llamada (4.2) y el calendario (4.3)
   son los bloques visuales grandes que el usuario más remarcó — cada
   uno merece su propia ronda de `apple-design` antes de codificar.
3. El bug de recarga de rail/sidebar en Home (4.5) es la única pieza
   de esta lista que es un bug de UX puro (no una función nueva) —
   podría resolverse independientemente de las demás si se prioriza.
4. Cualquier tabla nueva mencionada arriba (calls, blocked_users,
   muted_until, etiquetas compartidas en equipo) se propone como
   diseño ANTES de migrar — regla ya establecida para este proyecto.
