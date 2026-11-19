# DIA-POS-066 — Evaluación, consolidación y resultado

- Identificador: DIA-POS-066.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de evaluación, consolidación y resultado, con decisiones, guardas y límites de evidencia.
- Alcance: Evaluación y consolidación; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-005.
- Casos relacionados: UC-POS-007, UC-POS-021, UC-POS-022 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-POS-021, UC-POS-007.
- Reglas observadas: RN-POS-107, RN-POS-121, RN-POS-122.
- Componentes: CMP-CORE-001, CMP-POS-001.
- Entidades relacionadas: ENT-POS-004, ENT-POS-005, ENT-POS-012, ENT-POS-013, ENT-POS-014.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-POS-066.puml) · [SVG](../../renderizados/fase-5/DIA-POS-066.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

La consulta/recálculo de resultado no formaliza conclusión. EvaluacionDefensa no tiene campo de ciclo de estados; resultado y consolidación no son estados universales de evaluación.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [EvaluacionDefensaService._registrar (L202)](../../../../../apps/postulantes/defensas.py).
- [EvaluacionDefensaService.calcular_resultado_final (L263)](../../../../../apps/postulantes/defensas.py).
- [EvaluacionDefensaService.consolidar_evaluacion_evento (L227)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaViewSet.consolidar (L296)](../../../../../apps/postulantes/defensas_api.py).
- [EventoDefensaViewSet.evaluar (L285)](../../../../../apps/postulantes/defensas_api.py).
- [ResultadoFinalView (L329)](../../../../../apps/postulantes/defensas_api.py).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests_defensas.py](../../../../../apps/postulantes/tests_defensas.py).
