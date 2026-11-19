# UC-POS-021 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-021.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-121 — Administración registra por API; evaluador atribuido, escala, consenso y semántica dependen de modalidad/tipo.

Endpoint/operación del objetivo: `POST /api/v1/eventos-defensa/{id}/evaluaciones/{tipo}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-021-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar resultado o nota y datos de evaluación → Exigir administración y validar EvaluarPayload → Seleccionar registro temática/perfil/privada/pública → Aplicar servicio y política y devolver evaluación.
- Comportamiento documentado: Evaluación guardada; consolidación separada.
- Regla: RN-POS-121; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.evaluar](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-021-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Campos nota_privada/nota_publica y semantica_nota conservan su contrato
- Regla: RN-POS-121; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.evaluar](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-021-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no hay escala universal.
- Regla: RN-POS-121; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.evaluar](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-021-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService._registrar L206.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no soporta este tipo de evaluación.')
- Regla: RN-POS-121; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `tipo not in policy.get_tipos_evaluacion() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-021-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService._registrar L207.
- Comportamiento documentado: Rechazo declarado: ValidationError('El evento no puede evaluarse.')
- Regla: RN-POS-121; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `evento.estado not in (EventoDefensa.Estado.EN_CURSO, EventoDefensa.Estado.FINALIZADA) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-021-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService._registrar L208.
- Comportamiento documentado: Rechazo declarado: ValidationError('No se puede registrar la evaluación sin quórum técnico válido.')
- Regla: RN-POS-121; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `not EventoDefensaService.validar_quorum(evento)['valido'] [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-021-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService._registrar L212.
- Comportamiento documentado: Rechazo declarado: ValidationError('El evento ya tiene una evaluación registrada de este tipo.')
- Regla: RN-POS-121; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `existentes.exists() and (not (modalidad_registro == EvaluacionDefensa.ModalidadRegistro.INDIVIDUAL and (not existentes.exclude(modalidad_registro=EvaluacionDefensa.ModalidadRegistro.INDIVIDUAL).exists()))) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-021-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService._registrar L215.
- Comportamiento documentado: Rechazo declarado: ValidationError('La semántica de entrada no está habilitada para esta evaluación.')
- Regla: RN-POS-121; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `not policy.evaluacion_policy.admite_semantica_entrada(evento=evento, tipo=tipo, semantica=semantica_nota) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-021-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService._registrar L217.
- Comportamiento documentado: Rechazo declarado: ValidationError('No se pueden mezclar escalas en las evaluaciones del mismo evento.')
- Regla: RN-POS-121; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService._registrar](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `existentes.exclude(semantica_nota=semantica_nota).exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
