# DIA-PG-070 — Cierre documental, conclusión y reapertura de Proyecto

- Identificador: DIA-PG-070.
- Tipo UML: Secuencia.
- Objetivo: Documentar el comportamiento implementado de cierre documental, conclusión y reapertura de proyecto, con decisiones, guardas y límites de evidencia.
- Alcance: Proyecto de Grado; Proyecto de Grado; usa infraestructura común con política específica.
- Proceso: PROC-PG-001.
- Casos relacionados: UC-PG-001, UC-PG-002 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-PG-002.
- Reglas observadas: RN-PG-101, RN-PG-102.
- Componentes: CMP-CORE-001, CMP-MOD-001, CMP-WEB-001.
- Entidades relacionadas: ENT-DOC-004, ENT-POS-004, ENT-POS-005, ENT-POS-006, ENT-POS-009, ENT-POS-010, ENT-POS-011.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/secuencias/DIA-PG-070.puml) · [SVG](../../renderizados/fase-5/DIA-PG-070.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Secuencia de variantes independientes, no acciones sucesivas de una sola petición. El callback postcommit se detalla en la vista de notificaciones. Exclusiva de la policy de cierre disponible; no extender a Tesis por analogía.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [CierrePostulacionService (L103)](../../../../../apps/postulantes/cierre.py).
- [CierrePostulacionService.aprobar_cierre_documental (L143)](../../../../../apps/postulantes/cierre.py).
- [CierrePostulacionService.reabrir_cierre (L163)](../../../../../apps/postulantes/cierre.py).
- [CierreAccionView.post (L40)](../../../../../apps/postulantes/cierre_api.py).
- [MemorandumDesignacionService.publicar (L56)](../../../../../apps/postulantes/memorandums.py).
- [PostulacionViewSet.memorandums_designacion (L304)](../../../../../apps/postulantes/views.py).
- [src/services/postulacionesService.js (L1)](../../../../../src/services/postulacionesService.js).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests_cierre.py](../../../../../apps/postulantes/tests_cierre.py).
- [apps/postulantes/tests_memorandums.py](../../../../../apps/postulantes/tests_memorandums.py).
