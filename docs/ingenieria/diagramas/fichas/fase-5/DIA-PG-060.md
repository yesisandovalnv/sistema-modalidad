# DIA-PG-060 — Recorrido nominal y conclusión: Proyecto de Grado

- Identificador: DIA-PG-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: proyecto de grado, con decisiones, guardas y límites de evidencia.
- Alcance: Proyecto de Grado; Proyecto de Grado; usa infraestructura común con política específica.
- Proceso: PROC-PG-001.
- Casos relacionados: UC-PG-001, UC-PG-002 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-PG-002.
- Reglas observadas: RN-PG-101, RN-PG-102.
- Componentes: CMP-CORE-001, CMP-MOD-001.
- Entidades relacionadas: ENT-DOC-004, ENT-POS-004, ENT-POS-005, ENT-POS-006, ENT-POS-009, ENT-POS-010, ENT-POS-011.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-PG-060.puml) · [SVG](../../renderizados/fase-5/DIA-PG-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Vista de coordinación académica entre solicitudes; el loop no existe como un único método automático. STAGE_DATA es declaración de código, no esquema instalado. PG_LEGACY y PG_HITOS_V1 se conservan. PROPUESTA_APROBADA es hito/decisión del régimen correspondiente, no nueva etapa. Memorandos congelan composición y evidencia; su vigencia se calcula. Evaluación admite BRUTA_100 y lectura LEGACY_PONDERADA; no volver a ponderar aportes históricos.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [ProyectoGradoPolicy (L445)](../../../../../apps/modalidades/proyecto_grado.py).
- [CierrePostulacionService (L103)](../../../../../apps/postulantes/cierre.py).
- [CierrePostulacionService.concluir_postulacion (L152)](../../../../../apps/postulantes/cierre.py).
- [CierreAccionView.post (L40)](../../../../../apps/postulantes/cierre_api.py).
- [MemorandumDesignacionService.publicar (L56)](../../../../../apps/postulantes/memorandums.py).
- [ProyectoGradoWorkflowOrchestrator.autoabrir_siguiente (L75)](../../../../../apps/postulantes/proyecto_grado_workflow.py).
- [PostulacionViewSet.memorandums_designacion (L304)](../../../../../apps/postulantes/views.py).
- [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py).

## Particularidades académicas

PG_LEGACY y PG_HITOS_V1 se conservan. PROPUESTA_APROBADA es hito/decisión del régimen correspondiente, no nueva etapa. Memorandos congelan composición y evidencia; su vigencia se calcula. Evaluación admite BRUTA_100 y lectura LEGACY_PONDERADA; no volver a ponderar aportes históricos.

Orden nominal de STAGE_DATA, no lista de filas instaladas:

1. `INSCRIPCION`.
2. `PERFIL_PROYECTO`.
3. `DOCUMENTO_FINAL`.
4. `REVISION_TRIBUNAL_PREVIA`.
5. `DEFENSA_PRIVADA`.
6. `DEFENSA_PUBLICA`.
7. `REVISION_FINAL_POST_PUBLICA`.
8. `CIERRE_DOCUMENTAL`.

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests_cierre.py](../../../../../apps/postulantes/tests_cierre.py).
- [apps/postulantes/tests_memorandums.py](../../../../../apps/postulantes/tests_memorandums.py).
