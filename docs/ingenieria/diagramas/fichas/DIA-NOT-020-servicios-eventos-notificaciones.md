# DIA-NOT-020 — Clases: servicios-eventos-notificaciones

## Objetivo y alcance

Separar servicios, entrada API y políticas; solo operaciones verificadas

Tipo: Clases de diseño. Elementos: DomainEvent, DomainEventPublisher, NotificationRecipientResolver, NotificationService.

## Fuentes y versión

Versión: 689eeb56ac6f / desarrollo / directorio de trabajo. [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).

- [apps/notificaciones/events.py](../../../../apps/notificaciones/events.py)
- [apps/notificaciones/services.py](../../../../apps/notificaciones/services.py)

## Lectura y limitaciones

Operaciones seleccionadas de las declaradas en código; no representa toda la API pública ni secuencia de ejecución. Referencias externas abreviadas. Herencia explícita en AST; asociaciones por instanciación en atributos y dependencias por anotación de tipo. No se presume igualdad académica por herencia.

[Fuente PlantUML](../fuentes/DIA-NOT-020-servicios-eventos-notificaciones.puml). [SVG local](../renderizados/DIA-NOT-020-servicios-eventos-notificaciones.svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).
