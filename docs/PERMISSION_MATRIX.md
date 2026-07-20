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
| asignaciones | Staff: todas; estudiante/asignado: relacionadas | No CRUD | No CRUD | No CRUD | finalizar/reemplazar y transiciones: Staff | Acciones operativas reservadas y lectura relacionada. |

El frontend consume capacidades devueltas por `/api/v1/auth/me/`: ver postulaciones, ver documentos, cargar documentos, ver/gestionar seguimiento, gestionar catálogos, usuarios y configuración. Las rutas y el menú usan esas capacidades; los errores 403 muestran un mensaje uniforme.
