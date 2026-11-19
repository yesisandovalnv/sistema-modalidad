# DIA-USR-020 — Clases: autenticacion-autorizacion

## Objetivo y alcance

Separar servicios, entrada API y políticas; solo operaciones verificadas

Tipo: Clases de diseño. Elementos: CustomTokenObtainPairView, CustomTokenRefreshView, StudentTokenObtainPairView, LogoutView, MeView, UserCapabilitiesService, IsActiveUser, IsStaff.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [apps/usuarios/services.py](../../../../apps/usuarios/services.py)
- [apps/usuarios/views.py](../../../../apps/usuarios/views.py)
- [core/permissions.py](../../../../core/permissions.py)

## Lectura y limitaciones

Operaciones seleccionadas de las declaradas en código; no representa toda la API pública ni secuencia de ejecución. Referencias externas abreviadas. Herencia explícita en AST; asociaciones por instanciación en atributos y dependencias por anotación de tipo. No se presume igualdad académica por herencia.

[Fuente PlantUML](../fuentes/DIA-USR-020-autenticacion-autorizacion.puml). [SVG local](../renderizados/DIA-USR-020-autenticacion-autorizacion.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
