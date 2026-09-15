# Pendiente — punto de continuación (2026-09-15)

> **Regla de frontend que sigue vigente:** todo diseño/interacción de UI
> usa el skill `apple-design` (ver `docs/DECISIONS.md`, entrada
> 2026-09-14) — nada de librerías de diseño/animación nuevas. Única
> excepción concreta hasta ahora: `emoji-picker-react` (utilidad
> funcional, no de diseño — pedido explícito del usuario, ver más
> abajo).
>
> Documentos de referencia en la raíz/`docs/` que gobiernan las
> prioridades: `ANALISIS-PRIORIZACION-NESTWORK.md` (respuesta del
> usuario a la propuesta) y `docs/propuestas/Nestwork-Propuesta-2026-09-14.docx`
> (documento completo de 17 épicas). Este archivo es el detalle técnico
> de continuación; esos dos son el mapa de producto.

## Qué quedó terminado y commiteado esta sesión (rama `feat/message-actions-and-fixes`)

Épica 6.3 completa (y algo más de lo planeado originalmente, agregado a
pedido explícito durante la sesión):

- **Reaccionar**: toggle en tiempo real (Reverb), picker rápido +
  emoji-picker-react completo ("+" dentro del popover) para cualquier
  emoji. Se muestra como el emoji suelto (sin fondo/círculo) al lado
  opuesto de la burbuja, centrado contra su altura.
- **Responder / Reenviar / Copiar**: responder ya existía; reenviar
  copia cuerpo + adjuntos (mismo archivo físico) a una o varias
  conversaciones; copiar usa el texto plano (sin markdown crudo).
- **Editar**: ventana de 15 minutos **y** tope de 5 ediciones (lo que
  se cumpla primero) — `MessageData::EDIT_WINDOW_MINUTES` /
  `::MAX_EDITS`. El composer precarga el mensaje con su formato
  intacto (parser markdown→Tiptap en `lib/markdown-to-editor.ts`).
  Muestra "Editado" en gris junto a la hora.
- **Eliminar, dividido en dos** (pedido explícito a mitad de sesión):
  - *Para mí*: cualquier participante, cualquier mensaje — reutiliza
    `message_deletions` (ya migrada, sin usar hasta ahora). Desaparece
    sólo de mi lista.
  - *Para todos*: sólo el autor — el cuerpo se mueve cifrado
    (`Message::original_body`, cast `encrypted`) y queda "Mensaje
    eliminado" visible para todos. Sin botón de restaurar en la UI (se
    consideró innecesario — el dato sigue en BD por si se retoma).
- **Guardar mensaje**: toggle privado del viewer (`saved_messages`,
  tabla nueva). **Falta la vista "Guardados" en sí** — el toggle
  funciona pero no hay dónde listarlos todavía (ver pendientes).
- **Fijar mensaje**: un fijado por conversación (`conversations.pinned_message_id`),
  visible para todos los participantes (evento `ConversationPinChanged`
  por Reverb). Se muestra como badge debajo del título del chat (no en
  la burbuja), con salto al mensaje y botón de desfijar.
- **Limpiar chat**: pregunta alcance — "Solo hoy" (bulk-insert en
  `message_deletions`) o "Todo el historial" (`conversation_participants.cleared_at`).
  Sólo afecta al que lo pide.
- **Eliminar conversación**: además de ocultarla de la lista
  (`hidden_at`, ya existía), ahora también limpia el historial visual
  para quien la elimina (`cleared_at`). El otro participante no se
  entera de nada.
- **Emoji picker real** instalado (`emoji-picker-react`, MIT/gratis) —
  botón dedicado en el composer y "+" en el panel de reacciones.
