# UC-POS-004 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-004.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-104 — El servicio valida participación, contexto, posición e incompatibilidades específicas; ser candidato no acredita elegibilidad.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/asignaciones/asignar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-004-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar usuario, tipo de participación y contexto → Exigir autoridad administrativa y validar AsignarActorSerializer → Resolver postulación y usuario → Aplicar AsignacionService y reglas de modalidad → Devolver asignación registrada.
- Comportamiento documentado: Asignación registrada con efectos de auditoría/notificación definidos por el servicio.
- Regla: RN-POS-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.asignar](../../../../apps/postulantes/views.py); [apps/postulantes/asignaciones.py:AsignacionService.asignar_actor](../../../../apps/postulantes/asignaciones.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-004-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Cambiar una asignación existente se documenta mediante finalizar/reemplazar
- Regla: RN-POS-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.asignar](../../../../apps/postulantes/views.py); [apps/postulantes/asignaciones.py:AsignacionService.asignar_actor](../../../../apps/postulantes/asignaciones.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-004-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no se presume que todos los cargos sean admisibles en todas las modalidades.
- Regla: RN-POS-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.asignar](../../../../apps/postulantes/views.py); [apps/postulantes/asignaciones.py:AsignacionService.asignar_actor](../../../../apps/postulantes/asignaciones.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-004-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.asignar L661.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('No tiene permisos para asignar actores.')
- Regla: RN-POS-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.asignar](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-004-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.asignar L677.
- Comportamiento documentado: Rechazo declarado: _assignment_validation_error(exc)
- Regla: RN-POS-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.asignar](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-004-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: En el contexto de defensa pública de la fixture, la misma persona no puede recibir SECRETARIO tras PRESIDENTE.
- Comportamiento acotado comprobado por la aserción: En el contexto de defensa pública de la fixture, la misma persona no puede recibir SECRETARIO tras PRESIDENTE.
- Regla: RN-POS-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La llamada dentro de assertRaisesMessage asigna SECRETARIO al mismo docente previamente designado PRESIDENTE; se comprueba el mensaje de incompatibilidad.
- Implementación: [apps/postulantes/asignaciones.py:AsignacionService.asignar_actor](../../../../apps/postulantes/asignaciones.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [AsignacionServiceTest.test_rechaza_misma_persona_como_presidente_y_secretario_en_defensa_publica L314](../../../../apps/postulantes/tests_assignments.py) | `self.assertRaisesMessage(ValidationError, 'cargo incompatible')` (L317) | En el contexto de defensa pública de la fixture, la misma persona no puede recibir SECRETARIO tras PRESIDENTE. |
