# UC-DOC-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DOC-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DOC-102 — Las operaciones de revisión verifican autoridad administrativa en el servicio; aprobación, rechazo y observación tienen controles distintos.

Endpoint/operación del objetivo: `POST /api/v1/documentos/documentos/{id}/aprobar|rechazar|observar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DOC-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Elegir la revisión y enviar comentario o motivo requerido → Resolver el documento visible y validar payload → Aplicar el método de revisión de DocumentoService → Validar versión, observaciones y estado permitidos → Devolver documento u observación generada.
- Comportamiento documentado: Estado o registro de observación actualizado y auditado por el servicio.
- Regla: RN-DOC-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.aprobar](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.aprobar_documento](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Observar devuelve una observación
- Regla: RN-DOC-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.aprobar](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.aprobar_documento](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-002-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: rechazar exige motivo.
- Regla: RN-DOC-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.aprobar](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.aprobar_documento](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-002-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Una aprobación no salta automáticamente todas las etapas académicas.
- Regla: RN-DOC-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.aprobar](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.aprobar_documento](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-002-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:DocumentoPostulacionViewSet.aprobar L195.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-DOC-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.aprobar](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-002-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.aprobar_documento L529.
- Comportamiento documentado: Rechazo declarado: ValidationError('La versión actual tiene observaciones pendientes.')
- Regla: RN-DOC-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.aprobar_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `version_actual.observaciones.filter(activo=True, corregida=False).exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
