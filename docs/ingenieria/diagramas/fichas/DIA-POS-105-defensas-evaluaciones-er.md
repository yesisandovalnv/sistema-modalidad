# DIA-POS-105 — ER lógico: defensas-evaluaciones

## Objetivo y alcance

Mostrar entidades, relaciones y opcionalidad de defensas-evaluaciones

Tipo: ER lógico. Elementos: EventoDefensa, ParticipanteEvento, EvaluacionDefensa.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [apps/postulantes/models.py](../../../../apps/postulantes/models.py)
- [core/models.py](../../../../core/models.py)
- [core/settings/base.py](../../../../core/settings/base.py)

## Lectura y limitaciones

Vista lógica, no esquema instalado. PK id derivada de DEFAULT_AUTO_FIELD; campos comunes heredados y atributos escalares no mostrados se detallan en el diccionario. Referencias externas abreviadas. Cardinalidades estructurales por null/OneToOne/unique; restricciones condicionales y clean no alteran esos máximos. No se afirma composición UML ni obligatoriedad de colección M2M por blank=False.

[Fuente PlantUML](../fuentes/DIA-POS-105-defensas-evaluaciones-er.puml). [SVG local](../renderizados/DIA-POS-105-defensas-evaluaciones-er.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
