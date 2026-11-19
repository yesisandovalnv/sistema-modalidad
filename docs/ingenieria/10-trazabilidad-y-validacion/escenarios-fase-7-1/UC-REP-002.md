# UC-REP-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-REP-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-REP-102 — CanViewInstitutionalReports permite administración o DOCENTE y el servicio aplica alcance de datos.

Endpoint/operación del objetivo: `GET /api/v1/reportes/dashboard/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-REP-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar filtros del dashboard → Exigir permiso institucional → Obtener indicadores sobre queryset permitido → Devolver agregados.
- Comportamiento documentado: Indicadores consultados sin modificar expedientes.
- Regla: RN-REP-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/reportes/views.py:DashboardView.get](../../../../apps/reportes/views.py); [apps/reportes/services.py:DashboardService.obtener_dashboard](../../../../apps/reportes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-REP-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Un conjunto sin datos conserva la respuesta del servicio, sin ampliar alcance por rol.
- Regla: RN-REP-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/reportes/views.py:DashboardView.get](../../../../apps/reportes/views.py); [apps/reportes/services.py:DashboardService.obtener_dashboard](../../../../apps/reportes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
