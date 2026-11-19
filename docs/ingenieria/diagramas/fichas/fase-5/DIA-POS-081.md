# DIA-POS-081 — Ciclo técnico de un seguimiento

- Identificador: DIA-POS-081.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de ciclo técnico de un seguimiento, con decisiones, guardas y límites de evidencia.
- Alcance: Inicialización, inscripción y seguimiento; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-002.
- Casos relacionados: UC-POS-003, UC-POS-005, UC-POS-008, UC-POS-009, UC-POS-012, UC-POS-013, UC-POS-014, UC-POS-015 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-POS-003, UC-POS-013.
- Reglas observadas: RN-POS-103, RN-POS-105, RN-POS-108, RN-POS-109, RN-POS-112, RN-POS-113, RN-POS-114, RN-POS-115.
- Componentes: CMP-CORE-001, CMP-POS-001.
- Entidades relacionadas: ENT-ACA-004, ENT-DOC-004, ENT-POS-001, ENT-POS-002, ENT-POS-004, ENT-POS-005, ENT-POS-006, ENT-POS-007, ENT-POS-008, ENT-POS-015, ENT-POS-016.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-POS-081.puml) · [SVG](../../renderizados/fase-5/DIA-POS-081.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Un único objeto SeguimientoEtapa. Nuevo intento crea otro PENDIENTE y deja el anterior RECHAZADA; no se dibuja como vuelta del mismo objeto. La excepción de reapertura pertenece al cierre de Proyecto, no al motor genérico de todas las etapas.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [CierrePostulacionService.reabrir_cierre (L163)](../../../../../apps/postulantes/cierre.py).
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
- [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.concluir_postulacion (L367)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.crear_nuevo_intento (L213)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.inicializar_flujo (L22)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.iniciar_etapa (L58)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.observar_etapa (L87)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.omitir_etapa (L187)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.rechazar_etapa (L159)](../../../../../apps/postulantes/workflow.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | inicializar_flujo | Etapas activas y seguimiento no existente | get_or_create intento 1 | PENDIENTE | No ejecutar si falla la guarda; [WorkflowService.inicializar_flujo (L22)](../../../../../apps/postulantes/workflow.py) |
| T02 | PENDIENTE | iniciar_etapa | Sin otra EN_PROCESO; previas obligatorias aprobadas; policy de inicio | Guardar fecha_inicio y abierta_por | EN_PROCESO | No ejecutar si falla la guarda; [WorkflowService.iniciar_etapa (L58)](../../../../../apps/postulantes/workflow.py) |
| T03 | EN_PROCESO | observar_etapa | Observación no vacía; estado editable | Combinar observaciones | OBSERVADA | No ejecutar si falla la guarda; [WorkflowService.observar_etapa (L87)](../../../../../apps/postulantes/workflow.py) |
| T04 | EN_PROCESO | aprobar_etapa | Editable; aprobar además validar_aprobacion_etapa de policy | Guardar cierre y publicar evento; efectos específicos según acción | APROBADA | No ejecutar si falla la guarda; [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py) |
| T05 | EN_PROCESO | rechazar_etapa | Editable; aprobar además validar_aprobacion_etapa de policy | Guardar cierre y publicar evento; efectos específicos según acción | RECHAZADA | No ejecutar si falla la guarda; [WorkflowService.rechazar_etapa (L159)](../../../../../apps/postulantes/workflow.py) |
| T06 | OBSERVADA | aprobar_etapa | Editable; aprobar además validar_aprobacion_etapa de policy | Guardar cierre y publicar evento; efectos específicos según acción | APROBADA | No ejecutar si falla la guarda; [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py) |
| T07 | OBSERVADA | rechazar_etapa | Editable; aprobar además validar_aprobacion_etapa de policy | Guardar cierre y publicar evento; efectos específicos según acción | RECHAZADA | No ejecutar si falla la guarda; [WorkflowService.rechazar_etapa (L159)](../../../../../apps/postulantes/workflow.py) |
| T08 | PENDIENTE | omitir_etapa | Editable y etapa no obligatoria | Cerrar con OMITIDA | OMITIDA | No ejecutar si falla la guarda; [WorkflowService.omitir_etapa (L187)](../../../../../apps/postulantes/workflow.py) |
| T09 | EN_PROCESO | omitir_etapa | Editable y etapa no obligatoria | Cerrar con OMITIDA | OMITIDA | No ejecutar si falla la guarda; [WorkflowService.omitir_etapa (L187)](../../../../../apps/postulantes/workflow.py) |
| T10 | OBSERVADA | omitir_etapa | Editable y etapa no obligatoria | Cerrar con OMITIDA | OMITIDA | No ejecutar si falla la guarda; [WorkflowService.omitir_etapa (L187)](../../../../../apps/postulantes/workflow.py) |
| T11 | APROBADA | reabrir_cierre (solo Proyecto) | CIERRE_DOCUMENTAL aprobado; policy de cierre y motivo | Limpiar fecha_fin/cerrada_por; conservar intento | EN_PROCESO | No ejecutar si falla la guarda; [CierrePostulacionService.reabrir_cierre (L163)](../../../../../apps/postulantes/cierre.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests_cierre.py](../../../../../apps/postulantes/tests_cierre.py).
- [apps/postulantes/tests_decisiones_academicas.py](../../../../../apps/postulantes/tests_decisiones_academicas.py).
- [apps/postulantes/tests_dictamen_revision.py](../../../../../apps/postulantes/tests_dictamen_revision.py).
- [apps/postulantes/tests_revision_tribunal.py](../../../../../apps/postulantes/tests_revision_tribunal.py).
- [apps/postulantes/tests_workflow.py](../../../../../apps/postulantes/tests_workflow.py).
