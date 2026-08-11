# Sprint 0 — matriz contractual de permisos

Autoridad administrativa: `is_staff` o `is_superuser`. El código o nombre del rol no concede por sí solo permisos de escritura. Toda lectura requiere autenticación.

## Antes

| Recurso | GET | POST | PUT/PATCH | DELETE | Acciones | Comportamiento observado |
|---|---|---|---|---|---|---|
| periodos, modalidades, requisitos, modalidad-requisitos | Autenticado | Autenticado | Autenticado | Autenticado | capacidades: autenticado | Cualquier sesión podía alterar catálogos. |
| estados de postulación | Autenticado | Autenticado | Autenticado | Autenticado | — | Estados técnicos eliminables. |
| postulaciones | Staff: todas; resto: propias | Autenticado | Autenticado sobre queryset propio | Autenticado sobre queryset propio | flujo GET por alcance; transiciones Staff | Escrituras ordinarias sin permiso explícito y borrado físico. |
| historial | Staff: todo; estudiante: propio | Autenticado | Autenticado | Autenticado | — | El registro de auditoría era mutable. |
| observaciones | Staff: todas; estudiante: propias | Autenticado | Autenticado | Autenticado | — | Escritura no reservada al personal. |
| tipos/estados de documento | Autenticado | Autenticado | Autenticado | Autenticado | — | Catálogos técnicos sin barrera de escritura. |
| documentos | Staff: todos; estudiante: propios | `/subir`: propietario o Staff | CRUD autenticado; revisión validada en servicio | Autenticado | versiones: alcance; aprobar/rechazar/observar: Staff | El CRUD base permitía cambios o borrado fuera del workflow. |
| seguimiento | Staff: todo; estudiante: propio | No CRUD | No CRUD | No CRUD | transiciones Staff | Frontend usaba una capacidad distinta de la API. |
| asignaciones | Staff: todas; propietario/asignado: relacionadas | No CRUD | No CRUD | No CRUD | finalizar/reemplazar y transiciones: Staff | Lectura acotada; acciones ya tenían permiso explícito. |

## Después

