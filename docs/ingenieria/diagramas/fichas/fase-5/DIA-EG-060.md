# DIA-EG-060 — Recorrido nominal y conclusión: Examen de Grado

- Identificador: DIA-EG-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: examen de grado, con decisiones, guardas y límites de evidencia.
- Alcance: Examen de Grado; Examen de Grado; usa infraestructura común con política específica.
- Proceso: PROC-EG-001.
- Casos relacionados: UC-EG-001, UC-EG-002, UC-EG-003 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-EG-002.
- Reglas observadas: RN-EG-101, RN-EG-102, RN-EG-103.
- Componentes: CMP-CORE-001, CMP-MOD-001.
- Entidades relacionadas: ENT-MOD-001, ENT-MOD-002, ENT-POS-004, ENT-POS-005.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-EG-060.puml) · [SVG](../../renderizados/fase-5/DIA-EG-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Vista de coordinación académica entre solicitudes; el loop no existe como un único método automático. STAGE_DATA es declaración de código, no esquema instalado. Cuatro áreas con pesos de AREA_DATA, consenso o tres notas individuales. Mínimo 61 por área. Primer insuficiente: POSTERGADA, intento 2 y plazo de 15 días; segundo insuficiente: REPROBADA. No son defensas 30/70 de Proyecto.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [ExamenGradoPolicy (L56)](../../../../../apps/modalidades/examen_grado.py).
- [ExamenGradoOverviewView.get (L27)](../../../../../apps/modalidades/examen_grado_api.py).
- [ExamenGradoOverviewView.post (L33)](../../../../../apps/modalidades/examen_grado_api.py).
- [ExamenGradoService.concluir (L139)](../../../../../apps/modalidades/examen_grado_service.py).
- [ExamenGradoService.overview (L34)](../../../../../apps/modalidades/examen_grado_service.py).
- [ExamenGradoService.registrar_evaluacion (L59)](../../../../../apps/modalidades/examen_grado_service.py).
- [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py).

## Particularidades académicas

Cuatro áreas con pesos de AREA_DATA, consenso o tres notas individuales. Mínimo 61 por área. Primer insuficiente: POSTERGADA, intento 2 y plazo de 15 días; segundo insuficiente: REPROBADA. No son defensas 30/70 de Proyecto.

Orden nominal de STAGE_DATA, no lista de filas instaladas:

1. `INSCRIPCION`.
2. `PREPARACION_EXAMEN`.
3. `AREA_1`.
4. `AREA_2`.
5. `AREA_3`.
6. `AREA_4`.
7. `DOCUMENTACION_FINAL`.
8. `CONCLUSION_ACADEMICA`.

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/modalidades/tests_examen_grado.py](../../../../../apps/modalidades/tests_examen_grado.py).
