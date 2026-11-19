# UC-EA-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-EA-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-EA-102 — El criterio queda sujeto a invariantes del modelo y al inicio del flujo específico.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/excelencia/configurar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-EA-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar criterio → Exigir administración y resolver Excelencia → Configurar expediente mediante el servicio → Devolver criterio registrado.
- Comportamiento documentado: Criterio configurado según el servicio.
- Regla: RN-EA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Un criterio no se puede cambiar libremente después del registro/inicio
- Regla: RN-EA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-002-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no se inventa conexión a kardex.
- Regla: RN-EA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-002-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post L35.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede operar Excelencia Académica.')
- Regla: RN-EA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-002-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post L50.
- Comportamiento documentado: Rechazo declarado: ValidationError('La operación de Excelencia Académica no existe.')
- Regla: RN-EA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-002-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post L52.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-EA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-002-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio L24.
- Comportamiento documentado: Rechazo declarado: ValidationError({'criterio': 'El criterio de Excelencia Académica no es válido.'})
- Regla: RN-EA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `criterio not in ExcelenciaExpediente.Criterio.values [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-002-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio L32.
- Comportamiento documentado: Rechazo declarado: ValidationError('El criterio debe seleccionarse antes de iniciar el flujo.')
- Regla: RN-EA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `started [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-002-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio L29.
- Comportamiento documentado: Rechazo declarado: ValidationError({'criterio': 'El criterio no puede cambiar después de ser seleccionado.'})
- Regla: RN-EA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.configurar_criterio](../../../../apps/modalidades/excelencia_academica_service.py).
- Contexto sintáctico de guardas: `existing [then]; existing.criterio != criterio [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
