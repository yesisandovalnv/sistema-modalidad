# UC-POS-024 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-024.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-124 — PATCH con estado_actual llama cambiar_estado; no es el mismo recorrido que concluir_academicamente.

Endpoint/operación del objetivo: `PATCH /api/v1/postulaciones/{id}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-024-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar estado_actual y comentario → Exigir administración y resolver postulación → Resolver estado y rechazar cambio idéntico → Guardar estado, historial y auditoría.
- Comportamiento documentado: Estado general cambiado si el servicio lo acepta.
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.partial_update](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-024-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Sin estado_actual usa actualización ordinaria
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.partial_update](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-024-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no se atribuyen gates de WorkflowService a esta rama.
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.partial_update](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-024-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.partial_update L270.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'estado_actual': 'El estado no existe.'})
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.partial_update](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `'estado_actual' in request.data [then]; not nuevo_estado [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-024-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.partial_update L282.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.partial_update](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `'estado_actual' in request.data [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-024-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.cambiar_estado L248.
- Comportamiento documentado: Rechazo declarado: ValueError('Se requieren datos para cambiar el estado de la postulación.')
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not args [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-024-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.cambiar_estado L257.
- Comportamiento documentado: Rechazo declarado: ValidationError('La postulación es obligatoria.')
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not isinstance(postulacion, Postulacion) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-024-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.cambiar_estado L259.
- Comportamiento documentado: Rechazo declarado: ValidationError('El estado nuevo es obligatorio.')
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not isinstance(nuevo_estado, EstadoPostulacion) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-024-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.cambiar_estado L261.
- Comportamiento documentado: Rechazo declarado: ValidationError('El usuario responsable del cambio es obligatorio.')
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not isinstance(usuario, CustomUser) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-024-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.cambiar_estado L266.
- Comportamiento documentado: Rechazo declarado: ValidationError('El estado nuevo debe ser diferente al estado actual.')
- Regla: RN-POS-124; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `estado_actual == nuevo_estado [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
