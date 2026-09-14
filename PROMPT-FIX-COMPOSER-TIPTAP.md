# Prompt — Diagnosticar y completar el composer (Tiptap) de Nestwork

> **Contexto para Claude Code:** el composer ya tiene una barra de formato
> visible (B, I, U, S, `</>`, cita, lista, lista numerada — ver captura
> adjunta) pero los botones **no aplican el formato** al escribir. El
> renderizado de mensajes ya enviados (negrita/cursiva dentro de la burbuja)
> sí funciona — el problema está específicamente en la **edición en vivo**
> dentro del composer, no en el render final. Frontend: React + shadcn/ui,
> editor: Tiptap. Se puede instalar cualquier paquete `@tiptap/extension-*`
> que haga falta. Hay un plugin/skill `apple-design` disponible para pulir
> visualmente una vez que la funcionalidad esté resuelta — usarlo **después**
> de arreglar la lógica, no antes.

---

## 0. Antes de tocar código: diagnóstico obligatorio

No asumas la causa — confirmá cada punto en este orden, porque cualquiera de
estos rompe la barra completa sin que el editor tire error visible:

1. **¿Los botones llaman al comando correcto?** Cada botón debe ejecutar
   `editor.chain().focus().toggleBold().run()` (o el comando equivalente), no
   sólo cambiar un estado de React local. Si el botón sólo togglea un
   `useState` decorativo sin llamar a `editor.chain()...run()`, el editor real
   nunca se entera — buscar esto primero, es la causa más común.
2. **¿El editor tiene foco cuando se ejecuta el comando?** Sin `.focus()`
   encadenado, algunos comandos de Tiptap no aplican si el usuario clickeó el
   botón (que le quita el foco al `contenteditable`). Confirmar que **todos**
   los comandos de la toolbar usan `.chain().focus()....run()`.
3. **¿Están las extensiones realmente registradas en `useEditor({
extensions: [...] })`?** Un botón puede existir en la UI sin que la
   extensión correspondiente esté en el array — en ese caso el comando
   `toggleX` ni siquiera existe y Tiptap lo ignora silenciosamente (o tira
   warning en consola, revisar la consola del navegador primero que nada).
4. **¿El estado "activo" del botón usa `editor.isActive('bold')` en cada
   render, suscrito a `editor.on('selectionUpdate')`/`editor.on('transaction')`?**
   Si el botón no re-renderiza en cada transacción del editor, se puede ver
   "prendido" sin estar aplicando nada real (síntoma parecido al bug de
   Tailwind preflight que ya encontraron con las burbujas).
5. **¿Tailwind preflight sigue interfiriendo?** Ya identificaron que
   preflight pisaba `font-weight`/`font-style`/`text-decoration` en las
   burbujas. Revisar si el **contenido editable** del composer (el `.ProseMirror`
   div que monta Tiptap) tiene el mismo problema: aplicar los estilos base de
   `strong`, `em`, `u`/`s`, `code`, `blockquote`, `ul`/`ol` dentro del scope
   `.ProseMirror` explícitamente, no confiar en el reset global.
6. **¿El componente de la toolbar se re-monta en cada keystroke?** Si el
   `Editor` de Tiptap se recrea (por una key de React cambiante o por estar
   mal memoizado) se pierde el estado y los comandos referencian una instancia
   vieja del editor.

Documentá en el propio PR/commit cuál de estas era la causa real — importa
para no repetir el mismo tipo de bug en la próxima feature.

---

## 1. Extensiones de Tiptap necesarias (paquete completo)

Instalar/confirmar cada una — muchas de estas **no vienen en el `StarterKit`
por defecto o vienen pero mal configuradas**:

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-underline \
  @tiptap/extension-link \
  @tiptap/extension-placeholder \
  @tiptap/extension-code-block-lowlight \
  @tiptap/extension-character-count \
  @tiptap/extension-typography \
  lowlight
