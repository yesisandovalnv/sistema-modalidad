# DIA-POS-071 — Reemplazo de asignación académica

- Identificador: DIA-POS-071.
- Tipo UML: Secuencia.
- Objetivo: Documentar el comportamiento implementado de reemplazo de asignación académica, con decisiones, guardas y límites de evidencia.
- Alcance: Asignaciones y elegibilidad contextual; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-003.
- Casos relacionados: UC-USR-007, UC-USR-008, UC-POS-004, UC-POS-016, UC-POS-017 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-POS-017.
- Reglas observadas: RN-POS-104, RN-POS-116, RN-POS-117, RN-USR-107, RN-USR-108.
- Componentes: CMP-CORE-001, CMP-POS-001, CMP-WEB-001.
- Entidades relacionadas: ENT-POS-004, ENT-POS-005, ENT-POS-006, ENT-USR-002.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/secuencias/DIA-POS-071.puml) · [SVG](../../renderizados/fase-5/DIA-POS-071.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Vista selectiva de implementación; no certifica ejecución funcional, datos instalados ni normativa vigente.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [AsignacionService.asignar_actor (L30)](../../../../../apps/postulantes/asignaciones.py).
- [AsignacionService.finalizar_asignacion (L195)](../../../../../apps/postulantes/asignaciones.py).
- [AsignacionService.reemplazar_actor (L233)](../../../../../apps/postulantes/asignaciones.py).
- [AsignacionPostulacionViewSet (L1065)](../../../../../apps/postulantes/views.py).
- [AsignacionPostulacionViewSet.finalizar (L1121)](../../../../../apps/postulantes/views.py).
- [AsignacionPostulacionViewSet.get_queryset (L1094)](../../../../../apps/postulantes/views.py).
- [AsignacionPostulacionViewSet.reemplazar (L1138)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.asignar (L659)](../../../../../apps/postulantes/views.py).
- [PostulacionViewSet.candidatos_asignacion (L580)](../../../../../apps/postulantes/views.py).
- [AssignmentCandidateViewSet.get_queryset (L223)](../../../../../apps/usuarios/views.py).
- [CanManageApplications.has_permission (L102)](../../../../../apps/usuarios/views.py).
- [StudentOptionViewSet.get_queryset (L178)](../../../../../apps/usuarios/views.py).
- [src/pages/postulantes/ExpedientePage.jsx (L1)](../../../../../src/pages/postulantes/ExpedientePage.jsx).
- [src/services/postulacionesService.js (L1)](../../../../../src/services/postulacionesService.js).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests_assignments.py](../../../../../apps/postulantes/tests_assignments.py).
- [apps/usuarios/tests_assignment_candidates_api.py](../../../../../apps/usuarios/tests_assignment_candidates_api.py).
- [apps/usuarios/tests_students_api.py](../../../../../apps/usuarios/tests_students_api.py).
