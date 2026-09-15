# Nestwork — Propuesta de rediseño visual (Liquid Glass / Apple-inspired)

> Acompaña a `nestwork-redesign-mockup.html` — abrilo directo en el navegador
> (doble click o arrastralo a una pestaña), es 100% funcional: cambia de
> vista, abre el dropdown de estado, el modal de nuevo chat, y el panel de
> personalización (ícono de engranaje arriba a la derecha). Todo el CSS del
> mockup usa **variables** (`--accent-1`, `--glass-blur`, `--radius-lg`, etc.)
> pensadas para copiarse directo a un `tailwind.config`/`globals.css`, no son
> valores mágicos sueltos.

---

## 1. Diagnóstico de las 10 pantallas actuales

### Lo que ya está bien — no tocar

- **Pantalla de login/registro**: es la mejor pieza del set. El panel dividido
  con curva grande, el logo, la jerarquía de "Continuar con Google" → "o usa
  tu correo" → campos, todo funciona y se ve intencional.
- **Arquitectura de información**: mini-sidebar (Inicio/Mensajes/
  Notificaciones/Archivo/Guardados) + sidebar con lista de conversaciones es
  la estructura correcta, no hay que rehacerla.
- **Contenido del dropdown de estado**: la lista de estados (Disponible,
  Ausente, Ocupado, No molestar, Almorzando, En camino, En una reunión, De
  vacaciones, Enfermo, Fuera de línea) ya es rica — el problema es 100%
  visual, no de contenido.
- **Composer**: ya tiene la barra de formato completa (B/I/U/S/código/cita/
  listas/enlaces/undo-redo) — funcionalmente está resuelto, falta pulido
  visual.
- **Home con datos reales**: "Mensajes sin leer" / "Conversaciones activas"
  con números reales, no placeholders — correcto.
- **Mensaje reenviado** con etiqueta "Reenviado" visible — correcto.

### Lo que está mal — y por qué

1. **No hay ninguna profundidad visual todavía.** Todo (stat cards, filas de
   lista, el dropdown de estado, el modal de nuevo chat) es plano: fondo
   sólido, borde de 1px, sombra mínima o inexistente. Es el problema raíz de
   por qué no se siente "Apple/liquid glass" — ese lenguaje se construye con
   **blur + transparencia + sombras en capas**, ninguna de las tres está
   presente hoy.
2. **El dropdown de estado está mal anclado** (captura 3): aparece flotando
   en una posición que no corresponde visualmente a su disparador, sin blur
   de fondo, con esquinas casi rectas — se ve como un bug, no como un menú
   intencional.
3. **Las burbujas de mensaje son rectángulos redondeados genéricos**, sin el
   "pico" hacia el avatar que se definió en la spec de arquitectura, y sin
   sombra en capas — se ven pegadas al fondo en vez de flotar sobre él.
4. **La curva grande ("gotera") sólo existe en el login.** Es la pieza más
   distintiva del proyecto y no se repite en ningún otro lado — la app por
   dentro es un rectángulo de esquinas rectas, se pierde la identidad visual
   apenas se entra a la app real.
5. **El mini-sidebar es una barra plana sin jerarquía.** No hay tooltip al
   hover, el ítem activo apenas se distingue (un puntito rojo y ya), y el
   avatar de usuario abajo no tiene ningún tratamiento especial pese a ser el
   punto de entrada al menú más usado (cambiar estado).
6. **El modal de "Nuevo chat" y el toggle de tema** son funcionales pero
   genéricos — exactamente el "SaaS-card kit" del que hay que alejarse:
   mismo radio en todo, misma sombra gris tenue, sin blur.
7. **Tipografía sin jerarquía deliberada**: "Hola, Rafael" y los títulos de
   sección usan el mismo peso/familia que el resto del texto — no hay una
   voz tipográfica de marca distinta para momentos de bienvenida/branding.

---

## 2. Sistema de diseño propuesto (tokens — ya implementados en el mockup)

### Paleta

| Token                                      | Valor (oscuro)                          | Valor (claro) | Uso                                                                                                                                    |
| ------------------------------------------ | --------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `--bg`                                     | `#0A0D14`                               | `#EEF1F7`     | Fondo general de la página, detrás del "shell" flotante                                                                                |
| `--bg-elevated`                            | `#10141d`                               | `#FFFFFF`     | Fondo de paneles sólidos (sidebar, contenido)                                                                                          |
| `--accent-1` / `--accent-2`                | `#5B7FFF` / `#8B6CFF`                   | igual         | Gradiente de marca "Aurora" — CTAs, burbujas propias, ítem activo                                                                      |
| `--online` / `--away` / `--busy` / `--dnd` | `#34D399` `#F5B942` `#F0635A` `#E1483F` | igual         | Semántica de presencia — colores convencionales, no innovar acá (la claridad importa más que la originalidad en indicadores de estado) |

