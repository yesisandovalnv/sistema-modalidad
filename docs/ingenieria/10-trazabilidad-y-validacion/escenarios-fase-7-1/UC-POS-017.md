# UC-POS-017 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-017.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-117 — Finalización y reemplazo validan contexto y conservan historial de asignaciones.

Endpoint/operación del objetivo: `POST /api/v1/asignaciones/{id}/finalizar|reemplazar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-017-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar acción y payload → Exigir administración → Aplicar serializer y servicio de asignación → Devolver asignación según acción.
- Comportamiento documentado: Asignación finalizada o reemplazada.
- Regla: RN-POS-117; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:AsignacionPostulacionViewSet.finalizar](../../../../apps/postulantes/views.py); [apps/postulantes/asignaciones.py:AsignacionService.finalizar_asignacion](../../../../apps/postulantes/asignaciones.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-017-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Reemplazar vuelve a validar al usuario nuevo y no borra el historial.
- Regla: RN-POS-117; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:AsignacionPostulacionViewSet.finalizar](../../../../apps/postulantes/views.py); [apps/postulantes/asignaciones.py:AsignacionService.finalizar_asignacion](../../../../apps/postulantes/asignaciones.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-017-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:AsignacionPostulacionViewSet.finalizar L1132.
- Comportamiento documentado: Rechazo declarado: _assignment_validation_error(exc)
- Regla: RN-POS-117; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:AsignacionPostulacionViewSet.finalizar](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
