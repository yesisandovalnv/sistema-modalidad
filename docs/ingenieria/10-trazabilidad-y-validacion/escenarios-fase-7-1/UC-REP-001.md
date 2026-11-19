# UC-REP-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-REP-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-REP-101 — El permiso institucional es administración o DOCENTE; el alcance y la semántica se conservan por usuario y modalidad.

Endpoint/operación del objetivo: `GET /api/v1/reportes/resultados/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-REP-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar reporte con filtros → Comprobar CanViewInstitutionalReports → Validar filtros y construir queryset con alcance → Resolver resultados sin reinterpretar modalidades como una única nota → Devolver respuesta paginada.
- Comportamiento documentado: Resultados derivados consultados; no modifica evaluaciones.
- Regla: RN-REP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/reportes/views.py:ResultadosAcademicosReportView.get](../../../../apps/reportes/views.py); [apps/reportes/resultados.py:ResultadoAcademicoReportService](../../../../apps/reportes/resultados.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-REP-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Un resultado sin evidencia suficiente conserva su estado de disponibilidad.
- Regla: RN-REP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/reportes/views.py:ResultadosAcademicosReportView.get](../../../../apps/reportes/views.py); [apps/reportes/resultados.py:ResultadoAcademicoReportService](../../../../apps/reportes/resultados.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-REP-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: ESTUDIANTE no accede a este reporte aunque el servicio de scope contemple propiedad.
- Regla: RN-REP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/reportes/views.py:ResultadosAcademicosReportView.get](../../../../apps/reportes/views.py); [apps/reportes/resultados.py:ResultadoAcademicoReportService](../../../../apps/reportes/resultados.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