```

| Feature                                                    | Extensión                                                      | Nota                                                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Negrita                                                    | `Bold` (incluida en `StarterKit`)                              |                                                                                                                             |
| Cursiva                                                    | `Italic` (incluida en `StarterKit`)                            |                                                                                                                             |
| Subrayado                                                  | `@tiptap/extension-underline`                                  | **no viene en StarterKit**, hay que agregarla aparte — causa común de que el botón U no haga nada                           |
| Tachado                                                    | `Strike` (incluida en `StarterKit`)                            |                                                                                                                             |
| Código inline                                              | `Code` (incluida en `StarterKit`)                              | para `` `texto` `` en línea, distinto del bloque                                                                            |
| Bloque de código                                           | `@tiptap/extension-code-block-lowlight` + `lowlight`           | reemplaza el `CodeBlock` básico de StarterKit para tener **resaltado de sintaxis real**, no sólo texto monoespaciado plano  |
| Cita                                                       | `Blockquote` (incluida en `StarterKit`)                        |                                                                                                                             |
| Lista con viñetas                                          | `BulletList` + `ListItem` (incluidas)                          |                                                                                                                             |
| Lista numerada                                             | `OrderedList` + `ListItem` (incluidas)                         |                                                                                                                             |
| Enlaces/hipervínculos                                      | `@tiptap/extension-link`                                       | ver configuración detallada en sección 2                                                                                    |
| Placeholder del input                                      | `@tiptap/extension-placeholder`                                | texto contextual ("Escribe un mensaje a...")                                                                                |
| Atajos tipo `**texto**` → negrita al vuelo                 | `@tiptap/extension-typography` o reglas de `InputRule` propias | opcional pero muy esperado si el usuario viene de Slack/Discord (autoformat al escribir `**`, `_`, `` ` ``, `>`, `-`, `1.`) |
| Enter para enviar vs. Enter para nueva línea en lista/cita | Override de `Enter` con `editorProps.handleKeyDown`            | ya lo resolvieron parcialmente ("Enter continues lists/quotes") — confirmar que sigue andando con las extensiones nuevas    |

Si `StarterKit` ya está siendo usado, **no dupliques** las extensiones que
incluye (Bold, Italic, Strike, Code, Blockquote, BulletList, OrderedList,
ListItem, CodeBlock) — sólo agregá las que faltan (`Underline`, `Link`,
`Placeholder`, y reemplazá `CodeBlock` por `CodeBlockLowlight`
deshabilitando el `codeBlock` default del StarterKit: `StarterKit.configure({
codeBlock: false })`).

---

## 2. Enlaces, hipervínculos y URLs

Esto falta por completo hoy, según mencionás. Config recomendada:

```js
Link.configure({
    openOnClick: false, // en el editor no navega al clickear, sólo al enviar/renderizar
    autolink: true, // detecta URLs escritas/pegadas y las convierte en link automáticamente
    linkOnPaste: true, // si pegás texto que es una URL sobre texto seleccionado, lo convierte en link de ese texto
    protocols: ['http', 'https', 'mailto'],
    HTMLAttributes: {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
    },
});
```

Comportamiento a implementar:

- **Autolink al escribir/pegar**: si el usuario tipea o pega
  `https://ejemplo.com`, se convierte en link clickeable sin acción extra —
  patrón estándar de Slack/Gmail.
- **Botón "Insertar enlace"** en la toolbar (icono cadena 🔗): si hay texto
  seleccionado, abre un popover chico para pegar la URL y aplicarla sobre esa
  selección (`editor.chain().focus().extendMarkRange('link').setLink({href}).
run()`); si no hay selección, pide texto a mostrar + URL.
- **Preview enriquecido al enviar** (esto ya lo tenían planeado como
  `link_previews` en el backend — sección de arquitectura previa): la card
  con título/imagen/dominio se arma **al renderizar el mensaje ya enviado**,
  no dentro del editor. Dentro del composer sólo se ve el link resaltado como
  tal (color de acento + subrayado), sin URL cruda visible una vez aplicado el
  mark (mostrar el texto del link, no la URL completa, si el usuario escribió
  texto + link vía el popover).
- **Editar/quitar un link existente**: al poner el cursor sobre un link ya
  aplicado, mostrar un mini popover flotante (Tiptap `BubbleMenu`) con
  "Editar" / "Quitar enlace" — mismo patrón que Gmail/Notion.

---

## 3. Bloque de código: resaltado + selector de lenguaje

- Reemplazar el bloque de código plano por `CodeBlockLowlight`, con
  `lowlight` configurado con los lenguajes que un team de developers va a
  usar de verdad (mínimo: `javascript`, `typescript`, `php`, `python`, `json`,
  `bash`, `sql`, `css`, `html`) — no cargar los ~190 lenguajes completos de
  golpe, importar sólo los necesarios para no inflar el bundle.
- **Selector de lenguaje** visible en la esquina del bloque una vez insertado
  (dropdown chico, no un botón más en la toolbar principal) — el usuario elige
  el lenguaje después de escribir el código, y el resaltado se re-aplica al
  cambiarlo.
