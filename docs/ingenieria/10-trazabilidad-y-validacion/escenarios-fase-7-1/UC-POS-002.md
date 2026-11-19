# UC-POS-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-102 — El alcance común distingue administración, ESTUDIANTE propietario y DOCENTE asignado; otros roles obtienen conjunto vacío.

Endpoint/operación del objetivo: `GET /api/v1/postulaciones/; GET /api/v1/postulaciones/{id}/; GET /api/v1/postulaciones/{id}/flujo/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar lista, detalle o flujo → Autenticar y aplicar postulaciones_in_scope → Resolver la postulación visible y cargar sus relaciones → Serializar el recurso o el flujo ordenado.
- Comportamiento documentado: Información del expediente visible devuelta sin transición académica solicitada.
- Regla: RN-POS-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/permissions.py:postulaciones_in_scope](../../../../apps/postulantes/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: La lista puede estar vacía
- Regla: RN-POS-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/permissions.py:postulaciones_in_scope](../../../../apps/postulantes/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-002-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: un detalle fuera de alcance responde 404.
- Regla: RN-POS-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/permissions.py:postulaciones_in_scope](../../../../apps/postulantes/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-002-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: La participación histórica del docente no se filtra por activo aquí.
- Regla: RN-POS-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/permissions.py:postulaciones_in_scope](../../../../apps/postulantes/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
