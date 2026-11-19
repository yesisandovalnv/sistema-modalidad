# UC-POS-017 — Finalizar o reemplazar asignación

## Identidad y estado

- Identificador: UC-POS-017.
- Objetivo: Asignación finalizada o reemplazada.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Finalizar o reemplazar asignación mediante `POST /api/v1/asignaciones/{id}/finalizar&#124;reemplazar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Postulación operable y restricciones de eventos/política. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar acción y payload.
2. Exigir administración.
3. Aplicar serializer y servicio de asignación.
4. Devolver asignación según acción.

## Flujos alternativos

Reemplazar vuelve a validar al usuario nuevo y no borra el historial.

## Excepciones

Ámbito: `POST /api/v1/asignaciones/{id}/finalizar&#124;reemplazar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `_assignment_validation_error(exc)` — [AsignacionPostulacionViewSet.finalizar](../../../../apps/postulantes/views.py); línea 1132; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Asignación finalizada o reemplazada. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-117: Finalización y reemplazo validan contexto y conservan historial de asignaciones.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [AsignacionPostulacionViewSet.finalizar](../../../../apps/postulantes/views.py); colaboración: [AsignacionService.finalizar_asignacion](../../../../apps/postulantes/asignaciones.py).
- Entidades: ENT-POS-006, ENT-POS-004 (AsignacionPostulacion, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_assignments.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [AsignacionServiceTest.test_permite_rol_historico_finalizado](../../../../apps/postulantes/tests_assignments.py) (L330); llamada a `AsignacionService.finalizar_asignacion`; no acredita escenario de excepción.
- [AsignacionServiceTest.test_finalizar_dos_veces_y_seguimiento_ajeno_bloqueados](../../../../apps/postulantes/tests_assignments.py) (L546); llamada a `AsignacionService.finalizar_asignacion`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_bloquea_finalizacion_si_la_asignacion_participa_en_evento_programado_o_en_curso](../../../../apps/postulantes/tests_assignments.py) (L568); llamada a `AsignacionService.finalizar_asignacion`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_no_bloquea_finalizacion_si_evento_vinculado_ya_finalizo](../../../../apps/postulantes/tests_assignments.py) (L621); llamada a `AsignacionService.finalizar_asignacion`; no acredita escenario de excepción.
- [AsignacionServiceTest.test_auditoria_registra_creacion_finalizacion_y_reemplazo](../../../../apps/postulantes/tests_assignments.py) (L724); llamada a `AsignacionService.finalizar_asignacion`; no acredita escenario de excepción.
- [AsignacionApiTest.test_ocupacion_tutor_tribunal_se_valida_en_ambos_sentidos](../../../../apps/postulantes/tests_assignments.py) (L1003); llamada a `AsignacionService.finalizar_asignacion`; no acredita escenario de excepción.
- [AsignacionApiTest.test_otra_postulacion_e_historico_no_bloquean_y_finalizar_libera](../../../../apps/postulantes/tests_assignments.py) (L1246); llamada a `AsignacionService.finalizar_asignacion`; no acredita escenario de excepción.
- [AsignacionApiTest.test_patch_directo_rechazado_y_filtros_funcionan](../../../../apps/postulantes/tests_assignments.py) (L1503); llamada a `AsignacionService.finalizar_asignacion`; no acredita escenario de excepción.
- [AsignacionApiTest.test_contrato_canonico_filtra_postulacion_e_incluye_activas_e_historicas](../../../../apps/postulantes/tests_assignments.py) (L1542); llamada a `AsignacionService.finalizar_asignacion`; no acredita escenario de excepción.
- [AsignacionApiTest.test_contrato_canonico_filtra_activo_y_expone_tipos_reales](../../../../apps/postulantes/tests_assignments.py) (L1563); llamada a `AsignacionService.finalizar_asignacion`; no acredita escenario de excepción.
- [AsignacionApiTest.test_alcance_propietario_actor_activo_historico_y_ajeno](../../../../apps/postulantes/tests_assignments.py) (L1612); llamada a `AsignacionService.finalizar_asignacion`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-017.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-017-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-017-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-017-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
