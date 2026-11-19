# DIA-EA-080 — Resultado del expediente de Excelencia

- Identificador: DIA-EA-080.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de resultado del expediente de excelencia, con decisiones, guardas y límites de evidencia.
- Alcance: Excelencia Académica; Excelencia Académica; usa infraestructura común con política específica.
- Proceso: PROC-EA-001.
- Casos relacionados: UC-EA-001, UC-EA-002, UC-EA-003, UC-EA-004 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-EA-001, UC-EA-002.
- Reglas observadas: RN-EA-101, RN-EA-102, RN-EA-103, RN-EA-104.
- Componentes: CMP-CORE-001, CMP-MOD-001.
- Entidades relacionadas: ENT-MOD-003, ENT-POS-004, ENT-POS-005.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-EA-080.puml) · [SVG](../../renderizados/fase-5/DIA-EA-080.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Resultado persistido propio de Excelencia, no estado genérico de EvaluacionDefensa. DESFAVORABLE no rechaza automáticamente el seguimiento en registrar_evaluacion; permanece operable mientras la etapa siga EN_PROCESO. La conclusión requiere además etapas previas y acta.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [ExcelenciaAcademicaOverviewView.get (L27)](../../../../../apps/modalidades/excelencia_academica_api.py).
- [ExcelenciaAcademicaOverviewView.post (L33)](../../../../../apps/modalidades/excelencia_academica_api.py).
- [ExcelenciaAcademicaService.concluir (L106)](../../../../../apps/modalidades/excelencia_academica_service.py).
- [ExcelenciaAcademicaService.configurar_criterio (L21)](../../../../../apps/modalidades/excelencia_academica_service.py).
- [ExcelenciaAcademicaService.overview (L36)](../../../../../apps/modalidades/excelencia_academica_service.py).
- [ExcelenciaAcademicaService.registrar_evaluacion (L69)](../../../../../apps/modalidades/excelencia_academica_service.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | configurar_criterio | Modalidad y criterio válidos; expediente aún no existente; flujo no iniciado | Crear resultado PENDIENTE | PENDIENTE | No ejecutar si falla la guarda; [ExcelenciaAcademicaService.configurar_criterio (L21)](../../../../../apps/modalidades/excelencia_academica_service.py) |
| T02 | PENDIENTE | registrar_evaluacion | Etapa EVALUACION_TRIBUNAL EN_PROCESO; tribunal y documentos; rendimiento >=80 o calidad sin nota | Guardar resultado; solo FAVORABLE aprueba la etapa | FAVORABLE | No ejecutar si falla la guarda; [ExcelenciaAcademicaService.registrar_evaluacion (L69)](../../../../../apps/modalidades/excelencia_academica_service.py) |
| T03 | PENDIENTE | registrar_evaluacion | Etapa EVALUACION_TRIBUNAL EN_PROCESO; tribunal y documentos; rendimiento >=80 o calidad sin nota | Guardar resultado; solo FAVORABLE aprueba la etapa | DESFAVORABLE | No ejecutar si falla la guarda; [ExcelenciaAcademicaService.registrar_evaluacion (L69)](../../../../../apps/modalidades/excelencia_academica_service.py) |
| T04 | DESFAVORABLE | registrar_evaluacion | Etapa EVALUACION_TRIBUNAL EN_PROCESO; tribunal y documentos; rendimiento >=80 o calidad sin nota | Guardar resultado; solo FAVORABLE aprueba la etapa | FAVORABLE | No ejecutar si falla la guarda; [ExcelenciaAcademicaService.registrar_evaluacion (L69)](../../../../../apps/modalidades/excelencia_academica_service.py) |
| T05 | DESFAVORABLE | registrar_evaluacion | Etapa EVALUACION_TRIBUNAL EN_PROCESO; tribunal y documentos; rendimiento >=80 o calidad sin nota | Guardar resultado; solo FAVORABLE aprueba la etapa | DESFAVORABLE | No ejecutar si falla la guarda; [ExcelenciaAcademicaService.registrar_evaluacion (L69)](../../../../../apps/modalidades/excelencia_academica_service.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/modalidades/tests_excelencia_academica.py](../../../../../apps/modalidades/tests_excelencia_academica.py).
