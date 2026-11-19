# UC-DOC-005 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DOC-005.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DOC-105 — La confirmación exige coherencia de versiones, postulación, evento y asignación, más validación de política.

Endpoint/operación del objetivo: `POST /api/v1/documentos/confirmaciones-correccion/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DOC-005-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar versiones, contexto y asignación confirmante → Exigir administración y validar serializer → Construir confirmación con confirmado_por=request.user → Ejecutar full_clean, validación de política y auditoría.
- Comportamiento documentado: Confirmación técnica y auditoría guardadas.
- Regla: RN-DOC-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/documentos/views.py:ConfirmacionCorreccionDocumentoViewSet.create](../../../../apps/documentos/views.py); [apps/documentos/services.py:ConfirmacionCorreccionDocumentoService.registrar](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-005-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: PUT/PATCH/DELETE están heredados del ModelViewSet y no pasan por este método create
- Regla: RN-DOC-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:ConfirmacionCorreccionDocumentoViewSet.create](../../../../apps/documentos/views.py); [apps/documentos/services.py:ConfirmacionCorreccionDocumentoService.registrar](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-005-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: se registran como superficie pendiente de caracterización, no se ejecutan.
- Regla: RN-DOC-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/documentos/views.py:ConfirmacionCorreccionDocumentoViewSet.create](../../../../apps/documentos/views.py); [apps/documentos/services.py:ConfirmacionCorreccionDocumentoService.registrar](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-005-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:ConfirmacionCorreccionDocumentoViewSet.create L389.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)
- Regla: RN-DOC-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/views.py:ConfirmacionCorreccionDocumentoViewSet.create](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
