# UC-POS-005 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-005.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-105 — La política debe declarar la decisión; participantes y composición se validan antes del registro.

Endpoint/operación del objetivo: `POST /api/v1/seguimientos-etapa/{id}/registrar-decision/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-005-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar código, resultado y participantes de la decisión → Exigir administración y validar el serializer → Resolver definición y validar participantes mediante el servicio → Registrar o reemplazar la decisión con trazabilidad → Devolver 201 para alta o 200 para reemplazo.
- Comportamiento documentado: Decisión y participaciones persistidas conforme al servicio.
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision](../../../../apps/postulantes/views.py); [apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: reemplaza_decision activa el recorrido de reemplazo validado.
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision](../../../../apps/postulantes/views.py); [apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Los miembros académicos quedan registrados, sin acceso directo implícito al endpoint.
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision](../../../../apps/postulantes/views.py); [apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision L949.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede registrar decisiones académicas.')
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision L961.
- Comportamiento documentado: Rechazo declarado: _assignment_validation_error(exc)
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar L123.
- Comportamiento documentado: Rechazo declarado: ValidationError('Se requiere un usuario administrativo activo para registrar decisiones académicas.')
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).
- Contexto sintáctico de guardas: `not registrado_por or not registrado_por.is_active or (not is_staff_user(registrado_por)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar L137.
- Comportamiento documentado: Rechazo declarado: ValidationError({'resultado': ['El resultado no está permitido por la policy.']})
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).
- Contexto sintáctico de guardas: `resultado not in definition.resultados [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar L145.
- Comportamiento documentado: Rechazo declarado: ValidationError({'codigo': ['Ya existe una decisión activa para este código en el seguimiento.']})
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).
- Contexto sintáctico de guardas: `active and (not reemplaza_decision) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar L130.
- Comportamiento documentado: Rechazo declarado: ValidationError({'seguimiento_etapa': ['El seguimiento no está activo.']})
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar L148.
- Comportamiento documentado: Rechazo declarado: ValidationError({'reemplaza_decision': ['Solo se puede reemplazar la decisión activa correspondiente a este código y seguimiento.']})
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).
- Contexto sintáctico de guardas: `reemplaza_decision [then]; not active or active.pk != reemplaza_decision.pk [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-005-E008

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar L169.
- Comportamiento documentado: Rechazo declarado: ValidationError({'codigo': ['No se pudo crear la decisión activa; verifica si ya existe otra versión activa.']})
- Regla: RN-POS-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/decisiones_academicas.py:DecisionAcademicaEtapaService.registrar](../../../../apps/postulantes/decisiones_academicas.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
