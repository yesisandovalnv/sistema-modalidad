# UC-EG-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-EG-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-EG-101 — El servicio valida área, intento, nota y modalidad de registro de Examen, sin convertir al evaluador atribuido en usuario autorizado.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/examen/areas/{area}/evaluar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-EG-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar nota, observaciones y datos de evaluación del área → Exigir administración y resolver postulación → Registrar evaluación mediante ExamenGradoService → Devolver área, intento, nota y resultado.
- Comportamiento documentado: Evaluación del área y efectos de etapa registrados.
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Evaluación individual y consenso siguen los parámetros y gates del servicio.
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: TypeError, ValueError y validaciones se convierten en error de entrada.
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post L35.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede registrar evaluaciones.')
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post L43.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L63.
- Comportamiento documentado: Rechazo declarado: ValidationError('El área no existe.')
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `area is None [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L65.
- Comportamiento documentado: Rechazo declarado: ValidationError('El área ya tiene un resultado definitivo.')
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `area.estado in {ExamenArea.Estado.APROBADA, ExamenArea.Estado.REPROBADA} [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L67.
- Comportamiento documentado: Rechazo declarado: ValidationError({'modalidad_registro': 'La modalidad de registro no es válida.'})
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `modalidad_registro not in {ExamenEvaluacion.ModalidadRegistro.INDIVIDUAL, ExamenEvaluacion.ModalidadRegistro.CONSENSO} [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L69.
- Comportamiento documentado: Rechazo declarado: ValidationError({'nota': 'La nota del área debe estar entre 0 y 100.'})
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `not 0 <= Decimal(str(nota)) <= 100 [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L71.
- Comportamiento documentado: Rechazo declarado: ValidationError('El nuevo examen debe realizarse dentro de los 15 días calendario.')
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `area.intento_actual == 2 and area.reintento_hasta and (timezone.now() > area.reintento_hasta) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E008

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L76.
- Comportamiento documentado: Rechazo declarado: ValidationError('El área debe estar en proceso para registrar su evaluación.')
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `stage.estado != SeguimientoEtapa.EstadoChoices.EN_PROCESO [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E009

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L80.
- Comportamiento documentado: Rechazo declarado: ValidationError(f'La composición del Examen no permite evaluar: {detail}')
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `not composition['evaluable'] [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E010

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L83.
- Comportamiento documentado: Rechazo declarado: ValidationError({'modalidad_registro': 'No se pueden mezclar evaluaciones individuales y por consenso en el mismo intento.'})
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `current_evaluations.exclude(modalidad_registro=modalidad_registro).exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E011

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L88.
- Comportamiento documentado: Rechazo declarado: ValidationError({'evaluador': 'La evaluación individual requiere un tribunal activo del mismo Examen.'})
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `modalidad_registro == ExamenEvaluacion.ModalidadRegistro.INDIVIDUAL [then]; evaluator is None [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E012

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L90.
- Comportamiento documentado: Rechazo declarado: ValidationError({'evaluador': 'El tribunal ya registró la evaluación de este intento.'})
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `modalidad_registro == ExamenEvaluacion.ModalidadRegistro.INDIVIDUAL [then]; ExamenEvaluacion.objects.filter(area=area, intento=area.intento_actual, evaluador_id=evaluator.usuario_id).exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-001-E013

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion L92.
- Comportamiento documentado: Rechazo declarado: ValidationError({'modalidad_registro': 'El área ya tiene una evaluación consensuada para este intento.'})
- Regla: RN-EG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_service.py:ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Contexto sintáctico de guardas: `modalidad_registro == ExamenEvaluacion.ModalidadRegistro.INDIVIDUAL [else]; ExamenEvaluacion.objects.filter(area=area, intento=area.intento_actual, modalidad_registro=ExamenEvaluacion.ModalidadRegistro.CONSENSO).exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
