# Actores, roles, participantes y capacidades — fase 4

Siete actores funcionales. Un actor representa interacción autorizada, no una tabla ni un cargo académico. No se confirmó sistema externo iniciador; JWT, PostgreSQL, publicador interno y archivos son componentes del sistema.

| ID | Actor | Criterio verificable |
| --- | --- | --- |
| ACT-SYS-001 | Solicitante de acceso | Persona sin sesión aceptada; solicita credenciales o presenta un refresh válido. No representa una integración externa. |
| ACT-SYS-002 | Usuario autenticado | Sesión admitida por el backend. Algunos endpoints añaden IsActiveUser; no se generaliza esa guarda a todos. |
| ACT-USR-001 | Administración funcional | is_superuser o rol ADMINISTRADOR según is_staff_user. ADMINISTRACION e is_staff por sí solos no otorgan esta autoridad. |
| ACT-USR-002 | Estudiante | Rol ESTUDIANTE. En el filtro común solo accede a postulaciones propias; el rol no prueba propiedad de cualquier expediente. |
| ACT-USR-003 | Docente | Rol DOCENTE. En el filtro común y reportes consulta expedientes asignados; la mera existencia del rol no concede escritura académica. |
| ACT-POS-001 | Propietario de postulación | Relación request.user = postulacion.estudiante. Es condición contextual, distinta del rol; las consultas RELATED no exigen un código de rol. |
| ACT-POS-002 | Usuario vinculado al expediente | Asignación y, solo en defensas, participación en el evento. Las rutas aceptan vínculos diferentes: se conserva el detalle en la matriz; no es un rol global. |

## Roles y autoridad

Los códigos ADMINISTRADOR, ADMINISTRACION, DOCENTE y ESTUDIANTE reconocidos por [core.permissions](../../../core/permissions.py) no son cuatro autoridades equivalentes. `is_staff_user` acepta ADMINISTRADOR o is_superuser; `is_staff` pertenece a Django Admin. ADMINISTRACION no satisface por sí solo esa guarda. No se ha consultado la tabla de roles instalada en PostgreSQL.

La generalización UML de administración, estudiante, docente, propietario y vinculado hacia usuario autenticado expresa sesión necesaria, no transferencia de alcance entre roles. Estudiante no hereda de propietario: debe probar la propiedad para cada expediente. El solicitante de acceso permanece separado.

## Participación académica

Tipos declarados en AsignacionPostulacion.TipoParticipacionChoices:

- `TUTOR`: Tutor.
- `TRIBUNAL`: Tribunal.
- `DOCENTE_MODALIDAD`: Docente de modalidad.
- `PRESIDENTE`: Presidente.
- `SECRETARIO`: Secretario.
- `DIRECTOR_INSTITUTO_INVESTIGACION`: Director del Instituto de Investigación.
- `VICERRECTOR_POSGRADO`: Vicerrector de Posgrado.
- `DECANO_FACULTAD`: Decano de Facultad.
- `DIRECTOR_CARRERA`: Director de Carrera.
- `SUPERVISOR_INSTITUCIONAL`: Supervisor institucional.

Fuente: [AsignacionPostulacion](../../../apps/postulantes/models.py). Los participantes del evento de defensa y dictámenes son registros de atribución académica. Registrar una nota, dictamen, asistencia o decisión sigue siendo una acción administrativa en los endpoints examinados; no se asocia automáticamente al tutor/tribunal como operador. La lectura de defensas sí contempla participantes en su queryset.

## Capacidades de interfaz

[UserCapabilitiesService.resolve](../../../apps/usuarios/services.py) y [AppRoutes.jsx](../../../src/routes/AppRoutes.jsx) deciden visibilidad y navegación. La existencia de un botón o su ocultamiento no concede ni revoca la autorización del backend. Los endpoints IsAuthenticated pueden aceptar usuarios cuyo menú no exhibe una capacidad; esto se documenta sin ampliar sus permisos.

## Perfiles documentales de acceso

Los siguientes nombres son abreviaturas de esta documentación, no clases nuevas ni roles persistidos.

| Perfil | Guarda resumida | Alcance |
| --- | --- | --- |
| PUBLIC | Sin sesión previa; credenciales o token refresh válidos según la operación. | Sin expedientes; no autoriza operaciones académicas. |
| AUTH | IsAuthenticated; no se presume un IsActiveUser adicional. | Catálogos autenticados o notificaciones propias; no concede acceso universal a expedientes. |
| AUTH_ACTIVE | IsAuthenticated e IsActiveUser en la vista. | Cuenta de la sesión; no habilita otras cuentas. |
| ADMIN | IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. | Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso. |
| ADMIN_ACTIVE | IsAuthenticated, IsActiveUser y permiso administrativo del recurso (CanManageUsers, CanManageApplications o IsStaff según la vista). | Catálogos administrativos. La protección del superusuario y el filtro de candidatos añaden restricciones específicas. |
| COMMON | Filtro postulaciones_in_scope: administración; ESTUDIANTE propietario; DOCENTE asignado; otros roles sin alcance. | Administración: todos; estudiante: propios; docente: asignados. No equivale a RELATED. |
| RELATED | IsAuthenticated y queryset por administración, propietario o asignación. En estas consultas el vínculo no exige rol DOCENTE. | Solo expedientes relacionados; el queryset concreto decide el tratamiento de asignaciones históricas. |
| DEFENSE_READ | IsAuthenticated; administración, propietario, asignación (incluida histórica donde all_objects se usa) o participante del evento. | La participación habilita esta lectura de defensas; no habilita registrar asistencia ni evaluación. |
| OWNER_ADMIN | Administración o propietario; la asignación sola no permite esta escritura. | Solo expediente propio o administración, sujeto a política documental y etapa. |
| REPORT | IsAuthenticated y administración o rol DOCENTE en la vista de reportes. | Administración global; docente asignados. ESTUDIANTE rechazado en la vista aunque ScopeService contemple propiedad. |

Evidencia principal: [permisos comunes](../../../core/permissions.py), [alcance de postulaciones](../../../apps/postulantes/permissions.py), [vistas de etapas](../../../apps/postulantes/views.py), [documentos](../../../apps/documentos/views.py) y [reportes](../../../apps/reportes/views.py). El detalle de cada operación prevalece sobre el perfil resumido.
