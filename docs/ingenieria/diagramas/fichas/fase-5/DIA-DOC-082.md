# DIA-DOC-082 — Corrección de una observación documental

- Identificador: DIA-DOC-082.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de corrección de una observación documental, con decisiones, guardas y límites de evidencia.
- Alcance: Corrección y confirmación técnica; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-DOC-004.
- Casos relacionados: UC-DOC-004, UC-DOC-005 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-DOC-004.
- Reglas observadas: RN-DOC-104, RN-DOC-105.
- Componentes: CMP-CORE-001, CMP-DOC-001.
- Entidades relacionadas: ENT-DOC-003, ENT-DOC-004, ENT-DOC-005, ENT-DOC-006, ENT-POS-006, ENT-USR-003.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-DOC-082.puml) · [SVG](../../renderizados/fase-5/DIA-DOC-082.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Booleano persistido; sin transición inversa confirmada. La confirmación técnica es otra entidad y no cambia automáticamente este indicador por este método.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [ConfirmacionCorreccionDocumentoService.registrar (L913)](../../../../../apps/documentos/services.py).
- [DocumentoService.marcar_observacion_corregida (L700)](../../../../../apps/documentos/services.py).
- [DocumentoService.registrar_observacion (L632)](../../../../../apps/documentos/services.py).
- [ConfirmacionCorreccionDocumentoViewSet.create (L384)](../../../../../apps/documentos/views.py).
- [ObservacionDocumentoViewSet.marcar_corregida (L357)](../../../../../apps/documentos/views.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | registrar_observacion | Administración; documento/versión habilitados | Crear observación pendiente | Pendiente: corregida=False | No ejecutar si falla la guarda; [DocumentoService.registrar_observacion (L632)](../../../../../apps/documentos/services.py) |
| T02 | Pendiente: corregida=False | marcar_observacion_corregida | Administración; observación activa y no corregida | Guardar fecha y recalcular pendientes de la versión actual | Corregida: corregida=True | No ejecutar si falla la guarda; [DocumentoService.marcar_observacion_corregida (L700)](../../../../../apps/documentos/services.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/documentos/test_api.py](../../../../../apps/documentos/test_api.py).
