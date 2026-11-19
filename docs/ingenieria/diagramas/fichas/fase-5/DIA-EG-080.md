# DIA-EG-080 — Estado persistido del área de Examen

- Identificador: DIA-EG-080.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de estado persistido del área de examen, con decisiones, guardas y límites de evidencia.
- Alcance: Examen de Grado; Examen de Grado; usa infraestructura común con política específica.
- Proceso: PROC-EG-001.
- Casos relacionados: UC-EG-001, UC-EG-002, UC-EG-003 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-EG-001.
- Reglas observadas: RN-EG-101, RN-EG-102, RN-EG-103.
- Componentes: CMP-CORE-001, CMP-MOD-001.
- Entidades relacionadas: ENT-MOD-001, ENT-MOD-002, ENT-POS-004, ENT-POS-005.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-EG-080.puml) · [SVG](../../renderizados/fase-5/DIA-EG-080.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

EN_PROCESO existe como choice de ExamenArea pero no se encontró escritor productivo hacia él; no se conecta por analogía con SeguimientoEtapa. Las evaluaciones individuales incompletas conservan el estado del área y no constituyen otra fase persistida.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [ExamenGradoOverviewView.get (L27)](../../../../../apps/modalidades/examen_grado_api.py).
- [ExamenGradoOverviewView.post (L33)](../../../../../apps/modalidades/examen_grado_api.py).
- [ExamenGradoService.concluir (L139)](../../../../../apps/modalidades/examen_grado_service.py).
- [ExamenGradoService.ensure_areas (L22)](../../../../../apps/modalidades/examen_grado_service.py).
- [ExamenGradoService.overview (L34)](../../../../../apps/modalidades/examen_grado_service.py).
- [ExamenGradoService.registrar_evaluacion (L59)](../../../../../apps/modalidades/examen_grado_service.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | ensure_areas | Modalidad EXAMEN_GRADO; área ausente | Crear PENDIENTE | PENDIENTE | No ejecutar si falla la guarda; [ExamenGradoService.ensure_areas (L22)](../../../../../apps/modalidades/examen_grado_service.py) |
| T02 | PENDIENTE | registrar_evaluacion | Etapa EN_PROCESO; composición válida; consenso o tres individuales; resultado >=61; plazo si intento 2 | Área APROBADA; limpiar plazo y aprobar seguimiento | APROBADA | No ejecutar si falla la guarda; [ExamenGradoService.registrar_evaluacion (L59)](../../../../../apps/modalidades/examen_grado_service.py) |
| T03 | POSTERGADA | registrar_evaluacion | Etapa EN_PROCESO; composición válida; consenso o tres individuales; resultado >=61; plazo si intento 2 | Área APROBADA; limpiar plazo y aprobar seguimiento | APROBADA | No ejecutar si falla la guarda; [ExamenGradoService.registrar_evaluacion (L59)](../../../../../apps/modalidades/examen_grado_service.py) |
| T04 | PENDIENTE | primera evaluación completa insuficiente | Intento 1; resultado <61 | POSTERGADA; intento=2; plazo=now+15 días; rechazar y nuevo seguimiento | POSTERGADA | No ejecutar si falla la guarda; [ExamenGradoService.registrar_evaluacion (L59)](../../../../../apps/modalidades/examen_grado_service.py) |
| T05 | POSTERGADA | segunda evaluación completa insuficiente | Intento 2 dentro de plazo; resultado <61 | REPROBADA y rechazar seguimiento | REPROBADA | No ejecutar si falla la guarda; [ExamenGradoService.registrar_evaluacion (L59)](../../../../../apps/modalidades/examen_grado_service.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/modalidades/tests_examen_grado.py](../../../../../apps/modalidades/tests_examen_grado.py).
