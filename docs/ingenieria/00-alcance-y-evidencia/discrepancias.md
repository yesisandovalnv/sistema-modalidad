# Registro de discrepancias

No se corrigen fuentes anteriores ni se cambia comportamiento. Los tratamientos son PROPUESTAS; las observaciones distinguen hechos y pendientes.

| ID | Fuente anterior o alternativa | Diferencia verificable | Estado y tratamiento |
| --- | --- | --- | --- |
| DISC-001 | [ARCHITECTURE.md](../../ARCHITECTURE.md) | Declara modalidades sin normativa implementada; [ModalidadesConfig.ready](../../../apps/modalidades/apps.py) registra seis políticas con implementaciones | Confirmada: afirmación desactualizada. Reformular arquitectura en fase autorizada; tener código no certifica vigencia normativa |
| DISC-002 | [BACKLOG_PROYECTO.md](../../BACKLOG_PROYECTO.md), riesgos | Afirma que otras modalidades no tienen política normativa; existen [políticas y registro](../../../apps/modalidades/policies.py) | Confirmada en esa afirmación; el resto del backlog requiere conciliación historia por historia |
| DISC-003 | [PERMISSION_MATRIX.md](../../PERMISSION_MATRIX.md), tabla Después | Agrupa modalidades con catálogos como POST/DELETE administrativos; [ModalidadViewSet.create y destroy](../../../apps/academico/views.py) rechazan esos métodos | Confirmada. Separar modalidades de periodos/requisitos; contrastar [contrato de seguridad](../../../apps/postulantes/tests_security_contract.py) |
| DISC-004 | [BACKLOG_PROYECTO.md](../../BACKLOG_PROYECTO.md), actor administrativo y riesgos | Relaciona is_staff con autoridad interna; [is_staff_user](../../../core/permissions.py) usa ADMINISTRADOR o is_superuser | Confirmada como ambigüedad. Usar definición canónica y distinguir Django Admin |
| DISC-005 | [apps/modalidades/apps.py](../../../apps/modalidades/apps.py), docstring | Declara app deprecada y reemplazada; está [instalada](../../../core/settings/base.py) y ready registra políticas | Confirmada: comentario ambiguo. Documentar catálogo frente a comportamiento; no retirar app |
| DISC-006 | [core/settings.py](../../../core/settings.py) | Coexiste configuración alternativa con valores distintos del [paquete settings](../../../core/settings/__init__.py) | Divergencia confirmada; no defecto de ejecución demostrado. Documentar configuración seleccionada |
| DISC-007 | [proyecto_grado.py](../../../apps/modalidades/proyecto_grado.py) | HEAD declara antelación pública de 48 horas; directorio de trabajo declara 0 | Variante local preexistente; validación académica PENDIENTE. Conservar y etiquetar la referencia del modelado |


## Hallazgos funcionales de fase 4

| ID | Evidencia | Diferencia o límite | Tratamiento |
| --- | --- | --- | --- |
| DISC-008 | [DocumentoService.marcar_observacion_corregida](../../../apps/documentos/services.py) | Exige administración; propiedad estudiantil no basta para marcar corregida | Implementación confirmada; corregir interpretación documental, sin cambiar permisos |
| DISC-009 | [querysets de documentos](../../../apps/documentos/views.py) y [memorandos](../../../apps/postulantes/memorandums.py) | Memorandos/versiones tienen filtro de publicación y vigencia adicional al vínculo | Mantener restricción explícita en fichas y matriz |
| DISC-010 | [PostulacionViewSet.partial_update](../../../apps/postulantes/views.py), [cambiar_estado](../../../apps/postulantes/services.py), [concluir_postulacion](../../../apps/postulantes/workflow.py) | PATCH de estado no ejecuta las mismas guardas que conclusión académica | Divergencia de validación confirmada; revisión funcional posterior con autorización, sin corrección aquí |
| DISC-011 | [ConfirmacionCorreccionDocumentoViewSet](../../../apps/documentos/views.py) | Hereda actualización/eliminación; create usa servicio y validaciones adicionales | Caracterización de variantes heredadas pendiente, sin ejecutarlas |
| DISC-012 | [Examen overview](../../../apps/modalidades/examen_grado_service.py), [Diplomado overview](../../../apps/modalidades/diplomado_service.py) | Lecturas específicas pueden inicializar estructuras auxiliares | No declarar todos los GET físicamente inmutables; caracterizar efecto en entorno aislado |
| DISC-013 | [LogoutView.post](../../../apps/usuarios/views.py) | No se observa comprobación explícita de propiedad del refresh recibido en la vista | Contrato pendiente de prueba aislada; no se afirma un incidente ni se opera una sesión real |
| DISC-014 | [querysets de postulaciones](../../../apps/postulantes/permissions.py), [etapas y asignaciones](../../../apps/postulantes/views.py), [defensas](../../../apps/postulantes/defensas_api.py) | COMMON exige rol y vínculo; RELATED usa vínculo; defensas añade participantes | Diferencias implementadas, no defecto demostrado. Evitar una matriz universal basada solo en rol |

