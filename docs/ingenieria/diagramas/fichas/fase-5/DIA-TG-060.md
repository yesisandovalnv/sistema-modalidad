# DIA-TG-060 — Recorrido nominal y conclusión: Tesis de Grado

- Identificador: DIA-TG-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: tesis de grado, con decisiones, guardas y límites de evidencia.
- Alcance: Tesis de Grado; Tesis de Grado; usa infraestructura común con política específica.
- Proceso: PROC-TG-001.
- Casos relacionados: UC-TG-001 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-TG-001.
- Reglas observadas: RN-TG-101.
- Componentes: CMP-CORE-001, CMP-MOD-001.
- Entidades relacionadas: ENT-DOC-003, ENT-POS-004, ENT-POS-012, ENT-POS-014.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-TG-060.puml) · [SVG](../../renderizados/fase-5/DIA-TG-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Vista de coordinación académica entre solicitudes; el loop no existe como un único método automático. STAGE_DATA es declaración de código, no esquema instalado. Temática y perfil son actos distintos. Dictámenes Tutor/Tribunal se registran con administración y evidencias propias. Evaluación admite consenso o individual bajo su policy y escalas BRUTA_100/MODALIDAD_ESPECIFICA; no aplicar semántica legacy de Proyecto.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [TesisGradoPolicy (L345)](../../../../../apps/modalidades/tesis_grado.py).
- [TesisGradoPolicy.validar_conclusion_academica (L809)](../../../../../apps/modalidades/tesis_grado.py).
- [TesisGradoWorkflowOrchestrator.inicializar_proceso (L53)](../../../../../apps/postulantes/tesis_grado_workflow.py).
- [PostulacionViewSet.concluir_academicamente (L477)](../../../../../apps/postulantes/views.py).
- [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py).

## Particularidades académicas

Temática y perfil son actos distintos. Dictámenes Tutor/Tribunal se registran con administración y evidencias propias. Evaluación admite consenso o individual bajo su policy y escalas BRUTA_100/MODALIDAD_ESPECIFICA; no aplicar semántica legacy de Proyecto.

Orden nominal de STAGE_DATA, no lista de filas instaladas:

1. `INSCRIPCION`.
2. `TEMATICA_TESIS`.
3. `PERFIL_TESIS`.
4. `DOCUMENTO_FINAL`.
5. `REVISION_TUTOR`.
6. `REVISION_TRIBUNAL`.
7. `DEFENSA_PRIVADA`.
8. `DEFENSA_PUBLICA`.

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/modalidades/tests_tesis_e2e.py](../../../../../apps/modalidades/tests_tesis_e2e.py).
