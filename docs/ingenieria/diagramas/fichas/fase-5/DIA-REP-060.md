# DIA-REP-060 — Consulta y exportación de reportes

- Identificador: DIA-REP-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de consulta y exportación de reportes, con decisiones, guardas y límites de evidencia.
- Alcance: Reportes y exportación; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-REP-001.
- Casos relacionados: UC-REP-001, UC-REP-002, UC-REP-003, UC-REP-004 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-REP-001, UC-REP-003, UC-REP-004.
- Reglas observadas: RN-REP-101, RN-REP-102, RN-REP-103, RN-REP-104.
- Componentes: CMP-CORE-001, CMP-REP-001.
- Entidades relacionadas: ENT-ACA-001, ENT-ACA-002, ENT-MOD-002, ENT-MOD-003, ENT-MOD-004, ENT-POS-004, ENT-POS-014.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-REP-060.puml) · [SVG](../../renderizados/fase-5/DIA-REP-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Las acciones de un catálogo o ciclo son variantes por solicitud; no ejecución obligatoria de todo CRUD. Guardas académicas delegadas a la política citada.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [CanExportReports.has_permission (L14)](../../../../../apps/reportes/permissions.py).
- [ResultadoAcademicoReportService (L95)](../../../../../apps/reportes/resultados.py).
- [DashboardService.obtener_dashboard (L162)](../../../../../apps/reportes/services.py).
- [ReportePostulacionesService (L92)](../../../../../apps/reportes/services.py).
- [DashboardView.get (L35)](../../../../../apps/reportes/views.py).
- [ExportView.get (L760)](../../../../../apps/reportes/views.py).
- [PostulacionesReportView.get (L42)](../../../../../apps/reportes/views.py).
- [ResultadosAcademicosReportView.get (L57)](../../../../../apps/reportes/views.py).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/reportes/tests.py](../../../../../apps/reportes/tests.py).
- [apps/reportes/tests_dashboard.py](../../../../../apps/reportes/tests_dashboard.py).
- [apps/reportes/tests_resultados_api.py](../../../../../apps/reportes/tests_resultados_api.py).
- [apps/reportes/tests_resultados_export.py](../../../../../apps/reportes/tests_resultados_export.py).
