# DIA-SYS-004 — Creación operativa y arranque por modalidad

- Identificador: DIA-SYS-004.
- Tipo UML: Secuencia.
- Objetivo: Documentar el comportamiento implementado de creación operativa y arranque por modalidad, con decisiones, guardas y límites de evidencia.
- Alcance: Registro, consulta y estado general; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-001.
- Casos relacionados: UC-POS-001, UC-POS-002, UC-POS-010, UC-POS-011, UC-POS-024, UC-POS-025 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-POS-001.
- Reglas observadas: RN-POS-101, RN-POS-102, RN-POS-110, RN-POS-111, RN-POS-124, RN-POS-125.
- Componentes: CMP-CORE-001, CMP-POS-001, CMP-WEB-001.
- Entidades relacionadas: ENT-ACA-001, ENT-ACA-002, ENT-POS-001, ENT-POS-002, ENT-POS-003, ENT-POS-004, ENT-POS-005, ENT-USR-002, ENT-USR-003.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/secuencias/DIA-SYS-004.puml) · [SVG](../../renderizados/fase-5/DIA-SYS-004.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Vista selectiva de implementación; no certifica ejecución funcional, datos instalados ni normativa vigente.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [postulaciones_in_scope (L7)](../../../../../apps/postulantes/permissions.py).
- [ProyectoGradoWorkflowOrchestrator.inicializar_proceso (L61)](../../../../../apps/postulantes/proyecto_grado_workflow.py).
- [PostulacionService.agregar_observacion (L326)](../../../../../apps/postulantes/services.py).
- [PostulacionService.cambiar_estado (L240)](../../../../../apps/postulantes/services.py).
- [PostulacionService.crear_postulacion (L57)](../../../../../apps/postulantes/services.py).
- [PostulacionService.crear_postulacion_historica (L129)](../../../../../apps/postulantes/services.py).
- [TesisGradoWorkflowOrchestrator.inicializar_proceso (L53)](../../../../../apps/postulantes/tesis_grado_workflow.py).
- [HistorialEstadoViewSet.get_queryset (L703)](../../../../../apps/postulantes/views.py).
- [ObservacionViewSet.create (L744)](../../../../../apps/postulantes/views.py).
- [ObservacionViewSet.get_queryset (L731)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.create (L174)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.get_queryset (L116)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.historicas (L240)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.partial_update (L263)](../../../../../apps/postulantes/views.py).
- [src/pages/postulantes/PostulantesPage.jsx (L1)](../../../../../src/pages/postulantes/PostulantesPage.jsx).
- [src/services/api.js (L1)](../../../../../src/services/api.js).
- [src/services/crudService.js (L1)](../../../../../src/services/crudService.js).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests.py](../../../../../apps/postulantes/tests.py).
- [apps/postulantes/tests_security_contract.py](../../../../../apps/postulantes/tests_security_contract.py).
- [apps/postulantes/tests_us007.py](../../../../../apps/postulantes/tests_us007.py).
- [apps/usuarios/tests_role_authority.py](../../../../../apps/usuarios/tests_role_authority.py).
