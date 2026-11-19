# Auditoría funcional

## Método y límites

Inspección estática del código de la rama de trabajo. Se revisaron rutas y componentes React, permisos/capacidades, routers API, vistas, servicios y políticas por modalidad. No se autenticó en una instancia viva. Por tanto, “pantalla/ruta implementada” no equivale a disponibilidad en una instalación ni a autorización universal.

## Módulos y navegación

La aplicación cliente registra estas rutas en `src/routes/AppRoutes.jsx` y presenta enlaces condicionados por `src/components/layout/Sidebar.jsx`:

| Pantalla | Ruta UI | Permiso UI |
| --- | --- | --- |
| Inicio | `/dashboard` | `puede_ver_dashboard` |
| Notificaciones | `/notificaciones` | `puede_ver_notificaciones` |
| Postulantes / Mi proceso | `/postulantes` (estudiante se muestra como `/`) | `puede_ver_postulaciones` |
| Expediente | `/postulaciones/:id` | `puede_ver_postulaciones` |
| Documentos / Mis documentos | `/documentos` | `puede_ver_documentos` |
| Modalidades | `/modalidades` | `puede_ver_modalidades` |
| Seguimiento | `/seguimiento` | `puede_ver_seguimiento` |
| Usuarios | `/usuarios` | `puede_gestionar_usuarios` |
| Reporte de postulaciones | `/reportes/postulaciones` | `puede_ver_reportes` |
| Resultados académicos | `/reportes/resultados` | `puede_ver_reportes` |
| Configuración | `/configuracion` | `puede_ver_configuracion` |
| Perfil | `/perfil` | sesión autenticada |
| Acceso | `/login` | público |

No se debe interpretar el Sidebar como control de seguridad único: el backend define permisos y alcance. Rutas desconocidas muestran `NotFoundPage`; rutas protegidas redirigen o muestran acceso denegado.

## Roles y capacidades

Roles conocidos por el código: `ADMINISTRADOR`, `ADMINISTRACION`, `DOCENTE`, `ESTUDIANTE` (`core/permissions.py`, `apps/usuarios/serializers.py`). `UserCapabilitiesService` (`apps/usuarios/services.py`) genera capacidades informativas. Administrador recibe todas; docente recibe notificaciones, postulaciones, documentos, seguimiento, dashboard y reportes; estudiante recibe notificaciones, lectura de postulaciones/documentos/seguimiento, carga documental y modalidades. Administración recibe las capacidades comunes de notificaciones, lectura de postulaciones/documentos y seguimiento, pero no las acciones atribuidas expresamente a estudiante o docente en ese servicio. Revisar políticas específicas de endpoint antes de documentar permisos de escritura.

`is_staff` de Django se reserva a administración del sitio; `is_staff_user` considera administrador de negocio o superusuario. La API aplica además permisos por objeto, propiedad o asignaciones en vistas particulares. El manual deberá describir solo acciones que se comprueben para el rol y escenario concreto.

## Formularios, validaciones y mensajes

- Login general y acceso estudiantil tienen flujos diferenciados (`src/pages/auth/LoginPage.jsx`, `apps/usuarios/views.py`, `apps/usuarios/student_auth.py`). JWT incluye renovación y vencimiento en `src/services/api.js` y `core/settings.py`.
- Alta/edición de postulación exige campos como código, estudiante, modalidad y periodo; la carga de estudiantes elegibles depende de modalidad/periodo (`src/pages/postulantes/PostulantesPage.jsx`). Hay errores por campo, errores de catálogos y estados de carga.
- Carga de documentos valida tipo/archivo y expone detalle/versiones (`src/components/documentos/UploadDialog.jsx`, `DocumentDetailDialog.jsx`, `apps/documentos/views.py`). Versionado, observaciones y confirmación de corrección tienen endpoints diferenciados.
- Programación y evaluación comprueban asignaciones, etapa, quórum y política configurada (`apps/postulantes/defensas_api.py`, `asignaciones.py`, `apps/modalidades/*_service.py`). El texto y condiciones dependen de modalidad y tipo de evento.
- Los formularios CRUD comparten `src/components/crud/CrudShell.jsx`; los mensajes exactos varían según vista, respuesta API y estado. No se inventarían mensajes como texto fijo del manual: capturar los mensajes vigentes en una sesión.

## Diferencias entre modalidades

El registro de policies está en `apps/modalidades/policies.py`; sus especializaciones incluyen `proyecto_grado.py`, `tesis_grado.py`, `trabajo_dirigido.py`, `examen_grado.py`, `excelencia_academica.py` y `diplomado.py`. Capacidades de eventos, evaluaciones, asignaciones, condiciones y cierre se anuncian por modalidad. No toda modalidad soporta el mismo conjunto.

El expediente adapta pestañas y componentes en `src/pages/postulantes/ExpedientePage.jsx`. Hay vistas específicas para Trabajo Dirigido, Examen, Excelencia y Diplomado; otras diferencias se muestran dentro de documentos, actores, defensas, evaluaciones y orientación. Tesis incluye componentes específicos como `AcademicConclusion.jsx` y `CorrectionConfirmations.jsx`. Debe conservarse la protección funcional de Proyecto y Tesis indicada en `AGENTS.md`.

## Gestión documental, defensas y reportes

- Documentos compartidos por postulación, con versiones, observaciones, estados y confirmación de corrección (`apps/documentos/models.py`, `services.py`, `views.py`). La elegibilidad de carga/revisión depende de rol, expediente, tipo documental, etapa y policy.
- Defensa/eventos, participantes, asignaciones y evaluaciones tienen módulos compartidos con validaciones propias de modalidad (`apps/postulantes/defensas_api.py`, `asignaciones.py`, `src/pages/postulantes/DefenseParticipants.jsx`, `DefenseEvaluation.jsx`). No asumir que una secuencia de defensa existe en todas las modalidades.
- Dashboard, reportes de postulaciones/resultados y exportación se registran en `apps/reportes/urls.py`, `views.py`, `services.py`; los permisos de consulta y exportación son distintos.

## Cobertura revisada y pendiente

La lista de módulos incluye académicos/catálogos, usuarios/auth, postulantes/workflow, documentos, modalidades, seguimiento, notificaciones, reportes y UI transversal. La matriz de procedimientos prioriza recorridos de estudiante y personal. Falta validar en navegador las etiquetas, estados vacíos, mensajes exactos, paginación real, permiso efectivo con usuarios de cada rol y accesibilidad/impresión.
