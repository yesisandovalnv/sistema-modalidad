# DIA-TD-060 — Recorrido nominal y conclusión: Trabajo Dirigido

- Identificador: DIA-TD-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: trabajo dirigido, con decisiones, guardas y límites de evidencia.
- Alcance: Trabajo Dirigido; Trabajo Dirigido; usa infraestructura común con política específica.
- Proceso: PROC-TD-001.
- Casos relacionados: UC-TD-001, UC-TD-002, UC-TD-003, UC-TD-004 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-TD-003.
- Reglas observadas: RN-TD-101, RN-TD-102, RN-TD-103, RN-TD-104.
- Componentes: CMP-CORE-001, CMP-MOD-001.
- Entidades relacionadas: ENT-MOD-006, ENT-MOD-007, ENT-POS-004, ENT-POS-005.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-TD-060.puml) · [SVG](../../renderizados/fase-5/DIA-TD-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Vista de coordinación académica entre solicitudes; el loop no existe como un único método automático. STAGE_DATA es declaración de código, no esquema instalado. Institución interna/externa, convenio cuando corresponde y supervisor descrito no equivalen a actor API externo. Informes institucionales se registran por servicio propio. Importa políticas base de Proyecto pero no se generalizan sus reglas.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [TrabajoDirigidoPolicy (L287)](../../../../../apps/modalidades/trabajo_dirigido.py).
- [TrabajoDirigidoOverviewView.get (L27)](../../../../../apps/modalidades/trabajo_dirigido_api.py).
- [TrabajoDirigidoOverviewView.post (L30)](../../../../../apps/modalidades/trabajo_dirigido_api.py).
- [TrabajoDirigidoService.concluir (L105)](../../../../../apps/modalidades/trabajo_dirigido_service.py).
- [TrabajoDirigidoService.configurar_institucion (L17)](../../../../../apps/modalidades/trabajo_dirigido_service.py).
- [TrabajoDirigidoService.overview (L59)](../../../../../apps/modalidades/trabajo_dirigido_service.py).
- [TrabajoDirigidoService.registrar_informe (L41)](../../../../../apps/modalidades/trabajo_dirigido_service.py).
- [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py).

## Particularidades académicas

Institución interna/externa, convenio cuando corresponde y supervisor descrito no equivalen a actor API externo. Informes institucionales se registran por servicio propio. Importa políticas base de Proyecto pero no se generalizan sus reglas.

Orden nominal de STAGE_DATA, no lista de filas instaladas:

1. `INSCRIPCION`.
2. `PERFIL_TRABAJO_DIRIGIDO`.
3. `DESARROLLO_TRABAJO_DIRIGIDO`.
4. `DOCUMENTO_FINAL`.
5. `REVISION_TRIBUNAL_PREVIA`.
6. `DEFENSA_PRIVADA`.
7. `DEFENSA_PUBLICA`.
8. `CIERRE_DOCUMENTAL`.

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/modalidades/tests_trabajo_dirigido.py](../../../../../apps/modalidades/tests_trabajo_dirigido.py).
