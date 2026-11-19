# DIA-SYS-006 — Componentes generales

## Objetivo y alcance

Situar SPA, API, seguridad, dominio y almacenamiento

Tipo: Componentes. Elementos: SPA, seguridad, dominio, políticas, ORM y archivos.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [apps/documentos/services.py](../../../../apps/documentos/services.py)
- [apps/notificaciones/events.py](../../../../apps/notificaciones/events.py)
- [apps/postulantes/workflow.py](../../../../apps/postulantes/workflow.py)
- [apps/reportes/services.py](../../../../apps/reportes/services.py)
- [core/settings/base.py](../../../../core/settings/base.py)
- [core/urls.py](../../../../core/urls.py)
- [src/services/api.js](../../../../src/services/api.js)

## Lectura y limitaciones

Vista general selectiva: las dependencias no son una secuencia ni servicios desplegables separados. No hay broker externo demostrado. FileField representa rutas/archivos, no BLOB PostgreSQL.

[Fuente PlantUML](../fuentes/DIA-SYS-006-componentes-general.puml). [SVG local](../renderizados/DIA-SYS-006-componentes-general.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
