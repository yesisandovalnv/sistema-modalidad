# DIA-POS-061 — Inscripción, requisitos y aprobación de etapa

- Identificador: DIA-POS-061.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de inscripción, requisitos y aprobación de etapa, con decisiones, guardas y límites de evidencia.
- Alcance: Inicialización, inscripción y seguimiento; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-002.
- Casos relacionados: UC-POS-003, UC-POS-005, UC-POS-008, UC-POS-009, UC-POS-012, UC-POS-013, UC-POS-014, UC-POS-015 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-POS-003, UC-POS-012.
- Reglas observadas: RN-POS-103, RN-POS-105, RN-POS-108, RN-POS-109, RN-POS-112, RN-POS-113, RN-POS-114, RN-POS-115.
- Componentes: CMP-CORE-001, CMP-POS-001.
- Entidades relacionadas: ENT-ACA-004, ENT-DOC-004, ENT-POS-001, ENT-POS-002, ENT-POS-004, ENT-POS-005, ENT-POS-006, ENT-POS-007, ENT-POS-008, ENT-POS-015, ENT-POS-016.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-POS-061.puml) · [SVG](../../renderizados/fase-5/DIA-POS-061.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Las acciones de un catálogo o ciclo son variantes por solicitud; no ejecución obligatoria de todo CRUD. Guardas académicas delegadas a la política citada.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [DecisionAcademicaEtapaService.registrar (L111)](../../../../../apps/postulantes/decisiones_academicas.py).
- [DictamenRevisionDocumentoService.registrar (L17)](../../../../../apps/postulantes/dictamenes_revision.py).
- [RevisionTribunalPreviaService (L16)](../../../../../apps/postulantes/revision_tribunal.py).
- [SeguimientoEtapaSerializer (L282)](../../../../../apps/postulantes/serializers.py).
- [PostulacionViewSet.concluir_academicamente (L477)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.inicializar_flujo (L490)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.nuevo_intento (L517)](../../../../../apps/postulantes/views.py).
- [SeguimientoEtapaViewSet.aprobar (L1001)](../../../../../apps/postulantes/views.py).
- [SeguimientoEtapaViewSet.dictamenes_revision (L825)](../../../../../apps/postulantes/views.py).
- [SeguimientoEtapaViewSet.get_queryset (L800)](../../../../../apps/postulantes/views.py).
- [SeguimientoEtapaViewSet.informes_revision_tribunal (L854)](../../../../../apps/postulantes/views.py).
- [SeguimientoEtapaViewSet.registrar_decision (L946)](../../../../../apps/postulantes/views.py).
- [WorkflowService._validar_etapas_anteriores_aprobadas (L342)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.concluir_postulacion (L367)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.crear_nuevo_intento (L213)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.inicializar_flujo (L22)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.iniciar_etapa (L58)](../../../../../apps/postulantes/workflow.py).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests_cierre.py](../../../../../apps/postulantes/tests_cierre.py).
- [apps/postulantes/tests_decisiones_academicas.py](../../../../../apps/postulantes/tests_decisiones_academicas.py).
- [apps/postulantes/tests_dictamen_revision.py](../../../../../apps/postulantes/tests_dictamen_revision.py).
- [apps/postulantes/tests_revision_tribunal.py](../../../../../apps/postulantes/tests_revision_tribunal.py).
- [apps/postulantes/tests_workflow.py](../../../../../apps/postulantes/tests_workflow.py).
