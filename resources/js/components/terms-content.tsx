/**
 * Texto legal único — fuente de verdad para el modal informativo del login
 * (solo lectura, enlazado desde el pie de página). Un solo lugar para editar
 * el contenido, evita que distintas vistas se desincronicen con el tiempo
 * (mismo principio que Inventory-Manager).
 *
 * IMPORTANTE — esto es un BORRADOR PROFESIONAL, no un documento legal
 * validado por un abogado. Antes de operar comercialmente hay que:
 *   1. Revisión por un abogado (jurisdicción, cumplimiento normativo local).
 *   2. Completar los placeholders marcados [ENTRE CORCHETES] — jurisdicción,
 *      razón social/titular, correo de contacto legal.
 * Ver docs/DECISIONS.md para el registro de esta decisión.
 *
 * Cuando se implemente el paso de aceptación obligatoria post-login (como en
 * Inventory-Manager: accept-terms.tsx + terms_version), cualquier cambio de
 * fondo acá (no una corrección de tipeo) debe subir esa versión, o los
 * usuarios que ya aceptaron la versión anterior nunca vuelven a ver el paso.
 */
export default function TermsContent() {
    return (
        <div className="space-y-5 text-sm text-gray-700 dark:text-gray-300">
            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    1. Naturaleza del servicio
                </h3>
                <p>
                    Nestwork es una plataforma de mensajería y colaboración en
                    línea (&quot;el Servicio&quot;) dirigida a equipos de
                    trabajo, operada bajo un modelo de software como servicio
                    (SaaS) multi-tenant: cada empresa u organización que se
                    registra obtiene su propio espacio de trabajo
                    (&quot;Workspace&quot;), independiente y aislado de los
                    demás. El Servicio se encuentra actualmente en fase activa
                    de desarrollo (MVP) y se ofrece &quot;tal cual&quot;, sin
                    garantía de disponibilidad continua ni de que todas las
                    funcionalidades descritas estén operativas en todo momento
                    durante esta fase. Cambios materiales al Servicio o a estos
                    términos se notificarán con antelación razonable.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    2. Cuentas y Workspaces
                </h3>
                <p>
                    El registro es autoservicio: cualquier persona puede crear
                    una cuenta con su correo electrónico (o mediante un
                    proveedor externo habilitado, como Google) y un Workspace
                    propio. Si el dominio de su correo coincide con el de un
                    Workspace ya existente, se le ofrecerá la opción de
                    solicitar unirse a él en lugar de crear uno nuevo, sujeta a
                    la aprobación de un administrador de ese Workspace. Cada
                    usuario es responsable de mantener la confidencialidad de
                    sus credenciales y de toda actividad realizada desde su
                    cuenta.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    3. Contenido del usuario
                </h3>
                <p>
                    El usuario conserva la propiedad de los mensajes, archivos y
                    demás contenido que envía a través del Servicio
                    (&quot;Contenido del Usuario&quot;). Al usar el Servicio, el
                    usuario otorga a Nestwork una licencia limitada, no
                    exclusiva, para almacenar, procesar y transmitir ese
                    Contenido del Usuario únicamente con el fin de prestar el
                    Servicio (entrega de mensajes, indexado para búsqueda,
                    notificaciones). Nestwork no vende ni comparte el Contenido
                    del Usuario con terceros con fines publicitarios o
                    comerciales.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    4. Privacidad y cifrado
                </h3>
                <p>
                    Todas las comunicaciones entre el cliente y el Servicio
                    viajan cifradas en tránsito (TLS).{' '}
                    <strong>
                        El Servicio no ofrece cifrado de extremo a extremo
                    </strong>
                    : el contenido de los mensajes es técnicamente accesible por
                    el operador del Servicio bajo políticas internas estrictas
                    de acceso, limitadas a fines de soporte técnico, seguridad o
                    cumplimiento de una obligación legal — nunca para fines
                    publicitarios ni comerciales. Los datos se almacenan
                    cifrados en reposo a nivel de infraestructura.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    5. Retención y borrado de datos
                </h3>
                <p>
                    Los Canales y Grupos con historial de conversación no se
                    eliminan — pueden archivarse (manualmente por un
                    administrador, o automáticamente si el otro participante de
                    una conversación directa desactiva su cuenta), quedando
                    disponibles en modo solo lectura para quienes ya eran
                    miembros. Un mensaje individual editado conserva una marca
                    de edición visible; un mensaje eliminado por su autor se
                    reemplaza por un aviso de &quot;mensaje eliminado&quot;,
                    preservando la integridad de las respuestas asociadas. Al
                    eliminar por completo un Workspace, su propietario entiende
                    que esta acción sí es irreversible para ese Workspace
                    específico.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    6. Administradores de Workspace
                </h3>
                <p>
                    Los administradores de un Workspace pueden gestionar sus
                    miembros, roles, canales e invitaciones dentro de ese
                    Workspace. No tienen acceso a mensajes directos entre otros
                    usuarios ni a contenido de otros Workspaces, salvo que una
                    obligación legal o una investigación de seguridad
                    debidamente justificada lo requiera expresamente.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    7. Uso aceptable
                </h3>
                <p>
                    Está prohibido usar el Servicio para acoso, contenido
                    ilegal, distribución de malware, spam, suplantación de
                    identidad, o cualquier intento de vulnerar, alterar sin
                    autorización o realizar ingeniería inversa sobre el
                    software. El Servicio está diseñado para comunicación
                    empresarial legítima entre los miembros de un Workspace.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    8. Edad mínima
                </h3>
                <p>
                    El Servicio está dirigido a uso profesional por personas
                    mayores de 18 años. No está diseñado para ser usado por
                    menores de edad.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    9. Propiedad intelectual
                </h3>
                <p>
                    El software, la marca Nestwork y su diseño son propiedad de
                    [TITULAR/RAZÓN SOCIAL A DEFINIR]. El uso del Servicio no
                    transfiere al usuario ningún derecho de propiedad
                    intelectual sobre el software, más allá del derecho de uso
                    aquí descrito.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    10. Límite de responsabilidad
                </h3>
                <p>
                    El operador responde por el correcto funcionamiento técnico
                    del Servicio dentro de lo razonable, pero no es responsable
                    por daños indirectos, pérdida de datos por causas de fuerza
                    mayor, ni por decisiones comerciales u organizacionales que
                    el usuario tome con base en el uso del Servicio.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    11. Terminación
                </h3>
                <p>
                    El usuario puede eliminar su cuenta en cualquier momento
                    desde su configuración de perfil. El operador puede
                    suspender o cancelar cuentas que incumplan el uso aceptable
                    descrito en la sección 7, previo aviso cuando sea
                    razonablemente posible.
                </p>
            </section>

            <section>
                <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    12. Ley aplicable
                </h3>
                <p>
                    Estos términos se rigen por las leyes de [JURISDICCIÓN A
                    DEFINIR]. Para consultas relacionadas con estos términos,
                    contactar a [CORREO DE CONTACTO LEGAL A DEFINIR].
                </p>
            </section>

            <p className="text-xs text-gray-500 dark:text-gray-400">
                Borrador — versión 0.1, septiembre de 2026. Pendiente de
                revisión legal antes de uso comercial.
            </p>
        </div>
    );
}
