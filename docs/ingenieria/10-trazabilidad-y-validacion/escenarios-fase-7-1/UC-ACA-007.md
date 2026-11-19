# UC-ACA-007 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-ACA-007.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-ACA-107 — La lectura de estos catálogos requiere autenticación; no concede permiso de escritura.

Endpoint/operación del objetivo: `GET /api/v1/academico/periodos/; GET /api/v1/academico/requisitos/; GET /api/v1/academico/modalidad-requisitos/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-ACA-007-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar catálogo → Aplicar IsAuthenticated e IsStaffOrReadOnly para lectura → Filtrar y ordenar por el contrato del recurso → Devolver lista o detalle visible.
- Comportamiento documentado: Catálogos consultados sin mutación.
- Regla: RN-ACA-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/academico/views.py:PeriodoViewSet](../../../../apps/academico/views.py); [core/permissions.py:IsStaffOrReadOnly](../../../../core/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-007-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Los filtros y campos dependen del catálogo
- Regla: RN-ACA-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:PeriodoViewSet](../../../../apps/academico/views.py); [core/permissions.py:IsStaffOrReadOnly](../../../../core/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-007-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: administración de cada recurso está separada.
- Regla: RN-ACA-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/academico/views.py:PeriodoViewSet](../../../../apps/academico/views.py); [core/permissions.py:IsStaffOrReadOnly](../../../../core/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
