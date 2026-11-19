# Catálogo de módulos y componentes

Estado: IMPLEMENTADO para las superficies citadas. La clasificación como monolito modular Django con SPA separada es INFERENCIA arquitectónica.

| ID | Componente | Responsabilidad | Evidencia |
| --- | --- | --- | --- |
| CMP-CORE-001 | Infraestructura común | Configuración, permisos, modelo base, managers y errores | [Permisos](../../../core/permissions.py), [base](../../../core/models.py) |
| CMP-USR-001 | Usuarios | Identidad, roles, autenticación, capacidades y auditoría | [Vistas](../../../apps/usuarios/views.py), [servicios](../../../apps/usuarios/services.py) |
| CMP-ACA-001 | Académico | Periodos, modalidades, etapas, requisitos y documentos oficiales | [Modelos](../../../apps/academico/models.py), [vistas](../../../apps/academico/views.py) |
| CMP-POS-001 | Postulaciones | Expediente, etapas, asignaciones, decisiones, defensas y cierre | [Vistas](../../../apps/postulantes/views.py), [workflow](../../../apps/postulantes/workflow.py) |
| CMP-DOC-001 | Documentos | Carga, versiones, revisión y correcciones | [Modelos](../../../apps/documentos/models.py), [servicios](../../../apps/documentos/services.py) |
| CMP-MOD-001 | Modalidades | Registro explícito y especialización de seis modalidades | [Políticas](../../../apps/modalidades/policies.py), [registro](../../../apps/modalidades/apps.py) |
| CMP-NOT-001 | Notificaciones | Eventos postcommit, destinatarios y lectura | [Eventos](../../../apps/notificaciones/events.py), [servicios](../../../apps/notificaciones/services.py) |
| CMP-REP-001 | Reportes | Dashboard, resultados y exportaciones | [Servicios](../../../apps/reportes/services.py), [vistas](../../../apps/reportes/views.py) |
| CMP-SEG-001 | Seguimiento residual | Estructura inicial; motor operativo en postulantes | [Vista](../../../apps/seguimiento/views.py), [modelos](../../../apps/seguimiento/models.py) |
| CMP-WEB-001 | SPA React | Navegación, páginas, proveedores y cliente HTTP | [Rutas](../../../src/routes/AppRoutes.jsx), [HTTP](../../../src/services/api.js) |

## Dependencias y particularidades

El frontend consume la API Django. Postulantes coordina usuarios, académico, documentos, políticas y notificaciones. Reportes deriva datos según alcance. Los eventos se despachan dentro del proceso después del commit; no representan un broker externo.

Modalidad es una entidad de académico; modalidades contiene comportamiento y entidades propias. El seguimiento funcional reside en WorkflowService. Trabajo Dirigido importa clases de eventos, evaluación legacy y revisión previa de Proyecto: mostrar la dependencia sin generalizar sus reglas.

## Tecnologías y configuración

Fuentes: [requirements.txt](../../../requirements.txt), [package.json](../../../package.json), [base](../../../core/settings/base.py), [selección de entorno](../../../core/settings/__init__.py).

Backend Python/Django/DRF, JWT y PostgreSQL. Frontend React, Router, Axios, Vite y Tailwind. OpenAPI mediante drf-spectacular; pruebas Django y Vitest/Testing Library; PDF.js y openpyxl. Las versiones declaradas no demuestran versiones instaladas.

Conviven core/settings.py y el paquete core/settings/. La selección por entornos está en el paquete; no mezclar sus valores con los del archivo alternativo.

## Vínculo funcional de fase 4

El [catálogo funcional confirmado](../03-casos-de-uso/catalogo-funcionalidades.md) conserva las áreas de este inventario. Las [17 vistas de interacción](../diagramas/registro-fase-4.md) separan usuarios, académico, postulaciones, seguimiento, asignaciones, defensas, complementarios, documentos, notificaciones, reportes y seis modalidades. Las asociaciones de actores están sometidas a la [matriz backend](../02-actores-permisos/matriz-fase-4.md); un componente interno no se convierte automáticamente en actor externo.