| Recurso | GET | POST | PUT/PATCH | DELETE | Acciones personalizadas | Comportamiento esperado/aplicado |
|---|---|---|---|---|---|---|
| periodos, modalidades, requisitos, modalidad-requisitos | Autenticado | Staff | Staff | Staff | capacidades: autenticado | Lectura por rol autenticado; escritura institucional. |
| estados de postulación | Autenticado | Staff | Staff (incluye desactivar) | Nunca (405) | — | Estado técnico se desactiva y no se elimina. |
| postulaciones | Staff: todas; estudiante: propias; docente: asignadas | Staff | Staff | Nunca (405) | flujo GET por alcance; inicializar/nuevo intento/asignar: Staff | Sin borrado físico; una anulación futura debe ser transición auditada, no funcionalidad de este sprint. |
| historial | Staff: todo; estudiante: propio | Nunca (405) | Nunca (405) | Nunca (405) | — | `ReadOnlyModelViewSet`; solo servicios de dominio generan entradas. |
| observaciones | Staff: todas; estudiante: propias | Staff | Staff | Staff | — | Escritura administrativa explícita y lectura propia. |
| tipos de documento | Autenticado | Staff | Staff | Staff/protección referencial | — | Catálogo administrativo. |
| estados de documento | Autenticado | Staff | Staff (incluye desactivar) | Nunca (405) | — | Estado técnico no eliminable. |
| documentos | Staff: todos; estudiante: propios | CRUD base nunca; `/subir`: propietario o Staff | Nunca por CRUD base | Nunca (405) | versiones por alcance; aprobar/rechazar/observar: Staff | Propiedad validada en queryset/servicio; revisión mediante workflow. |
| observaciones de documento | Staff: todas; estudiante: propias | No CRUD | No CRUD | No CRUD | marcar-corregida: propietario o Staff según servicio | Recurso base de solo lectura y acción trazable. |
| seguimiento | Staff: todo; estudiante: propio; docente: asignado | No CRUD | No CRUD | No CRUD | iniciar/observar/aprobar/rechazar/omitir: Staff | Lectura por alcance; transiciones con permiso explícito. |
| asignaciones | Staff: todas; estudiante/asignado activo o histórico: todas las de sus postulaciones relacionadas | No CRUD | No CRUD | No CRUD | finalizar/reemplazar y transiciones: Staff | Consulta canónica paginada mediante `GET /api/v1/asignaciones/?postulacion={id}`; incluye activas e históricas y mantiene las acciones operativas reservadas. |
| candidatos de asignación | Solo Staff/superusuario; usuarios activos, con rol y no estudiantes | Nunca (405) | Nunca (405) | Nunca (405) | — | `GET /api/v1/usuarios/candidatos-asignacion/`; catálogo paginado y mínimo. Su inclusión no acredita elegibilidad institucional para un cargo. |
| eventos de defensa | Staff: todos; estudiante propietario, actor asignado activo o histórico y participante: eventos de postulaciones relacionadas | La programación existente continúa reservada a Staff | No CRUD base | No CRUD base | quórum: lectura relacionada; programar, iniciar, finalizar, suspender, cancelar y reprogramar: Staff/superusuario | `puede_gestionar_defensas` refleja exclusivamente `is_staff` o `is_superuser`. `GET /api/v1/eventos-defensa/?postulacion={id}` es el contrato canónico paginado. La lista fuera de alcance es vacía; detalle, quórum y consulta contextual ajenos responden `404`; anónimo recibe `401`. Evento, quórum y evaluación son registros técnicos, no certificaciones institucionales. |
| participantes de defensa | Lectura incluida en el evento para usuarios relacionados | Alta y retiro: Staff/superusuario | No CRUD base | No CRUD base | agregar/remover: `PROGRAMADA`, `EN_CURSO`, `SUSPENDIDA`; asistencia: solo `EN_CURSO`; quórum: lectura relacionada | `FINALIZADA` y `CANCELADA` rechazan mutaciones. El retiro es lógico y la nueva alta de la misma asignación reactiva el registro histórico limpiando su asistencia previa. No genera notificaciones ni acredita composición institucional. |
| evaluaciones de defensa | Incluidas en el evento para usuarios relacionados | Registro consensuado: Staff/superusuario | No CRUD base | No CRUD base | evaluar en `EN_CURSO` o `FINALIZADA` con quórum; consolidar evento `FINALIZADA`: Staff/superusuario | `puede_gestionar_evaluaciones` coincide con la autoridad administrativa. Tribunal aporta al consenso institucional, pero ningún Tribunal, Tutor, Docente de Modalidad, Presidente, Secretario o estudiante registra individualmente mediante su rol. Un consenso por evento/tipo; operación auditada. |
| condiciones y entregas | Staff: todas; estudiante propietario y actor activo o histórico: postulaciones relacionadas | Staff/superusuario mediante acciones existentes | Staff/superusuario mediante acciones existentes | No borrado físico | verificar/rechazar condición y registrar entrega: Staff/superusuario | La lectura mantiene aislamiento por postulación. Las mutaciones rechazan postulaciones inactivas, concluidas o rechazadas y generan historial técnico. No acredita cierre legal ni cantidad normativa oficial de ejemplares. |
| cierre técnico | Staff: todos; estudiante propietario y actor activo o histórico: postulaciones relacionadas | Nunca por CRUD base | Nunca por CRUD base | Nunca | aprobar revisión final, aprobar cierre documental, concluir y reabrir: Staff/superusuario | `puede_gestionar_cierre` coincide con la autoridad administrativa. El backend decide las acciones posibles y valida resultado final, faltantes y etapas; la reapertura exige motivo. Cada transición genera auditoría/evento de dominio. No representa cierre legal universitario. |

### Alcance técnico del expediente

Los endpoints de consulta de detalle, flujo, resultado final y cierre comparten el mismo alcance por objeto: Staff o superusuario puede consultar cualquier postulación; el estudiante consulta la propia; y un actor conserva acceso a la postulación que le fue asignada tanto mientras la asignación está activa como cuando queda histórica. Un usuario autenticado no relacionado recibe `404` y un usuario anónimo recibe `401`. Esta es una política técnica vigente del sistema para mantener un expediente coherente; no constituye una regla institucional permanente y deberá revisarse si aparece una disposición explícita sobre la revocación del acceso histórico.

La consulta de defensas aplica el mismo alcance y añade al participante del evento. El listado canónico devuelve una página vacía cuando el filtro solicitado queda fuera del alcance; el detalle del evento, su quórum y la consulta contextual por postulación ocultan el objeto con `404`. La verificación de quórum solo describe presencia y faltantes técnicos; no acredita composición formal, acta firmada ni resultado académico oficial.

El frontend consume capacidades devueltas por `/api/v1/auth/me/`: ver postulaciones, ver documentos, cargar documentos, ver/gestionar seguimiento, gestionar catálogos, usuarios y configuración. Las rutas y el menú usan esas capacidades; los errores 403 muestran un mensaje uniforme.
