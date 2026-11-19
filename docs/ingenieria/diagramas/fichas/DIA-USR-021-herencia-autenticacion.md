# DIA-USR-021 — Herencia y persistencia de autenticación

## Objetivo y alcance

Explicar la herencia de usuario y M2M de autenticación sin confundir rol académico y permisos Django

Tipo: Clases / persistencia heredada. Elementos: CustomUser, dos bases, rol y referencias Django Group/Permission.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [apps/usuarios/migrations/0001_initial.py](../../../../apps/usuarios/migrations/0001_initial.py)
- [apps/usuarios/models.py](../../../../apps/usuarios/models.py)
- [core/models.py](../../../../core/models.py)
- [core/permissions.py](../../../../core/permissions.py)

## Lectura y limitaciones

AbstractUser se muestra como frontera del framework; la lista incluye campos que hereda de sus propias bases, no afirma que todos se declaren directamente allí. Evidencia de M2M y campos: migración versionada, sin ejecutarla. La instalación física y el esquema completo de Django/SimpleJWT quedan pendientes.

[Fuente PlantUML](../fuentes/DIA-USR-021-herencia-autenticacion.puml). [SVG local](../renderizados/DIA-USR-021-herencia-autenticacion.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
