# UC-DOC-008 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DOC-008.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DOC-108 — La escritura exige administración; DELETE de estados documentales está prohibido expresamente, a diferencia del tipo documental.

Endpoint/operación del objetivo: `POST /api/v1/documentos/tipos-documento/; PUT/PATCH/DELETE /api/v1/documentos/tipos-documento/{id}/; POST /api/v1/documentos/estados-documento/; PUT/PATCH /api/v1/documentos/estados-documento/{id}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DOC-008-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Seleccionar catálogo y variante permitida → Aplicar IsAuthenticated e IsStaffOrReadOnly → Validar serializer del recurso → Persistir por ModelViewSet cuando el método está permitido.
- Comportamiento documentado: Catálogo documental mantenido conforme al método admitido.
- Regla: RN-DOC-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/documentos/views.py:EstadoDocumentoViewSet](../../../../apps/documentos/views.py); [apps/documentos/views.py:TipoDocumentoViewSet](../../../../apps/documentos/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-008-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Eliminar un estado devuelve MethodNotAllowed
- Regla: RN-DOC-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:EstadoDocumentoViewSet](../../../../apps/documentos/views.py); [apps/documentos/views.py:TipoDocumentoViewSet](../../../../apps/documentos/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-008-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: las relaciones de un tipo pueden restringir su eliminación.
- Regla: RN-DOC-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:EstadoDocumentoViewSet](../../../../apps/documentos/views.py); [apps/documentos/views.py:TipoDocumentoViewSet](../../../../apps/documentos/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-008-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: No modifica por sí mismo la política académica.
- Regla: RN-DOC-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:EstadoDocumentoViewSet](../../../../apps/documentos/views.py); [apps/documentos/views.py:TipoDocumentoViewSet](../../../../apps/documentos/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-008-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:EstadoDocumentoViewSet L45.
- Comportamiento documentado: Rechazo declarado: MethodNotAllowed('DELETE', detail='Los estados técnicos deben desactivarse, no eliminarse.')
- Regla: RN-DOC-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/documentos/views.py:EstadoDocumentoViewSet](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
