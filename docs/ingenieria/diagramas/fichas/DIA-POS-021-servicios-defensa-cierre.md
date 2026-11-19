# DIA-POS-021 — Clases: servicios-defensa-cierre

## Objetivo y alcance

Separar servicios, entrada API y políticas; solo operaciones verificadas

Tipo: Clases de diseño. Elementos: ProyectoGradoCierrePolicy, CierrePostulacionService, EventoDefensaService, EvaluacionDefensaService.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [apps/modalidades/policies.py](../../../../apps/modalidades/policies.py)
- [apps/postulantes/cierre.py](../../../../apps/postulantes/cierre.py)
- [apps/postulantes/defensas.py](../../../../apps/postulantes/defensas.py)

## Lectura y limitaciones

Operaciones seleccionadas de las declaradas en código; no representa toda la API pública ni secuencia de ejecución. Referencias externas abreviadas. Herencia explícita en AST; asociaciones por instanciación en atributos y dependencias por anotación de tipo. No se presume igualdad académica por herencia.

[Fuente PlantUML](../fuentes/DIA-POS-021-servicios-defensa-cierre.puml). [SVG local](../renderizados/DIA-POS-021-servicios-defensa-cierre.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