## Pendientes independientes

- [PostulacionService](../../../apps/postulantes/services.py) tiene obtener_postulacion y listar_postulaciones con NotImplementedError; las consultas en vistas existen.
- [SeguimientoViewSet.list](../../../apps/seguimiento/views.py) y [vista residual de modalidades](../../../apps/modalidades/views.py) son estructuras iniciales, no toda la funcionalidad de sus áreas.
- PostgreSQL instalado, producción real y normativa vigente no se verificaron.
- Existencia de pruebas no acredita resultado actual.

Una discrepancia se cierra con evidencia de conciliación. Esta fase solo las registra; conservar fuente, alcance y clasificación al resolverlas.

## Hallazgos del modelado dinámico — fase 5

| ID | Evidencia | Comportamiento verificado | Tratamiento |
| --- | --- | --- | --- |
| DISC-015 | [workflow](../../../apps/postulantes/workflow.py), [servicio de postulación](../../../apps/postulantes/services.py) | Conclusión cambia estado_actual; no cambia automáticamente vigencia. Baja tiene servicio, sin endpoint público confirmado | Separar ambas dimensiones; CANCELADA sin escritor productivo identificado. No proponer transición normativa por analogía |
| DISC-016 | [DocumentoService.registrar_observacion](../../../apps/documentos/services.py) | Observar crea observación y cambia requiere_correccion, no mueve el código del documento a OBS | Ficha de estados separa código, corrección y actualidad de versión |
| DISC-017 | [modelos de modalidades](../../../apps/modalidades/models.py), [Examen](../../../apps/modalidades/examen_grado_service.py), [Diplomado](../../../apps/modalidades/diplomado_service.py) | EN_PROCESO está declarado en área/módulo pero no se encontró escritor productivo hacia ese valor | No conectarlo artificialmente al iniciar SeguimientoEtapa; registrar valor declarado sin transición demostrada |
| DISC-018 | [creación de versiones](../../../apps/documentos/services.py) | Compensa archivo recién creado en excepciones capturadas dentro de crear_nueva_version; storage no tiene rollback SQL | No afirmar atomicidad filesystem/PostgreSQL ni compensación de todo rollback exterior posterior |
| DISC-019 | [eventos](../../../apps/notificaciones/events.py), [notificaciones](../../../apps/notificaciones/services.py) | Callback local robusto después del commit; deduplicación por destinatario/clave | Sin outbox persistente, broker o reintento automático demostrados. No modelar entrega externa |
| DISC-020 | [DiplomadoService.set_module_result](../../../apps/modalidades/diplomado_service.py), [ExcelenciaAcademicaService.registrar_evaluacion](../../../apps/modalidades/excelencia_academica_service.py) | Nota del módulo no aprueba su seguimiento por este método; DESFAVORABLE de Excelencia no rechaza automáticamente la etapa | Mantener resultado específico separado del estado técnico; documentar efectos exactos sin uniformarlos |
