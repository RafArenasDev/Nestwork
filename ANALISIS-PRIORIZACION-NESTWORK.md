# Nestwork — Análisis de priorización y alcances (respuesta a la Propuesta 2026-09-14)

> Basado en `Nestwork-Propuesta-2026-09-14.docx` (17 épicas, 5 fases). Este
> documento no reemplaza la propuesta — es la capa de decisión encima de
> ella: qué hacer primero, en qué tamaño de rama, y qué ajustes le haría al
> orden planteado.

---

## 1. Lo que ya está resuelto y no hay que re-litigar

Según la sección 2 del documento ("Estado actual del producto"), el composer
Tiptap (negrita/cursiva/subrayado/tachado/código/enlaces con popover) y los
adjuntos completos con validación MIME **ya están en `main`**. Eso significa
que el trabajo de las dos sesiones anteriores (fix del composer y attachments)
ya se ejecutó. Se arranca limpio desde acá, sin deuda pendiente de esas dos
áreas.

---

## 2. Dos ajustes a la hoja de ruta antes de moverla

### a) "Fase 3 en paralelo a Fase 2" no aplica a un desarrollador solo

El documento lo plantea como si hubiera equipo. Con un dev solo (+ Claude
Code, con créditos limitados) no hay paralelismo real, solo orden.
Interpretación correcta: *"Fase 3 no bloquea a Fase 2, se puede intercalar"*,
no *"corren a la vez"*.

### b) Separar 6.5 de 6.6 más de lo que ya las separa el documento

La **Épica 6.5** (soft-delete cifrado de mensajes eliminados) suena, por
estar cerca de la 6.6 en el texto, a que necesita la misma sesión de
arquitectura. No es así:

- **6.5** solo necesita **cifrado simétrico en reposo** — el `encrypted`
  cast de Laravel sobre la columna, usando el `APP_KEY` ya existente. Cero
  intercambio de llaves, cero rediseño de búsqueda. Es un trabajo de una
  sesión, no una sesión de arquitectura dedicada.
- **6.6** sí necesita esa sesión (E2E real, intercambio de llaves,
  reingeniería del índice de búsqueda para no indexar contenido cifrado).

Recomendación: sacar 6.5 de "espera a la sesión de brainstorming" e
incorporarla directo al alcance de la Épica 6.3 — "Eliminar" sin ese cifrado
en reposo es una función a medias.

---

## 3. Cuadrante de priorización (esfuerzo vs. prioridad)

| | Esfuerzo bajo | Esfuerzo alto |
|---|---|---|
| **Prioridad alta** | 6.1 Navegación desde BD · 6.3 Acciones de mensaje + 6.5 eliminación cifrada | 6.2 Canales/Grupos/Hilos · 6.7 Autenticación y tipos de cuenta |
| **Prioridad media/baja** | 6.4 Guardados · 6.8 Baja de cuenta · 6.10 Favoritos · 6.12 Especificación de sidebar · 6.17 Skeletons | 6.6 Cifrado E2E · 6.9 Presencia y estados · 6.13 Temas · 6.14 Animaciones · 6.15 Multiplataforma |

La esquina **superior-izquierda** es donde se genera avance visible rápido y
barato. La esquina **superior-derecha** es donde vive el riesgo real de que
una sesión se vaya a medias — como pasó con el composer antes de que se
cerrara bien.

---

## 4. Propuesta concreta: próximas 4 ramas, cada una cerrable en una sesión

| # | Rama | Contenido | Por qué en ese orden |
|---|---|---|---|
| 1 | `feature/message-actions-core` | Épica 6.3 sin la parte de eliminar: reaccionar, copiar, reenviar, editar (ventana de 15 min) | Ya estaba marcada como "siguiente prioridad" desde la ronda anterior — mantiene continuidad |
| 2 | `feature/message-delete-encrypted` | "Eliminar" de 6.3 + Épica 6.5 completa: papelera propia, cifrado en reposo (`encrypted` cast), política de retención | Separada a propósito de la rama 1: si algo falla acá, no arrastra reacciones/reenvío que ya funcionan |
| 3 | `feature/nav-from-database` | Épica 6.1 completa: tablas `nav_sections`/`nav_items`, `NavigationService`, prop compartido de Inertia | Deuda que no bloquea nada funcional, pero cuanto más tarde se resuelve, más pantallas nuevas hay que migrar después — conviene ahora, no al final de la Fase 1 |
| 4 | `feature/saved-messages-jump-to-original` | Épica 6.4 completa | Depende directamente del menú contextual construido en la rama 1 (el ícono de guardar vive ahí) |

Con estas 4 ramas se cierra toda la Fase 1 del documento sin repetir una
sesión "gigante" como la del composer.

---

## 5. Qué NO tocar todavía

- **Épica 6.2** (Canales/Grupos/Hilos) y **Épica 6.7** (Auth con magic
  link/passkeys/tipos de cuenta) son las dos de "Alta/Alta" — dejarlas para
  después de tener 3-4 ramas chicas exitosas seguidas, no atacarlas en frío.
- **Épica 6.15** (Multiplataforma): correcta la posición del documento,
  última, esfuerzo "Muy alta", depende de que el modelo de datos esté
  estable. No hay atajo legítimo ahí.
- **Épica 6.6** (cifrado E2E completo): sigue necesitando su sesión de
  arquitectura dedicada tal como plantea el documento — eso no cambia.

---

## 6. Respuestas sugeridas a las preguntas abiertas (sección 9 del documento)

Para no frenar el avance esperando "la respuesta perfecta":

- **Cifrado (6.6):** modo privado opcional por chat (como ya propone el
  documento), no cifrado por defecto en toda la app — permite mantener
  búsqueda global funcional en el resto de conversaciones.
- **Contraseña como método de login (6.7):** mantenerla como respaldo, no
  retirarla todavía — coincide con la propia mitigación de riesgo del
  documento (sección 8), y es más barato que apostar todo a magic
  link/passkeys desde el arranque.
- **Umbral de "descarga la app" (6.15):** decidirlo recién al llegar a esa
  fase, no hace falta resolverlo hoy.

---

## 7. Siguiente paso

Elegir entre:

- **(A)** Arrancar por `feature/message-actions-core` — sigue la priorización
  ya comprometida en la ronda anterior.
- **(B)** Arrancar por `feature/nav-from-database` — cierra primero la deuda
  de arquitectura antes de seguir agregando pantallas sobre datos quemados.

Ambas son válidas; la diferencia es "seguir el compromiso ya hecho" vs.
"cerrar la deuda más vieja del proyecto primero".
