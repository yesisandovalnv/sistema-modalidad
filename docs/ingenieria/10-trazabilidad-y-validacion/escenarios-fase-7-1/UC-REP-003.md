# UC-REP-003 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-REP-003.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-REP-103 — Los filtros se validan y el docente conserva el alcance de asignaciones.

Endpoint/operación del objetivo: `GET /api/v1/reportes/postulaciones/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-REP-003-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar reporte y filtros → Comprobar permiso institucional → Construir queryset acotado y proyección → Devolver reporte paginado.
- Comportamiento documentado: Reporte consultado con su alcance.
- Regla: RN-REP-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/reportes/views.py:PostulacionesReportView.get](../../../../apps/reportes/views.py); [apps/reportes/services.py:ReportePostulacionesService](../../../../apps/reportes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-REP-003-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Consultar no habilita exportar
- Regla: RN-REP-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/reportes/views.py:PostulacionesReportView.get](../../../../apps/reportes/views.py); [apps/reportes/services.py:ReportePostulacionesService](../../../../apps/reportes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-REP-003-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: el estudiante no recibe este permiso por ser propietario.
- Regla: RN-REP-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/reportes/views.py:PostulacionesReportView.get](../../../../apps/reportes/views.py); [apps/reportes/services.py:ReportePostulacionesService](../../../../apps/reportes/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
