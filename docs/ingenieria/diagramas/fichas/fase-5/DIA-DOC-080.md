# DIA-DOC-080 — Estado de revisión del documento

- Identificador: DIA-DOC-080.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de estado de revisión del documento, con decisiones, guardas y límites de evidencia.
- Alcance: Revisión documental; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-DOC-003.
- Casos relacionados: UC-DOC-002 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-DOC-002.
- Reglas observadas: RN-DOC-102.
- Componentes: CMP-CORE-001, CMP-DOC-001.
- Entidades relacionadas: ENT-DOC-003, ENT-DOC-004, ENT-DOC-005.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-DOC-080.puml) · [SVG](../../renderizados/fase-5/DIA-DOC-080.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Códigos operados por servicio, no catálogo físico consultado. No existe aquí transición a OBS. Las operaciones que conservan el código se muestran como transiciones internas, sin acciones entry/exit definidas. Observar en APR/REC es condicional: no prueba que una política concreta admita ambos. Autoaprobación inicial pasa por aprobar_documento. requiere_correccion es otro indicador.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [DocumentoService.aprobar_documento (L492)](../../../../../apps/documentos/services.py).
- [DocumentoService.crear_nueva_version (L375)](../../../../../apps/documentos/services.py).
- [DocumentoService.rechazar_documento (L562)](../../../../../apps/documentos/services.py).
- [DocumentoService.registrar_observacion (L632)](../../../../../apps/documentos/services.py).
- [DocumentoService.subir_documento (L146)](../../../../../apps/documentos/services.py).
- [DocumentoPostulacionViewSet.aprobar (L182)](../../../../../apps/documentos/views.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | carga inicial | Tipo, actor, contexto y archivo válidos | Crear documento en ENV | ENV | No ejecutar si falla la guarda; [DocumentoService.subir_documento (L146)](../../../../../apps/documentos/services.py) |
| T02 | ENV | nueva versión | Documento activo y postulación habilitada; carga/contexto válidos | Desmarcar previas; crear actual y reset de revisión/corrección | ENV | No ejecutar si falla la guarda; [DocumentoService.crear_nueva_version (L375)](../../../../../apps/documentos/services.py) |
| T03 | APR | nueva versión | Documento activo y postulación habilitada; carga/contexto válidos | Desmarcar previas; crear actual y reset de revisión/corrección | ENV | No ejecutar si falla la guarda; [DocumentoService.crear_nueva_version (L375)](../../../../../apps/documentos/services.py) |
| T04 | REC | nueva versión | Documento activo y postulación habilitada; carga/contexto válidos | Desmarcar previas; crear actual y reset de revisión/corrección | ENV | No ejecutar si falla la guarda; [DocumentoService.crear_nueva_version (L375)](../../../../../apps/documentos/services.py) |
| T05 | ENV | aprobar_documento | Administración; versión actual sin observaciones pendientes | fecha_revision; requiere_correccion=False | APR | No ejecutar si falla la guarda; [DocumentoService.aprobar_documento (L492)](../../../../../apps/documentos/services.py) |
| T06 | ENV | rechazar_documento | Administración; motivo; versión actual | fecha_revision; requiere_correccion=True | REC | No ejecutar si falla la guarda; [DocumentoService.rechazar_documento (L562)](../../../../../apps/documentos/services.py) |
| T07 | ENV | registrar_observacion | Administración; comentario; fuera de ENV solo si policy permite postaprobación | Crear observación en actual; requiere_correccion=True; conservar código | ENV | No ejecutar si falla la guarda; [DocumentoService.registrar_observacion (L632)](../../../../../apps/documentos/services.py) |
| T08 | APR | registrar_observacion | Administración; comentario; fuera de ENV solo si policy permite postaprobación | Crear observación en actual; requiere_correccion=True; conservar código | APR | No ejecutar si falla la guarda; [DocumentoService.registrar_observacion (L632)](../../../../../apps/documentos/services.py) |
| T09 | REC | registrar_observacion | Administración; comentario; fuera de ENV solo si policy permite postaprobación | Crear observación en actual; requiere_correccion=True; conservar código | REC | No ejecutar si falla la guarda; [DocumentoService.registrar_observacion (L632)](../../../../../apps/documentos/services.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/documentos/test_api.py](../../../../../apps/documentos/test_api.py).
