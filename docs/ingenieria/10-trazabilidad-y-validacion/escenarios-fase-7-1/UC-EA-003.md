# UC-EA-003 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-EA-003.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-EA-103 — Conclusión valida política propia, etapa final y estado general; no reutiliza defensa numérica de Proyecto.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/excelencia/concluir/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-EA-003-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar conclusión → Exigir administración y resolver expediente → Validar evaluación y acta mediante política → Iniciar/aprobar conclusión y actualizar CONCLUIDA.
- Comportamiento documentado: Excelencia concluida si cumple su validación.
- Regla: RN-EA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.concluir](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-003-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Una evaluación favorable sola no sustituye el acta y demás requisitos.
- Regla: RN-EA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.concluir](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-003-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post L35.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede operar Excelencia Académica.')
- Regla: RN-EA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-003-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post L50.
- Comportamiento documentado: Rechazo declarado: ValidationError('La operación de Excelencia Académica no existe.')
- Regla: RN-EA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-003-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post L52.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-EA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-003-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Tras preparar evaluación favorable y aprobar REGISTRO_ACTA con documento, concluir fija CONCLUIDA.
- Comportamiento acotado comprobado por la aserción: Tras preparar evaluación favorable y aprobar REGISTRO_ACTA con documento, concluir fija CONCLUIDA.
- Regla: RN-EA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La aserción sigue a concluir y refresh_from_db. El assertRaises anterior pertenece a aprobar_etapa antes de adjuntar acta: no demuestra una excepción de concluir.
- Implementación: [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.concluir](../../../../apps/modalidades/excelencia_academica_service.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ExcelenciaAcademicaTest.test_conclusion_bloqueada_hasta_acta_aprobada L604](../../../../apps/modalidades/tests_excelencia_academica.py) | `self.assertEqual(self.post.estado_actual.codigo, 'CONCLUIDA')` (L615) | Tras preparar evaluación favorable y aprobar REGISTRO_ACTA con documento, concluir fija CONCLUIDA. |