Se evitó a propósito la paleta "crema cálido + terracota" y el "negro con un
sólo acento ácido" — son los dos defaults más reconocibles de diseño
generado por IA; el azul-violeta "Aurora" es una elección específica para
una marca de red/nodos (coherente con el propio logo hexagonal de Nestwork).

### Tipografía

- **Inter** para toda la UI funcional (texto de mensajes, labels, botones) —
  elección deliberada por legibilidad en una interfaz densa en información,
  no el default sin pensar.
- **Sora** (peso 600-800) reservada para: el wordmark "Nestwork", saludos de
  Inicio ("Hola, Rafael"), títulos de sección grandes y encabezados de modal
  — le da una voz de marca distinta sin necesitar una tercera fuente.

### Profundidad (el corazón del pedido "liquid glass")

```css
--glass-blur: 22px; /* backdrop-filter: blur() */
--glass-alpha: 0.06; /* opacidad del fondo blanco sobre glass oscuro */
--glass-border-alpha: 0.1; /* borde sutil que separa el glass del fondo */
--shadow-elevated:
    0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px -8px rgba(0, 0, 0, 0.55),
    0 24px 64px -24px rgba(91, 127, 255, 0.25);
--shadow-soft:
    0 1px 1px rgba(0, 0, 0, 0.2), 0 6px 18px -6px rgba(0, 0, 0, 0.45);
--shadow-pop:
    0 4px 12px rgba(0, 0, 0, 0.25), 0 20px 48px -12px rgba(0, 0, 0, 0.55);
```

Regla de aplicación: **todo elemento que "flota" sobre otro contenido**
(header del chat, composer, dropdown, modal, drawer de ajustes, stat cards)
usa `backdrop-filter: blur(var(--glass-blur))` + fondo semitransparente +
`--shadow-soft` o `--shadow-pop` según qué tan por encima esté en la
jerarquía. Los paneles base (sidebar, mini-sidebar, fondo del chat) **no**
llevan blur — el blur se reserva para lo que se percibe como "flotando",
si todo lleva blur deja de leerse como jerarquía y se vuelve ruido visual.

### Radios

```css
--radius-shell: 28px; /* el contenedor completo de la app — la "gotera" grande */
--radius-lg: 20px; /* cards, modal, header de chat, composer */
--radius-md: 14px; /* filas de lista, ítems del mini-sidebar */
--radius-sm: 10px; /* inputs */
--radius-pill: 999px; /* botones principales, badges, toggle de tema */
```

La corrección clave respecto a la interferencia que mencionás entre las
curvas de mini-sidebar/sidebar: **la curva grande (`--radius-shell`) vive
en un solo lugar — el contenedor exterior de toda la app** (`.app-shell` en
el mockup), no en cada panel interno por separado. Mini-sidebar y sidebar
adentro tienen esquinas rectas entre sí (se tocan), y es el `overflow:hidden`

- `border-radius` del contenedor exterior el que corta las cuatro esquinas
  externas en un solo gesto. Esto es lo que se rompía antes: al ponerle radio
  a cada panel por separado, las curvas de paneles vecinos competían entre sí
  y se generaban esos huecos/costuras raras. Un único radio en el contenedor
  padre resuelve el problema de raíz.

---

## 3. Componente por componente — qué cambia

| Componente                          | Antes                                                            | Ahora (ver mockup)                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mini-sidebar                        | Barra plana, ítem activo = punto rojo                            | Ítems con fondo glass en hover/activo, barra de acento a la izquierda del activo, tooltip al hover, avatar de usuario con anillo degradado + badge de estado con emoji |
| Sidebar                             | Fondo sólido plano                                               | Tinte de color/gradiente personalizable superpuesto (`--sidebar-tint`, sección 4) sobre el mismo `--bg-elevated`, buscador rápido agregado arriba de la lista          |
| Header de chat                      | No visto en capturas (placeholder "Selecciona una conversación") | Card glass flotante con avatar+nombre+estado+iconos de acción, separada visualmente del listado de mensajes                                                            |
| Burbujas                            | Rectángulo redondeado genérico                                   | Esquina inferior "recortada" hacia el avatar (efecto pico), sombra en dos capas, agrupación de racha sin repetir avatar                                                |
| Botón responder/reaccionar/reenviar | No visible en capturas                                           | Mini-barra flotante que aparece al hover sobre el mensaje (`.msg-actions`), no depende de clic derecho                                                                 |
| Dropdown de estado                  | Mal anclado, sin blur, esquinas rectas                           | Glass panel anclado al avatar, animación de escala tipo spring, esquinas grandes consistentes con el resto                                                             |
| Modal "Nuevo chat"                  | Blanco plano                                                     | Glass oscuro/claro con blur de fondo (backdrop), animación de entrada con escala                                                                                       |
| Toggle de tema                      | Switch iOS genérico                                              | Mismo mecanismo pero con el knob en gradiente de marca en vez de blanco liso                                                                                           |
| Personalización                     | No existía                                                       | Drawer lateral nuevo: modo claro/oscuro/sistema, 6 presets de color de sidebar (3 gradientes + 3 planos), slider de intensidad de glass, densidad de mensajes          |

