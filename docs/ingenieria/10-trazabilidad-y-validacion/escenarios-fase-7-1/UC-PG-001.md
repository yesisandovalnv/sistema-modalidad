# UC-PG-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-PG-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-PG-101 — La publicación congela evidencia y composición; su vigencia se calcula respecto de la composición actual.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/memorandums-designacion/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-PG-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar seguimiento y archivo del memorando → Resolver postulación y exigir administración → Validar el contexto de publicación y composición en el servicio → Crear versión documental y publicación relacionada → Devolver la publicación serializada.
- Comportamiento documentado: Publicación vinculada a versión y asignaciones; lectura sujeta a vigencia.
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion](../../../../apps/postulantes/views.py); [apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: GET de la misma acción permite consulta relacionada
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion](../../../../apps/postulantes/views.py); [apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: administración ve historial y el resto solo publicaciones vigentes.
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion](../../../../apps/postulantes/views.py); [apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-001-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: No genera firmas ni un acto institucional externo.
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion](../../../../apps/postulantes/views.py); [apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-001-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion L322.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede publicar memorándums.')
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-001-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion L334.
- Comportamiento documentado: Rechazo declarado: _assignment_validation_error(exc)
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-001-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar L58.
- Comportamiento documentado: Rechazo declarado: ValidationError('Solo un usuario administrativo activo puede publicar el memorándum.')
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py).
- Contexto sintáctico de guardas: `not usuario or not usuario.is_active or (not is_staff_user(usuario)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-001-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar L61.
- Comportamiento documentado: Rechazo declarado: ValidationError('El memorándum de designación solo aplica a Proyecto de Grado.')
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py).
- Contexto sintáctico de guardas: `postulacion.modalidad.codigo != 'PROYECTO_GRADO' [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-001-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar L64.
- Comportamiento documentado: Rechazo declarado: ValidationError({'seguimiento_etapa': ['Debe corresponder al Perfil de Proyecto de la postulación.']})
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py).
- Contexto sintáctico de guardas: `seguimiento.postulacion_id != postulacion.pk or seguimiento.etapa.codigo != 'PERFIL_PROYECTO' [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-001-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar L68.
- Comportamiento documentado: Rechazo declarado: ValidationError({'archivo': ['El tipo documental del memorándum no está configurado.']})
- Regla: RN-PG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/memorandums.py:MemorandumDesignacionService.publicar](../../../../apps/postulantes/memorandums.py).
- Contexto sintáctico de guardas: `not tipo [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
