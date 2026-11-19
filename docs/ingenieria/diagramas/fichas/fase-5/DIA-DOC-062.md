# DIA-DOC-062 — Aprobar, rechazar u observar un documento

- Identificador: DIA-DOC-062.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de aprobar, rechazar u observar un documento, con decisiones, guardas y límites de evidencia.
- Alcance: Revisión documental; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-DOC-003.
- Casos relacionados: UC-DOC-002 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-DOC-002.
- Reglas observadas: RN-DOC-102.
- Componentes: CMP-CORE-001, CMP-DOC-001.
- Entidades relacionadas: ENT-DOC-003, ENT-DOC-004, ENT-DOC-005.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-DOC-062.puml) · [SVG](../../renderizados/fase-5/DIA-DOC-062.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Las acciones de un catálogo o ciclo son variantes por solicitud; no ejecución obligatoria de todo CRUD. Guardas académicas delegadas a la política citada.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [DocumentoService.aprobar_documento (L492)](../../../../../apps/documentos/services.py).
- [DocumentoService.registrar_observacion (L632)](../../../../../apps/documentos/services.py).
- [DocumentoPostulacionViewSet.aprobar (L182)](../../../../../apps/documentos/views.py).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/documentos/test_api.py](../../../../../apps/documentos/test_api.py).
