# UC-POS-019 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-019.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-119 — Alta, retiro y reactivación validan estado y política; el retiro es lógico.

Endpoint/operación del objetivo: `POST /api/v1/eventos-defensa/{id}/participantes/agregar/; POST /api/v1/eventos-defensa/{id}/participantes/{participante_id}/remover/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-019-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar asignación/rol o participante a retirar → Exigir administración y resolver evento → Validar pertenencia y estado → Registrar alta, reactivación o retiro.
- Comportamiento documentado: Participantes actualizados sin borrar historial.
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.agregar](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Reactivar reutiliza el registro histórico
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.agregar](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: estados terminales rechazan cambios.
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.agregar](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.agregar_participante L60.
- Comportamiento documentado: Rechazo declarado: ValidationError('El evento ya no admite participantes.')
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `evento.estado in (evento.Estado.FINALIZADA, evento.Estado.CANCELADA) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.agregar_participante L62.
- Comportamiento documentado: Rechazo declarado: ValidationError('La asignación debe estar activa al agregarla.')
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `not asignacion.activo [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.agregar_participante L63.
- Comportamiento documentado: Rechazo declarado: ValidationError('El usuario asignado debe estar activo.')
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `not asignacion.usuario.is_active [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.agregar_participante L64.
- Comportamiento documentado: Rechazo declarado: ValidationError('La asignación no pertenece a la postulación.')
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `asignacion.postulacion_id != evento.postulacion_id [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.agregar_participante L65.
- Comportamiento documentado: Rechazo declarado: ValidationError('El rol no es compatible con la asignación.')
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `asignacion.tipo_participacion != rol_evento [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.agregar_participante L72.
- Comportamiento documentado: Rechazo declarado: ValidationError({'non_field_errors': ['La persona ya participa activamente en el evento mediante otra asignación.']})
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `ParticipanteEvento._base_manager.select_for_update().filter(evento=evento, asignacion__usuario_id=asignacion.usuario_id, activo=True).exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.agregar_participante L75.
- Comportamiento documentado: Rechazo declarado: ValidationError({'non_field_errors': ['La asignación ya participa activamente en el evento.']})
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `existente and existente.activo [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-E008

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.agregar_participante L85.
- Comportamiento documentado: Rechazo declarado: ValidationError({'non_field_errors': ['La asignación ya participa en el evento.']})
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `existente [else]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-019-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Agregar participante a un evento FINALIZADA o CANCELADA de la fixture se rechaza con mensaje de estado.
- Comportamiento acotado comprobado por la aserción: Agregar participante a un evento FINALIZADA o CANCELADA de la fixture se rechaza con mensaje de estado.
- Regla: RN-POS-119; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La aserción está en el bucle terminal de dos estados y contiene agregar_participante. Las aserciones sobre asistencia o remover no se atribuyen a agregar.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ServiciosDefensaTests.test_matriz_de_estados_para_participantes_y_asistencia L620](../../../../apps/postulantes/tests_defensas.py) | `self.assertRaisesMessage(ValidationError, 'El evento ya no admite participantes')` (L633) | Agregar participante a un evento FINALIZADA o CANCELADA de la fixture se rechaza con mensaje de estado. |