---

## 4. Personalización de sidebar (gradientes + planos, ya funcional en el mockup)

```css
html[data-sidebar='aurora'] {
    --sidebar-tint: linear-gradient(
        165deg,
        rgba(91, 127, 255, 0.2),
        rgba(139, 108, 255, 0.14)
    );
}
html[data-sidebar='sunset'] {
    --sidebar-tint: linear-gradient(
        165deg,
        rgba(255, 138, 101, 0.18),
        rgba(255, 99, 150, 0.12)
    );
}
html[data-sidebar='ocean'] {
    --sidebar-tint: linear-gradient(
        165deg,
        rgba(56, 189, 248, 0.18),
        rgba(45, 212, 191, 0.12)
    );
}
html[data-sidebar='midnight'] {
    --sidebar-tint: linear-gradient(
        165deg,
        rgba(15, 23, 42, 0.5),
        rgba(15, 23, 42, 0.2)
    );
}
html[data-sidebar='grafito'] {
    --sidebar-tint: rgba(120, 124, 140, 0.1);
}
html[data-sidebar='ciruela'] {
    --sidebar-tint: rgba(150, 80, 160, 0.14);
}
```

Se aplica como un `::before` con `position:absolute; inset:0` **detrás** del
contenido de la sidebar, nunca reemplazando `--bg-elevated` — así el tinte
queda como una capa de color sobre la superficie base, no como un fondo
sólido que compita con el texto. La mini-sidebar nunca lee esta variable
(sigue fija en `--mini-sidebar-bg`, casi negro) — coherente con la regla ya
establecida de que la mini-sidebar no es personalizable.

---

## 5. Instrucción para Claude Code

1. **Migrar los tokens de la sección 2 a `tailwind.config`/`app.css`** tal
   cual, con los dos bloques (`:root` oscuro, `html[data-theme="light"]`
   claro) — no reinterpretarlos, son los que ya están validados visualmente
   en el mockup adjunto.
2. **Corregir el contenedor de la app**: un único elemento raíz con
   `border-radius: var(--radius-shell)` y `overflow:hidden` envolviendo
   mini-sidebar + sidebar + contenido — eliminar cualquier `border-radius`
   individual que hoy tengan esos tres paneles por separado entre sí.
3. **Aplicar la regla de blur selectivo** (sección 2, "Profundidad"): sólo
   header de chat, composer, dropdowns, modales, drawer de ajustes y stat
   cards llevan `backdrop-filter`. Sidebar, mini-sidebar y el fondo de
   mensajes NO llevan blur — son la superficie base sobre la que todo lo
   demás flota.
4. **Redisear la burbuja** con el corte de esquina hacia el avatar
   (`border-bottom-left-radius`/`border-bottom-right-radius` reducido en el
   primer/último mensaje de una racha, tal como está en `.bubble` /
   `.grouped` del mockup) y agregar la mini-barra de acciones al hover
   (`.msg-actions`).
5. **Reimplementar el dropdown de estado** anclado correctamente (`position:
relative` en el trigger, `position:absolute` en el menú, nunca coordenadas
   fijas sueltas) con la transición de escala del mockup (`.status-menu` /
   `.status-menu.open`).
6. **Construir el drawer de personalización** (sección 3 de la spec de
   arquitectura previa, ahora con implementación visual concreta en
   `.drawer` del mockup) conectado a `user_preferences.sidebar_color` /
   `theme_mode` / `chat_density` ya definidos en el schema.
7. **No tocar la pantalla de login/registro más que lo necesario** para
   sumarle el mismo lenguaje de glass en la card del formulario (`.glass-
card` del mockup) — el layout y la curva de esa pantalla ya funcionan
   bien, sólo había que sumarle blur/sombra a la card del formulario para
   que combine con el resto de la app.

---

## 6. Qué NO cambiar de esta propuesta sin razón

- No poner blur en absolutamente todo — pierde jerarquía y además es costoso
  en rendimiento con listas largas de mensajes.
- No usar más de un radio de curva grande por pantalla (regla de "gastar la
  audacia en un solo lugar" — la curva del contenedor exterior es la única
  pieza "grande" del lenguaje visual, todo lo demás usa radios chicos y
  discretos).
- No cambiar el mini-sidebar a color/gradiente personalizable — se mantiene
  la decisión ya tomada de que sólo la sidebar expandida es personalizable.
- No introducir una tercera tipografía — Inter + Sora es suficiente para dar
  personalidad sin fragmentar la identidad visual.
