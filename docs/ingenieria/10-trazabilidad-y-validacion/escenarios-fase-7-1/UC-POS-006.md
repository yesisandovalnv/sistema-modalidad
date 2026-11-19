# UC-POS-006 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-006.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-106 — La programación y cada cambio de ciclo usan validaciones del evento y de la modalidad.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/eventos-defensa/programar/; POST /api/v1/eventos-defensa/{id}/iniciar|finalizar|suspender|cancelar|reprogramar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-006-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar etapa, tipo y programación o seleccionar una acción de evento existente → Exigir administración y validar el payload de la acción → Aplicar EventoDefensaService con sus gates → Registrar el evento o el nuevo estado y sus efectos → Devolver representación del evento.
- Comportamiento documentado: Evento creado o ciclo actualizado; no se presume evaluación ni conclusión.
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/defensas_api.py:PostulacionEventosView.post](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Iniciar usa asistencias del payload
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:PostulacionEventosView.post](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: suspender/cancelar y reprogramar tienen motivo y precondiciones propios.
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:PostulacionEventosView.post](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Participantes y evaluación son casos separados.
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/defensas_api.py:PostulacionEventosView.post](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas_api.py:PostulacionEventosView.post L323.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Se requiere permiso administrativo.')
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas_api.py:PostulacionEventosView.post](../../../../apps/postulantes/defensas_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas_api.py:PostulacionEventosView.post L326.
- Comportamiento documentado: Rechazo declarado: ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas_api.py:PostulacionEventosView.post](../../../../apps/postulantes/defensas_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.programar_evento L30.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no soporta eventos académicos.')
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `not policy.permite_eventos() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.programar_evento L32.
- Comportamiento documentado: Rechazo declarado: ValidationError('El seguimiento no está habilitado para programar una defensa.')
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `seguimiento.postulacion_id != postulacion.pk or seguimiento.estado not in (SeguimientoEtapa.EstadoChoices.EN_PROCESO, SeguimientoEtapa.EstadoChoices.OBSERVADA) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.programar_evento L34.
- Comportamiento documentado: Rechazo declarado: ValidationError('Las etapas obligatorias anteriores deben estar aprobadas.')
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `anteriores.exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.programar_evento L44.
- Comportamiento documentado: Rechazo declarado: ValidationError({'non_field_errors': ['Ya existe una defensa activa del mismo tipo e intento.']})
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `duplicate [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.programar_evento L52.
- Comportamiento documentado: Rechazo declarado: ValidationError({'non_field_errors': ['Ya existe una defensa activa del mismo tipo e intento.']})
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-006-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Programar DEFENSA_PERFIL devuelve ese tipo y registra auditoría PROGRAM.
- Comportamiento acotado comprobado por la aserción: Programar DEFENSA_PERFIL devuelve ese tipo y registra auditoría PROGRAM.
- Regla: RN-POS-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: ev es el retorno de la programación con seguimiento de perfil y lugar Sala; las aserciones comprueban tipo y auditoría, no el ciclo completo de defensa.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ServiciosDefensaTests.test_programacion_y_auditoria L325](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(ev.tipo_evento, 'DEFENSA_PERFIL')` (L327) | Programar DEFENSA_PERFIL devuelve ese tipo y registra auditoría PROGRAM. |
| [ServiciosDefensaTests.test_programacion_y_auditoria L325](../../../../apps/postulantes/tests_defensas.py) | `self.assertTrue(AuditLog.objects.filter(accion='PROGRAM', modulo='DEFENSAS').exists())` (L327) | Programar DEFENSA_PERFIL devuelve ese tipo y registra auditoría PROGRAM. |