- **Bugs de layout corregidos**: el grupo de acciones al hover NUNCA
  funcionaba (bug real de `group-hover` con el contenedor mal anidado
  — ni "Responder" aparecía antes de esta sesión); ahora las acciones
  son SIEMPRE visibles (no dependen de hover — no funcionaría en
  móvil). Pico con curva leve hacia el avatar. `APP_URL` corregido a
  `https://` (causaba warnings de Mixed Content con los adjuntos).
  Tiptap actualizado a una versión que ahora trae `Link` incluido —
  se desactivó el duplicado en `StarterKit.configure({ link: false })`.
- **Imágenes reveladas se recuerdan** por dispositivo (`localStorage`,
  `message-attachment.tsx`) — no vuelve a pedir el tap cada vez que se
  reabre el chat.

Todo verificado en verde antes de cada commit: `tsc --noEmit`, Pint,
`vp check` (lint+format), suite Pest completa.

## Pendiente inmediato — quedó a medio camino esta sesión

1. **Vista "Guardados"**: el toggle de guardar ya persiste
   (`SavedMessage`), pero no hay ninguna pantalla que liste los
   mensajes guardados de un usuario. Necesita: entrada en el mini-rail
   o en el dropdown de usuario, y una vista simple (lista + salto al
   mensaje original, mismo mecanismo que el badge de fijado).
2. **Animación de "escribiendo…"**: el indicador de texto (whisper de
   Echo) ya funciona, pero es texto plano — falta la animación de
   puntos tipo iMessage/WhatsApp (3 puntos con spring, respetando
   `prefers-reduced-motion`).
3. **Saltar al mensaje original al tocar una cita de respuesta**
   (WhatsApp-style) — ya existe el mecanismo (`id="message-{id}"` +
   `scrollIntoView`, usado por el badge de fijado) pero no está
   conectado al badge de "respondiendo a" dentro de la burbuja.
4. **Miniatura de adjunto en el composer**: sigue pendiente de rondas
   anteriores — debe animarse DENTRO del input al cargar (no como
   barra separada), con el botón "X" en la esquina de la miniatura.
5. **Modal de imagen/video con reproductor propio diseñado** — el
   lightbox actual es funcional pero genérico.

## Qué NO se tocó a propósito (deliberadamente fuera de esta sesión)

- **Conversación secreta / mensajes efímeros / cifrado E2E real**
  (Épica 6.6 de la propuesta) — el propio `ANALISIS-PRIORIZACION-NESTWORK.md`
  del usuario la separó explícitamente para una sesión de
  `superpowers:brainstorming` architectural aparte, dado su impacto en
  el modelo de datos y la búsqueda. El cifrado en reposo agregado esta
  sesión (mensajes eliminados) es cifrado simétrico simple con
  `APP_KEY` — NO es E2E, no reemplaza esa épica.
- **Separar Canales/Grupos/DMs en módulos propios + hilos** (Épica 6.2)
  — siguiente épica de "Alta/Alta" según el propio análisis del
  usuario, recomendada para después de 3-4 ramas chicas exitosas.
- **Autenticación (invitados vs. dominio, alternativas a OAuth)**
  (Épica 6.7) — sin empezar.
- **Menciones @usuario, búsqueda global, separación Home/Chats/Actividad**
  — sin empezar (Fase 2 del roadmap de la propuesta).
- Todo lo demás del documento de propuesta (multiplataforma, temas,
  animaciones de transición entre chats, etc.) — sin empezar, en orden
  según `ANALISIS-PRIORIZACION-NESTWORK.md`.

## Cómo retomar

1. Leer `ANALISIS-PRIORIZACION-NESTWORK.md` para el orden de
   prioridades ya acordado.
2. Cerrar primero los 5 puntos de "Pendiente inmediato" de arriba —
   son chicos y ya están mapeados.
3. Siguiente rama grande sugerida por el propio análisis del usuario:
   `feature/nav-from-database` (Épica 6.1, deuda repetida desde el
   inicio del proyecto) — el menú del mini-rail/sidebar todavía está
   hardcodeado en el frontend, no viene de base de datos.
4. La visión de cifrado E2E/privacidad total sigue esperando su sesión
   de `superpowers:brainstorming` dedicada — no empezar directo.
