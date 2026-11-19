# UC-EA-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-EA-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-EA-101 — La evaluación usa el criterio previamente configurado y las reglas propias de Excelencia.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/excelencia/evaluar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-EA-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar resultado y promedio cuando corresponda → Exigir administración y resolver expediente → Validar criterio, composición y evidencias en el servicio → Registrar evaluación y devolver criterio, resultado y promedio.
- Comportamiento documentado: Evaluación de Excelencia registrada según criterio.
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Rendimiento y calidad no son el mismo cálculo
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no se presupone defensa numérica común.
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post L35.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede operar Excelencia Académica.')
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post L50.
- Comportamiento documentado: Rechazo declarado: ValidationError('La operación de Excelencia Académica no existe.')
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post L52.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion L73.
- Comportamiento documentado: Rechazo declarado: ValidationError('Debe seleccionar un criterio antes de evaluar.')
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `not expediente [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion L75.
- Comportamiento documentado: Rechazo declarado: ValidationError({'resultado': 'El resultado debe ser favorable o desfavorable.'})
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `resultado not in {ExcelenciaExpediente.Resultado.FAVORABLE, ExcelenciaExpediente.Resultado.DESFAVORABLE} [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion L80.
- Comportamiento documentado: Rechazo declarado: ValidationError('La evaluación debe registrarse con la etapa en proceso.')
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `stage.estado != SeguimientoEtapa.EstadoChoices.EN_PROCESO [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion L84.
- Comportamiento documentado: Rechazo declarado: ValidationError({'faltantes': missing})
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `missing [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E008

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion L88.
- Comportamiento documentado: Rechazo declarado: ValidationError({'promedio_general': 'El rendimiento académico requiere el promedio general documentado.'})
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `expediente.criterio == ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO [then]; promedio_general in (None, '') [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E009

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion L91.
- Comportamiento documentado: Rechazo declarado: ValidationError({'promedio_general': 'El promedio general debe ser igual o superior a 80.'})
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `expediente.criterio == ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO [then]; note < Decimal('80') [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-E010

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion L93.
- Comportamiento documentado: Rechazo declarado: ValidationError({'promedio_general': 'Reconocimiento a la calidad no admite nota numérica.'})
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `expediente.criterio == ExcelenciaExpediente.Criterio.RENDIMIENTO_ACADEMICO [else]; promedio_general not in (None, '') [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-001-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Con criterio RENDIMIENTO_ACADEMICO preparado, promedio 79.99 se rechaza con el mensaje de mínimo 80.
- Comportamiento acotado comprobado por la aserción: Con criterio RENDIMIENTO_ACADEMICO preparado, promedio 79.99 se rechaza con el mensaje de mínimo 80.
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La llamada protegida solicita FAVORABLE con 79.99; la prueba prepara el criterio de rendimiento. No corresponde al criterio de calidad.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ExcelenciaAcademicaTest.test_rendimiento_requiere_80_y_no_inventa_kardex L579](../../../../apps/modalidades/tests_excelencia_academica.py) | `self.assertRaisesMessage(ValidationError, 'igual o superior a 80')` (L581) | Con criterio RENDIMIENTO_ACADEMICO preparado, promedio 79.99 se rechaza con el mensaje de mínimo 80. |

## ESC-EA-001-V02

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Con criterio de rendimiento, promedio 80 se guarda como FAVORABLE.
- Comportamiento acotado comprobado por la aserción: Con criterio de rendimiento, promedio 80 se guarda como FAVORABLE.
- Regla: RN-EA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: result proviene de registrar_evaluacion con FAVORABLE y Decimal 80; ambas aserciones observan ese retorno, después del rechazo de 79.99.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.registrar_evaluacion](../../../../apps/modalidades/excelencia_academica_service.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ExcelenciaAcademicaTest.test_rendimiento_requiere_80_y_no_inventa_kardex L579](../../../../apps/modalidades/tests_excelencia_academica.py) | `self.assertEqual(result.promedio_general, Decimal('80.00'))` (L584) | Con criterio de rendimiento, promedio 80 se guarda como FAVORABLE. |
| [ExcelenciaAcademicaTest.test_rendimiento_requiere_80_y_no_inventa_kardex L579](../../../../apps/modalidades/tests_excelencia_academica.py) | `self.assertEqual(result.resultado, ExcelenciaExpediente.Resultado.FAVORABLE)` (L585) | Con criterio de rendimiento, promedio 80 se guarda como FAVORABLE. |
