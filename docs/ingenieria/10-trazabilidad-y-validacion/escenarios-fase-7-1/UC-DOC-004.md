# UC-DOC-004 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DOC-004.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DOC-104 — La vista y el servicio exigen administración; ser propietario no autoriza esta escritura.

Endpoint/operación del objetivo: `POST /api/v1/documentos/observaciones/{id}/marcar-corregida/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DOC-004-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Seleccionar observación → Aplicar permiso administrativo y resolver objeto → Bloquear y marcar corrección con fecha → Recalcular pendientes de la versión actual y auditar.
- Comportamiento documentado: Corrección marcada y requiere_correccion recalculado.
- Regla: RN-DOC-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/documentos/views.py:ObservacionDocumentoViewSet.marcar_corregida](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-004-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Una observación ya corregida rechaza la operación
- Regla: RN-DOC-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:ObservacionDocumentoViewSet.marcar_corregida](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-004-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: corregir una versión histórica no inventa pendientes en la versión actual.
- Regla: RN-DOC-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:ObservacionDocumentoViewSet.marcar_corregida](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-004-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:ObservacionDocumentoViewSet.marcar_corregida L367.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-DOC-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/views.py:ObservacionDocumentoViewSet.marcar_corregida](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-004-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.marcar_observacion_corregida L722.
- Comportamiento documentado: Rechazo declarado: NotFound('La observación no existe.')
- Regla: RN-DOC-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `not isinstance(observacion, ObservacionDocumento) or not observacion.pk [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-004-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.marcar_observacion_corregida L725.
- Comportamiento documentado: Rechazo declarado: NotFound('La observación no está activa.')
- Regla: RN-DOC-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `not observacion.activo [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-004-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.marcar_observacion_corregida L727.
- Comportamiento documentado: Rechazo declarado: ValidationError('La observación ya está marcada como corregida.')
- Regla: RN-DOC-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `observacion.corregida [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-004-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.marcar_observacion_corregida L734.
- Comportamiento documentado: Rechazo declarado: NotFound('La observación no está activa.')
- Regla: RN-DOC-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `not observacion.activo [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-004-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.marcar_observacion_corregida L736.
- Comportamiento documentado: Rechazo declarado: ValidationError('La observación ya está marcada como corregida.')
- Regla: RN-DOC-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `observacion.corregida [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
