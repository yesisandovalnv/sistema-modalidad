# DIA-DIP-080 — Estado persistido de módulo de Diplomado

- Identificador: DIA-DIP-080.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de estado persistido de módulo de diplomado, con decisiones, guardas y límites de evidencia.
- Alcance: Vía Diplomado; Vía Diplomado; usa infraestructura común con política específica.
- Proceso: PROC-DIP-001.
- Casos relacionados: UC-DIP-001, UC-DIP-002, UC-DIP-003 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-DIP-001.
- Reglas observadas: RN-DIP-101, RN-DIP-102, RN-DIP-103.
- Componentes: CMP-CORE-001, CMP-MOD-001.
- Entidades relacionadas: ENT-MOD-004, ENT-MOD-005, ENT-POS-004, ENT-POS-005.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-DIP-080.puml) · [SVG](../../renderizados/fase-5/DIA-DIP-080.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

EN_PROCESO está declarado como choice sin escritor confirmado hacia el estado del módulo. El servicio permite volver a registrar resultado mientras su etapa sea operable; no se inventa una prohibición por el resultado anterior ni aprobación automática del seguimiento.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [DiplomadoOverviewView.get (L27)](../../../../../apps/modalidades/diplomado_api.py).
- [DiplomadoOverviewView.post (L30)](../../../../../apps/modalidades/diplomado_api.py).
- [DiplomadoService.conclude (L85)](../../../../../apps/modalidades/diplomado_service.py).
- [DiplomadoService.ensure_modules (L31)](../../../../../apps/modalidades/diplomado_service.py).
- [DiplomadoService.overview (L71)](../../../../../apps/modalidades/diplomado_service.py).
- [DiplomadoService.set_module_result (L40)](../../../../../apps/modalidades/diplomado_service.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | ensure_modules | Modalidad correcta y módulo ausente | Crear módulo PENDIENTE | PENDIENTE | No ejecutar si falla la guarda; [DiplomadoService.ensure_modules (L31)](../../../../../apps/modalidades/diplomado_service.py) |
| T02 | PENDIENTE | set_module_result | Etapa actual EN_PROCESO/OBSERVADA; orden corresponde; nota 0..100; nota > 65 | Guardar nota, estado y observaciones; no aprobar seguimiento en este método | APROBADO | No ejecutar si falla la guarda; [DiplomadoService.set_module_result (L40)](../../../../../apps/modalidades/diplomado_service.py) |
| T03 | PENDIENTE | set_module_result | Etapa actual EN_PROCESO/OBSERVADA; orden corresponde; nota 0..100; nota <=65 | Guardar nota, estado y observaciones; no aprobar seguimiento en este método | REPROBADO | No ejecutar si falla la guarda; [DiplomadoService.set_module_result (L40)](../../../../../apps/modalidades/diplomado_service.py) |
| T04 | APROBADO | set_module_result | Etapa actual EN_PROCESO/OBSERVADA; orden corresponde; nota 0..100; nota > 65 | Guardar nota, estado y observaciones; no aprobar seguimiento en este método | APROBADO | No ejecutar si falla la guarda; [DiplomadoService.set_module_result (L40)](../../../../../apps/modalidades/diplomado_service.py) |
| T05 | APROBADO | set_module_result | Etapa actual EN_PROCESO/OBSERVADA; orden corresponde; nota 0..100; nota <=65 | Guardar nota, estado y observaciones; no aprobar seguimiento en este método | REPROBADO | No ejecutar si falla la guarda; [DiplomadoService.set_module_result (L40)](../../../../../apps/modalidades/diplomado_service.py) |
| T06 | REPROBADO | set_module_result | Etapa actual EN_PROCESO/OBSERVADA; orden corresponde; nota 0..100; nota > 65 | Guardar nota, estado y observaciones; no aprobar seguimiento en este método | APROBADO | No ejecutar si falla la guarda; [DiplomadoService.set_module_result (L40)](../../../../../apps/modalidades/diplomado_service.py) |
| T07 | REPROBADO | set_module_result | Etapa actual EN_PROCESO/OBSERVADA; orden corresponde; nota 0..100; nota <=65 | Guardar nota, estado y observaciones; no aprobar seguimiento en este método | REPROBADO | No ejecutar si falla la guarda; [DiplomadoService.set_module_result (L40)](../../../../../apps/modalidades/diplomado_service.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/modalidades/tests_diplomado.py](../../../../../apps/modalidades/tests_diplomado.py).
