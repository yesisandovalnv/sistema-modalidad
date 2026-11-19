# UC-POS-025 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-025.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-125 — Observación de postulación y observación sobre versión documental son registros distintos.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/observaciones/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-025-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar contexto y comentario → Aplicar IsStaffOrReadOnly y serializer → Registrar por la vista y servicio → Devolver observación creada.
- Comportamiento documentado: Comentario asociado al expediente.
- Regla: RN-POS-125; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:ObservacionViewSet.create](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-025-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Las demás operaciones CRUD del ViewSet mantienen permisos y serializer
- Regla: RN-POS-125; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:ObservacionViewSet.create](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-025-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no son aprobaciones académicas.
- Regla: RN-POS-125; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:ObservacionViewSet.create](../../../../apps/postulantes/views.py); [apps/postulantes/services.py:PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-025-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:ObservacionViewSet.create L757.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-POS-125; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:ObservacionViewSet.create](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-025-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.agregar_observacion L334.
- Comportamiento documentado: Rechazo declarado: ValueError('Se requieren datos para agregar una observación.')
- Regla: RN-POS-125; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not args [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-025-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.agregar_observacion L342.
- Comportamiento documentado: Rechazo declarado: ValidationError('La postulación es obligatoria.')
- Regla: RN-POS-125; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not isinstance(postulacion, Postulacion) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-025-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.agregar_observacion L344.
- Comportamiento documentado: Rechazo declarado: ValidationError('El usuario que registra la observación es obligatorio.')
- Regla: RN-POS-125; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not isinstance(usuario, CustomUser) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-025-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/services.py:PostulacionService.agregar_observacion L346.
- Comportamiento documentado: Rechazo declarado: ValidationError('El comentario es obligatorio.')
- Regla: RN-POS-125; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/services.py:PostulacionService.agregar_observacion](../../../../apps/postulantes/services.py).
- Contexto sintáctico de guardas: `not comentario or not str(comentario).strip() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
