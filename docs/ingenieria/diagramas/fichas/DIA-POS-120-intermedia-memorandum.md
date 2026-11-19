# DIA-POS-120 — ER lógico: intermedia de memorando

## Objetivo y alcance

Hacer visible la intermedia implícita de asignaciones sin inventar su nombre físico

Tipo: ER lógico derivado. Elementos: Dos entidades de referencia y una intermedia conceptual derivada.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [apps/postulantes/migrations/0019_publicacionmemorandumdesignacion.py](../../../../apps/postulantes/migrations/0019_publicacionmemorandumdesignacion.py)
- [apps/postulantes/models.py](../../../../apps/postulantes/models.py)

## Lectura y limitaciones

Intermedia inferida de la declaración M2M y la migración; no se cuenta como modelo propio adicional ni se declara tabla efectivamente instalada.

[Fuente PlantUML](../fuentes/DIA-POS-120-intermedia-memorandum.puml). [SVG local](../renderizados/DIA-POS-120-intermedia-memorandum.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
