# UC-DOC-006 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DOC-006.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DOC-106 — La carga histórica tiene contrato específico y no debe simular el workflow ordinario.

Endpoint/operación del objetivo: `GET /api/v1/postulaciones/{id}/documentos-historicos/tipos/; POST /api/v1/postulaciones/{id}/documentos-historicos/subir/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DOC-006-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Consultar tipos históricos admitidos → Enviar evidencia con administración → Validar tipo y registro histórico → Guardar evidencia con el servicio histórico y devolver versión.
- Comportamiento documentado: Evidencia asociada al registro histórico.
- Regla: RN-DOC-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.subir_documento_historico](../../../../apps/postulantes/views.py); [apps/documentos/services.py:DocumentoService.subir_documento_historico](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-006-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Una postulación ordinaria no se convierte en histórica para evitar requisitos de carga.
- Regla: RN-DOC-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.subir_documento_historico](../../../../apps/postulantes/views.py); [apps/documentos/services.py:DocumentoService.subir_documento_historico](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-006-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.subir_documento_historico L460.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'tipo_documento_id': 'El tipo de documento no existe o no está activo.'})
- Regla: RN-DOC-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.subir_documento_historico](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not tipo_documento [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-006-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.subir_documento_historico L471.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-DOC-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.subir_documento_historico](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-006-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento_historico L342.
- Comportamiento documentado: Rechazo declarado: ValidationError('La ruta histórica solo admite postulaciones HISTORICO.')
- Regla: RN-DOC-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento_historico](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `postulacion.tipo_registro != Postulacion.TipoRegistroChoices.HISTORICO [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-006-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento_historico L345.
- Comportamiento documentado: Rechazo declarado: NotFound('El tipo de documento no existe o no está activo.')
- Regla: RN-DOC-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento_historico](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `not isinstance(tipo_documento, TipoDocumento) or not tipo_documento.pk or (not tipo_documento.activo) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-006-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento_historico L350.
- Comportamiento documentado: Rechazo declarado: ValidationError('El tipo de documento no está permitido para la modalidad histórica.')
- Regla: RN-DOC-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento_historico](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `not permitido [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
