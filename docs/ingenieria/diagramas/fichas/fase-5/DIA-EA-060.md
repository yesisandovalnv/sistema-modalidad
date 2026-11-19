# DIA-EA-060 — Recorrido nominal y conclusión: Excelencia Académica

- Identificador: DIA-EA-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de recorrido nominal y conclusión: excelencia académica, con decisiones, guardas y límites de evidencia.
- Alcance: Excelencia Académica; Excelencia Académica; usa infraestructura común con política específica.
- Proceso: PROC-EA-001.
- Casos relacionados: UC-EA-001, UC-EA-002, UC-EA-003, UC-EA-004 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-EA-003.
- Reglas observadas: RN-EA-101, RN-EA-102, RN-EA-103, RN-EA-104.
- Componentes: CMP-CORE-001, CMP-MOD-001.
- Entidades relacionadas: ENT-MOD-003, ENT-POS-004, ENT-POS-005.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-EA-060.puml) · [SVG](../../renderizados/fase-5/DIA-EA-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Vista de coordinación académica entre solicitudes; el loop no existe como un único método automático. STAGE_DATA es declaración de código, no esquema instalado. Criterio inmutable después de seleccionado. RENDIMIENTO_ACADEMICO requiere promedio documentado >=80; RECONOCIMIENTO_CALIDAD no admite nota numérica. FAVORABLE aprueba EVALUACION_TRIBUNAL; DESFAVORABLE no rechaza automáticamente esa etapa.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [ExcelenciaAcademicaPolicy (L60)](../../../../../apps/modalidades/excelencia_academica.py).
- [ExcelenciaAcademicaOverviewView.get (L27)](../../../../../apps/modalidades/excelencia_academica_api.py).
- [ExcelenciaAcademicaOverviewView.post (L33)](../../../../../apps/modalidades/excelencia_academica_api.py).
- [ExcelenciaAcademicaService.concluir (L106)](../../../../../apps/modalidades/excelencia_academica_service.py).
- [ExcelenciaAcademicaService.configurar_criterio (L21)](../../../../../apps/modalidades/excelencia_academica_service.py).
- [ExcelenciaAcademicaService.overview (L36)](../../../../../apps/modalidades/excelencia_academica_service.py).
- [ExcelenciaAcademicaService.registrar_evaluacion (L69)](../../../../../apps/modalidades/excelencia_academica_service.py).
- [WorkflowService.aprobar_etapa (L111)](../../../../../apps/postulantes/workflow.py).

## Particularidades académicas

Criterio inmutable después de seleccionado. RENDIMIENTO_ACADEMICO requiere promedio documentado >=80; RECONOCIMIENTO_CALIDAD no admite nota numérica. FAVORABLE aprueba EVALUACION_TRIBUNAL; DESFAVORABLE no rechaza automáticamente esa etapa.

Orden nominal de STAGE_DATA, no lista de filas instaladas:

1. `INSCRIPCION`.
2. `REVISION_REQUISITOS`.
3. `EVALUACION_TRIBUNAL`.
4. `REGISTRO_ACTA`.
5. `CONCLUSION_ACADEMICA`.

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/modalidades/tests_excelencia_academica.py](../../../../../apps/modalidades/tests_excelencia_academica.py).
