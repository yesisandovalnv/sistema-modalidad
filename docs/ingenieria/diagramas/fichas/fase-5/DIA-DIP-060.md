# DIA-DIP-060 — Recorrido nominal y conclusión: Vía Diplomado

- Identificador: DIA-DIP-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: vía diplomado, con decisiones, guardas y límites de evidencia.
- Alcance: Vía Diplomado; Vía Diplomado; usa infraestructura común con política específica.
- Proceso: PROC-DIP-001.
- Casos relacionados: UC-DIP-001, UC-DIP-002, UC-DIP-003 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-DIP-002.
- Reglas observadas: RN-DIP-101, RN-DIP-102, RN-DIP-103.
- Componentes: CMP-CORE-001, CMP-MOD-001.
- Entidades relacionadas: ENT-MOD-004, ENT-MOD-005, ENT-POS-004, ENT-POS-005.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-DIP-060.puml) · [SVG](../../renderizados/fase-5/DIA-DIP-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Vista de coordinación académica entre solicitudes; el loop no existe como un único método automático. STAGE_DATA es declaración de código, no esquema instalado. Cinco módulos; quinto Taller de Investigación. Nota >65 aprueba módulo; guardar módulo no aprueba automáticamente su seguimiento. Defensa y reintento se rigen por Diplomado. Overview puede inicializar módulos auxiliares.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [DiplomadoPolicy (L190)](../../../../../apps/modalidades/diplomado.py).
- [DiplomadoOverviewView.get (L27)](../../../../../apps/modalidades/diplomado_api.py).
- [DiplomadoOverviewView.post (L30)](../../../../../apps/modalidades/diplomado_api.py).
- [DiplomadoService.conclude (L85)](../../../../../apps/modalidades/diplomado_service.py).
- [DiplomadoService.overview (L71)](../../../../../apps/modalidades/diplomado_service.py).
- [DiplomadoService.set_module_result (L40)](../../../../../apps/modalidades/diplomado_service.py).
- [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py).

## Particularidades académicas

Cinco módulos; quinto Taller de Investigación. Nota >65 aprueba módulo; guardar módulo no aprueba automáticamente su seguimiento. Defensa y reintento se rigen por Diplomado. Overview puede inicializar módulos auxiliares.

Orden nominal de STAGE_DATA, no lista de filas instaladas:

1. `INSCRIPCION`.
2. `MODULO_1`.
3. `MODULO_2`.
4. `MODULO_3`.
5. `MODULO_4`.
6. `TALLER_INVESTIGACION`.
7. `REVISION_MONOGRAFIA`.
8. `DEFENSA_PUBLICA`.
9. `CIERRE_DOCUMENTAL`.
10. `CONCLUSION_ACADEMICA`.

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/modalidades/tests_diplomado.py](../../../../../apps/modalidades/tests_diplomado.py).
