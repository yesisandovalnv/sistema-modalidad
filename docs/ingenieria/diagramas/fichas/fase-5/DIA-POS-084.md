# DIA-POS-084 — Recepción física y cantidades

- Identificador: DIA-POS-084.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de recepción física y cantidades, con decisiones, guardas y límites de evidencia.
- Alcance: Condiciones y entrega física; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-006.
- Casos relacionados: UC-POS-023, UC-POS-026, UC-POS-027 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-POS-026.
- Reglas observadas: RN-POS-123, RN-POS-126, RN-POS-127.
- Componentes: CMP-CORE-001, CMP-POS-001.
- Entidades relacionadas: ENT-POS-004, ENT-POS-010, ENT-POS-011.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-POS-084.puml) · [SVG](../../renderizados/fase-5/DIA-POS-084.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

La cantidad recibida se sustituye, no se incrementa. La operación individual permite recalcular desde COMPLETA/PARCIAL; el lote registrar_multiples exige pendientes. No se impone una irreversibilidad inexistente.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [CondicionService (L18)](../../../../../apps/postulantes/complementarios.py).
- [EntregaFisicaService (L73)](../../../../../apps/postulantes/complementarios.py).
- [EntregaFisicaService.crear (L76)](../../../../../apps/postulantes/complementarios.py).
- [EntregaFisicaService.registrar_entrega (L83)](../../../../../apps/postulantes/complementarios.py).
- [CondicionViewSet (L69)](../../../../../apps/postulantes/complementarios_api.py).
- [EntregaFisicaViewSet (L89)](../../../../../apps/postulantes/complementarios_api.py).
- [RelatedViewSet.get_queryset (L61)](../../../../../apps/postulantes/complementarios_api.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | crear | Postulación editable; administración API | Crear recepción pendiente | PENDIENTE | No ejecutar si falla la guarda; [EntregaFisicaService.crear (L76)](../../../../../apps/postulantes/complementarios.py) |
| T02 | PENDIENTE | registrar_entrega / actualizar | Cantidad recibida > 0; editable; cantidad institucional None o recibida >= requerida | Sustituir cantidad_recibida, responsable, fecha y auditoría | COMPLETA | No ejecutar si falla la guarda; [EntregaFisicaService.registrar_entrega (L83)](../../../../../apps/postulantes/complementarios.py) |
| T03 | PENDIENTE | registrar_entrega / actualizar | Cantidad recibida > 0; editable; cantidad institucional definida y recibida < requerida | Sustituir cantidad_recibida, responsable, fecha y auditoría | PARCIAL | No ejecutar si falla la guarda; [EntregaFisicaService.registrar_entrega (L83)](../../../../../apps/postulantes/complementarios.py) |
| T04 | PARCIAL | registrar_entrega / actualizar | Cantidad recibida > 0; editable; cantidad institucional None o recibida >= requerida | Sustituir cantidad_recibida, responsable, fecha y auditoría | COMPLETA | No ejecutar si falla la guarda; [EntregaFisicaService.registrar_entrega (L83)](../../../../../apps/postulantes/complementarios.py) |
| T05 | PARCIAL | registrar_entrega / actualizar | Cantidad recibida > 0; editable; cantidad institucional definida y recibida < requerida | Sustituir cantidad_recibida, responsable, fecha y auditoría | PARCIAL | No ejecutar si falla la guarda; [EntregaFisicaService.registrar_entrega (L83)](../../../../../apps/postulantes/complementarios.py) |
| T06 | COMPLETA | registrar_entrega / actualizar | Cantidad recibida > 0; editable; cantidad institucional None o recibida >= requerida | Sustituir cantidad_recibida, responsable, fecha y auditoría | COMPLETA | No ejecutar si falla la guarda; [EntregaFisicaService.registrar_entrega (L83)](../../../../../apps/postulantes/complementarios.py) |
| T07 | COMPLETA | registrar_entrega / actualizar | Cantidad recibida > 0; editable; cantidad institucional definida y recibida < requerida | Sustituir cantidad_recibida, responsable, fecha y auditoría | PARCIAL | No ejecutar si falla la guarda; [EntregaFisicaService.registrar_entrega (L83)](../../../../../apps/postulantes/complementarios.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests_complementarios.py](../../../../../apps/postulantes/tests_complementarios.py).
