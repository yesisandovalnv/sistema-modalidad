# DIA-SYS-005 — Estado general de postulación: rutas comprobadas

- Identificador: DIA-SYS-005.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de estado general de postulación: rutas comprobadas, con decisiones, guardas y límites de evidencia.
- Alcance: Registro, consulta y estado general; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-001.
- Casos relacionados: UC-POS-001, UC-POS-002, UC-POS-010, UC-POS-011, UC-POS-024, UC-POS-025 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-POS-001, UC-POS-011, UC-POS-024.
- Reglas observadas: RN-POS-101, RN-POS-102, RN-POS-110, RN-POS-111, RN-POS-124, RN-POS-125.
- Componentes: CMP-CORE-001, CMP-POS-001.
- Entidades relacionadas: ENT-ACA-001, ENT-ACA-002, ENT-POS-001, ENT-POS-002, ENT-POS-003, ENT-POS-004, ENT-POS-005, ENT-USR-002, ENT-USR-003.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-SYS-005.puml) · [SVG](../../renderizados/fase-5/DIA-SYS-005.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

A/B y valor anterior son parámetros, no códigos nuevos. EN_PROCESO→CONCLUIDA es un recorrido representativo: la conclusión común admite otro origen no concluido si su policy lo valida. El catálogo es abierto; PATCH permite pares distintos existentes. No es máquina exhaustiva ni CONCLUIDA absorbente; no modifica vigencia.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [CierrePostulacionService.reabrir_cierre (L163)](../../../../../apps/postulantes/cierre.py).
- [postulaciones_in_scope (L7)](../../../../../apps/postulantes/permissions.py).
- [PostulacionService.agregar_observacion (L326)](../../../../../apps/postulantes/services.py).
- [PostulacionService.cambiar_estado (L240)](../../../../../apps/postulantes/services.py).
- [PostulacionService.crear_postulacion (L57)](../../../../../apps/postulantes/services.py).
- [PostulacionService.crear_postulacion_historica (L129)](../../../../../apps/postulantes/services.py).
- [HistorialEstadoViewSet.get_queryset (L703)](../../../../../apps/postulantes/views.py).
- [ObservacionViewSet.create (L744)](../../../../../apps/postulantes/views.py).
- [ObservacionViewSet.get_queryset (L731)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.create (L174)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.get_queryset (L116)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.historicas (L240)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.partial_update (L263)](../../../../../apps/postulantes/views.py).
- [WorkflowService.concluir_postulacion (L367)](../../../../../apps/postulantes/workflow.py).
- [WorkflowService.iniciar_etapa (L58)](../../../../../apps/postulantes/workflow.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | crear_postulacion | REGISTRADA configurada; estudiante sin vigente | Crear postulación e historial | REGISTRADA | No ejecutar si falla la guarda; [PostulacionService.crear_postulacion (L57)](../../../../../apps/postulantes/services.py) |
| T02 | [*] | crear_postulacion_historica | Administración y CONCLUIDA configurada | Crear HISTORICO con vigencia CERRADA; no recorrido operativo | CONCLUIDA | No ejecutar si falla la guarda; [PostulacionService.crear_postulacion_historica (L129)](../../../../../apps/postulantes/services.py) |
| T03 | REGISTRADA | iniciar_etapa | Inicio válido y EN_PROCESO configurado; strict=False | Guardar estado general e historial | EN_PROCESO | No ejecutar si falla la guarda; [WorkflowService.iniciar_etapa (L58)](../../../../../apps/postulantes/workflow.py) |
| T04 | EN_PROCESO | concluir_postulacion | Validación de policy y estado CONCLUIDA disponible | Guardar estado general e historial; programar evento | CONCLUIDA | No ejecutar si falla la guarda; [WorkflowService.concluir_postulacion (L367)](../../../../../apps/postulantes/workflow.py) |
| T05 | CONCLUIDA | concluir_postulacion | Ya CONCLUIDA | Retornar sin validar otra vez la policy | CONCLUIDA | No ejecutar si falla la guarda; [WorkflowService.concluir_postulacion (L367)](../../../../../apps/postulantes/workflow.py) |
| T06 | A: valor actual de catálogo | cambiar_estado vía PATCH | Administración API; B existente y B distinto de A | Guardar estado, historial y auditoría; no gate de conclusión | B: valor destino de catálogo | No ejecutar si falla la guarda; [PostulacionService.cambiar_estado (L240)](../../../../../apps/postulantes/services.py) |
| T07 | CONCLUIDA | reabrir_cierre de Proyecto | Cierre aprobado; motivo; historial previo y destino distinto no nulo | Reabrir seguimiento y restaurar estado anterior del historial | Valor anterior del historial | No ejecutar si falla la guarda; [CierrePostulacionService.reabrir_cierre (L163)](../../../../../apps/postulantes/cierre.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests.py](../../../../../apps/postulantes/tests.py).
- [apps/postulantes/tests_security_contract.py](../../../../../apps/postulantes/tests_security_contract.py).
- [apps/postulantes/tests_us007.py](../../../../../apps/postulantes/tests_us007.py).
- [apps/usuarios/tests_role_authority.py](../../../../../apps/usuarios/tests_role_authority.py).
