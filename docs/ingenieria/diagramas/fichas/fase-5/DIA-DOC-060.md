# DIA-DOC-060 — Carga, versionado y autoaprobación específica

- Identificador: DIA-DOC-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de carga, versionado y autoaprobación específica, con decisiones, guardas y límites de evidencia.
- Alcance: Carga, versiones y evidencia histórica; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-DOC-001.
- Casos relacionados: UC-DOC-001, UC-DOC-006 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-DOC-001, UC-DOC-006.
- Reglas observadas: RN-DOC-101, RN-DOC-106.
- Componentes: CMP-CORE-001, CMP-DOC-001.
- Entidades relacionadas: ENT-DOC-002, ENT-DOC-003, ENT-DOC-004, ENT-POS-004, ENT-USR-003.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-DOC-060.puml) · [SVG](../../renderizados/fase-5/DIA-DOC-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

El storage no participa en rollback SQL. La carga histórica usa un contrato específico; no equivale a haber ejecutado el flujo ordinario. Autoaprobar no es regla universal.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [DocumentoService.crear_nueva_version (L375)](../../../../../apps/documentos/services.py).
- [DocumentoService.subir_documento (L146)](../../../../../apps/documentos/services.py).
- [DocumentoService.subir_documento_historico (L331)](../../../../../apps/documentos/services.py).
- [DocumentoPostulacionViewSet.subir (L125)](../../../../../apps/documentos/views.py).
- [PostulacionViewSet.subir_documento_historico (L451)](../../../../../apps/postulantes/views.py).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/documentos/test_api.py](../../../../../apps/documentos/test_api.py).
- [apps/postulantes/tests_us007.py](../../../../../apps/postulantes/tests_us007.py).