- Atajo rápido: escribir ` ``` ` seguido de Enter inicia un bloque de
  código automáticamente (comportamiento nativo de Tiptap `CodeBlock` vía
  input rules, confirmar que sigue activo con `CodeBlockLowlight`).
- Preservar indentación exacta (esto ya estaba pedido en la spec de
  arquitectura — confirmar que el `white-space: pre` se mantiene tanto en el
  editor como en el render final de la burbuja).

---

## 4. Rediseño de la toolbar (inspirado en Slack / Gmail / Notion)

La barra actual (fila de iconos siempre visible debajo del campo) es un buen
punto de partida — pulir así:

- **Estado activo real**: cada botón debe reflejar `editor.isActive('bold')`
  etc. con un fondo resaltado (no sólo cambio de color de icono) cuando el
  cursor está sobre texto con ese formato — igual que Gmail/Word. Esto
  **depende de que el diagnóstico de la sección 0 esté resuelto**, si no, el
  estado activo sigue mintiendo.
- **Tooltips con atajo de teclado**: al hacer hover sobre cada botón, mostrar
  tooltip "Negrita (Ctrl+B)", "Cursiva (Ctrl+I)", etc. — los atajos de
  teclado ya vienen gratis con `StarterKit`/`Underline`, sólo hay que
  comunicarlos en la UI.
- **Separadores visuales** agrupando por tipo: [B I U S] | [código inline,
  bloque de código] | [cita, lista, lista numerada] | [enlace] — igual
  criterio de agrupación que la barra de Gmail.
- **Toolbar flotante contextual (`BubbleMenu`) además de la fija**: al
  seleccionar texto, Tiptap puede mostrar una mini-barra flotante justo sobre
  la selección (patrón Notion/Medium) con los formatos más usados (B, I, link)
  — esto es opcional/fase 2, la barra fija ya cubre el caso base, pero es una
  mejora de UX real si quieren acercarse a Slack (Slack usa exactamente este
  patrón: la barra aparece al seleccionar texto).
- **Placeholder dinámico** (`@tiptap/extension-placeholder`): "Escribe un
  mensaje a Rafael Arenas…" en vez de vacío, coherente con lo ya definido en
  la spec de composer.
- **Autoformato al escribir markdown** (si se agrega `Typography`/input
  rules propias): escribir `**texto**` y que se convierta en negrita en vivo,
  `` `código` `` en código inline, `> ` al inicio de línea en cita, `- ` en
  lista — esto es lo que hace que se sienta "como Slack" de verdad, más que
  sólo los botones.

---

## 5. Checklist de verificación manual (correr uno por uno antes de dar por cerrado)

- [ ] Seleccionar texto y click en **B** → se pone negrita, el botón queda
      resaltado, click de nuevo lo saca.
- [ ] Cursor sin selección, click en **B**, escribir → lo que se tipea sale en
      negrita, click de nuevo la desactiva para lo que sigue.
- [ ] Mismo test para _I_, _U_, ~~S~~.
- [ ] Código inline: seleccionar texto, click `</>`, se ve monoespaciado con
      contraste correcto en ambos temas (claro/oscuro).
- [ ] Cita: click en el botón de cita en una línea vacía, escribir, Enter
      continúa la cita (no envía el mensaje), Enter dos veces seguidas la
      cierra.
- [ ] Lista con viñetas y lista numerada: mismo comportamiento de Enter que
      cita, Tab indenta un nivel, Shift+Tab desindenta.
- [ ] Bloque de código: insertar, escribir código con indentación (tabs y
      espacios), el resaltado de sintaxis se ve, cambiar el lenguaje del
      selector re-pinta el resaltado.
- [ ] Pegar una URL suelta → se autoconvierte en link clickeable (con
      `openOnClick:false` dentro del editor, para no navegar por accidente
      mientras escribís).
- [ ] Seleccionar texto, usar el botón de enlace, pegar URL → el texto queda
      linkeado, mostrando un mini popover al pasar el cursor con
      Editar/Quitar.
- [ ] Enviar un mensaje combinando **todos** los formatos anteriores en un
      solo mensaje → confirmar que la burbuja final renderiza cada uno
      correctamente (ya lo lograron para B/I, falta confirmar el resto).
- [ ] Cambiar de tema claro/oscuro con contenido con todos los formatos
      visible → nada pierde contraste (mismo bug que ya cazaron con el código
      inline en burbujas oscuras, revisar que no se repita ahora dentro del
      editor).
- [ ] Revisar consola del navegador sin warnings de Tiptap sobre extensiones
      duplicadas o comandos inexistentes.

---

## 6. Orden de trabajo sugerido

1. Diagnóstico (sección 0) — no escribir código nuevo hasta identificar por
   qué los botones actuales no aplican nada.
2. Arreglar los comandos existentes (B/I/U/S/código/cita/listas) sobre la
   causa real encontrada.
3. Agregar `Link` con autolink (sección 2) — es la pieza que falta por
   completo, no un arreglo de algo roto.
4. Mejorar el bloque de código con `CodeBlockLowlight` + selector de lenguaje
   (sección 3).
5. Pulido de toolbar (estados activos, tooltips, agrupación visual — sección 4) — recién acá invocar el skill/plugin `apple-design` para el pulido
   visual final, una vez que toda la funcionalidad del checklist (sección 5)
   esté en verde.
6. Correr el checklist completo antes de commitear, y agregar tests Pest/
   Vitest para al menos: toggle de cada mark, autolink al pegar, y Enter
   dentro de lista/cita no enviando el mensaje.

No mezclar esto con la rama de attachments — es la misma área de UI (composer)
pero un problema distinto y ya bastante grande por sí solo.
