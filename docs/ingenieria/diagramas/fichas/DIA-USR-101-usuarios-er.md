# DIA-USR-101 — ER lógico: usuarios

## Objetivo y alcance

Mostrar entidades, relaciones y opcionalidad de usuarios

Tipo: ER lógico. Elementos: Role, CustomUser, AuditLog, StudentLoginThrottle.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [apps/usuarios/models.py](../../../../apps/usuarios/models.py)
- [core/models.py](../../../../core/models.py)
- [core/settings/base.py](../../../../core/settings/base.py)

## Lectura y limitaciones

Vista lógica, no esquema instalado. PK id derivada de DEFAULT_AUTO_FIELD; campos comunes heredados y atributos escalares no mostrados se detallan en el diccionario. Referencias externas abreviadas. Cardinalidades estructurales por null/OneToOne/unique; restricciones condicionales y clean no alteran esos máximos. No se afirma composición UML ni obligatoriedad de colección M2M por blank=False. Campos y M2M heredados de AbstractUser se separan en la vista de autenticación.

[Fuente PlantUML](../fuentes/DIA-USR-101-usuarios-er.puml). [SVG local](../renderizados/DIA-USR-101-usuarios-er.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
