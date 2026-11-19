# UC-POS-008 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-008.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-108 — La política valida la conclusión antes de cambiar el estado general; una postulación ya concluida retorna de forma idempotente.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/concluir-academicamente/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-008-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar solicitud de conclusión → Exigir administración y resolver postulación → Bloquear postulación y validar_conclusion_academica de su política → Actualizar estado general e historial cuando corresponde → Devolver postulación serializada.
- Comportamiento documentado: Estado general CONCLUIDA si la política lo autoriza; no elimina registros.
- Regla: RN-POS-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.concluir_postulacion](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-008-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Si ya está CONCLUIDA se conserva el estado sin duplicar la transición.
- Regla: RN-POS-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.concluir_postulacion](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-008-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Los endpoints de conclusión por modalidad se documentan con sus etapas propias.
- Regla: RN-POS-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.concluir_postulacion](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-008-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente L479.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede concluir académicamente una postulación.')
- Regla: RN-POS-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-008-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente L485.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-POS-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
