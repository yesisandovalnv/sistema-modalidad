# DIA-POS-020 — Clases: servicios-expediente

## Objetivo y alcance

Separar servicios, entrada API y políticas; solo operaciones verificadas

Tipo: Clases de diseño. Elementos: PostulacionService, WorkflowService, AsignacionService, DecisionAcademicaEtapaService.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [apps/postulantes/asignaciones.py](../../../../apps/postulantes/asignaciones.py)
- [apps/postulantes/decisiones_academicas.py](../../../../apps/postulantes/decisiones_academicas.py)
- [apps/postulantes/services.py](../../../../apps/postulantes/services.py)
- [apps/postulantes/workflow.py](../../../../apps/postulantes/workflow.py)

## Lectura y limitaciones

Operaciones seleccionadas de las declaradas en código; no representa toda la API pública ni secuencia de ejecución. Referencias externas abreviadas. Herencia explícita en AST; asociaciones por instanciación en atributos y dependencias por anotación de tipo. No se presume igualdad académica por herencia.

[Fuente PlantUML](../fuentes/DIA-POS-020-servicios-expediente.puml). [SVG local](../renderizados/DIA-POS-020-servicios-expediente.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
