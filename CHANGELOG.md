# Changelog

Formato: una sección por versión (`## vX.Y.Z - YYYY-MM-DD`), un resumen corto,
y una lista de viñetas con el detalle de qué cambió — cada viñeta puede
empezar con `**Categoría:**` (Nueva función, Seguridad, Auditoría,
Validación, Legal, Velocidad, Exportación, Diseño, Corrección) para
agruparse visualmente en el modal de "Novedades"; una viñeta sin categoría
se muestra igual, sin agrupar. Escrito para quien usa el software, sin
jerga técnica — el detalle técnico de cada cambio vive en el historial de
Git. El modal de "Novedades" del sidebar y el badge de versión se generan
de este archivo en build time — ver `scripts/generate-changelog.mjs`
(mismo mecanismo que Inventory-Manager).

## v0.1.1 - 2026-09-10

Ajustes visuales para que el panel de usuario se vea y se comporte de forma consistente: modales que abren correctamente, tema oscuro con fondo difuminado, y una barra lateral más limpia.

- **Corrección:** Los modales de Perfil y Contraseña ahora abren correctamente desde el menú de usuario.
- **Diseño:** Los modales se cierran únicamente con el botón "X", para evitar perder cambios sin guardar por un clic accidental fuera del cuadro.
- **Diseño:** El fondo detrás de cualquier modal ahora se difumina (efecto vidrio esmerilado) en vez de solo oscurecerse.
- **Diseño:** Se quitaron los enlaces genéricos ("Repository", "Documentation") heredados de la plantilla inicial, reemplazados por versión, novedades y derechos de autor al pie de la barra lateral.
- **Legal:** Se agregaron Términos y Condiciones, accesibles desde el pie de la pantalla de inicio de sesión.

## v0.1.0 - 2026-09-10

Primer entorno de desarrollo funcionando: inicio de sesión, panel de usuario con cambio de tema e idioma, y toda la documentación de planificación del proyecto.

- **Nueva función:** Inicio de sesión, registro, verificación de email y recuperación de contraseña.
- **Nueva función:** Cambio de tema (claro/oscuro) e idioma (español/inglés) desde el menú de usuario.
- **Nueva función:** Conexión a base de datos PostgreSQL.
