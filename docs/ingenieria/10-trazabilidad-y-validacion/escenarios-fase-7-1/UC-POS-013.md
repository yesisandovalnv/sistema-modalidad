# UC-POS-013 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-013.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-113 — La elegibilidad de repetición e intentos corresponde a la política de la modalidad.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/etapas/{etapa_id}/nuevo-intento/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-013-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Seleccionar etapa activa → Exigir administración y resolver contexto → Validar repetición y límites → Crear y devolver nuevo seguimiento.
- Comportamiento documentado: Intento nuevo registrado si es admisible.
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Etapa inexistente o límite alcanzado rechaza
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no hay máximo universal.
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.nuevo_intento L519.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('No tiene permisos para crear un nuevo intento.')
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.nuevo_intento L524.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'etapa_id': 'La etapa no existe.'})
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not etapa [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.nuevo_intento L529.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento L221.
- Comportamiento documentado: Rechazo declarado: ValidationError('La etapa es obligatoria.')
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).
- Contexto sintáctico de guardas: `not isinstance(etapa, EtapaModalidad) or not etapa.pk [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento L228.
- Comportamiento documentado: Rechazo declarado: ValidationError('La etapa no pertenece a la modalidad de la postulacion.')
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).
- Contexto sintáctico de guardas: `postulacion.modalidad_id != etapa.modalidad_id [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento L230.
- Comportamiento documentado: Rechazo declarado: ValidationError('La etapa no permite crear un nuevo intento.')
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).
- Contexto sintáctico de guardas: `not etapa.permite_repeticion [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento L238.
- Comportamiento documentado: Rechazo declarado: ValidationError('La etapa aun no fue inicializada para esta postulacion.')
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).
- Contexto sintáctico de guardas: `not seguimientos [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-E008

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento L242.
- Comportamiento documentado: Rechazo declarado: ValidationError('Solo se puede crear un nuevo intento a partir de una etapa rechazada.')
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).
- Contexto sintáctico de guardas: `ultimo.estado != SeguimientoEtapa.EstadoChoices.RECHAZADA [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-013-E009

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento L256.
- Comportamiento documentado: Rechazo declarado: ValidationError('Ya existe un seguimiento para ese intento.')
- Regla: RN-POS-113; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/workflow.py:WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).
- Contexto sintáctico de guardas: `SeguimientoEtapa.objects.filter(postulacion=postulacion, etapa=etapa, numero_intento=nuevo_numero).exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
