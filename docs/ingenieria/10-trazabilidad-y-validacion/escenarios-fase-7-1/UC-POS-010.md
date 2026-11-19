# UC-POS-010 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-010.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-110 — Ambos querysets acotan por propiedad o asignación; el historial no admite CRUD de escritura.

Endpoint/operación del objetivo: `GET /api/v1/postulaciones/historial/; GET /api/v1/postulaciones/observaciones/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-010-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar historial u observaciones → Autenticar y filtrar recursos relacionados → Aplicar búsqueda y orden admitidos → Devolver registros visibles.
- Comportamiento documentado: Trazabilidad consultada.
- Regla: RN-POS-110; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:HistorialEstadoViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/views.py:ObservacionViewSet.get_queryset](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-010-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Una lista vacía no revela datos ajenos.
- Regla: RN-POS-110; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:HistorialEstadoViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/views.py:ObservacionViewSet.get_queryset](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-010-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Registrar observaciones es otro objetivo administrativo.
- Regla: RN-POS-110; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/views.py:HistorialEstadoViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/views.py:ObservacionViewSet.get_queryset](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
