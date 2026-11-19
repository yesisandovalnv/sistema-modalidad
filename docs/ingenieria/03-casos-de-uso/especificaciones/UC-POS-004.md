# UC-POS-004 — Asignar un actor académico

## Identidad y estado

- Identificador: UC-POS-004.
- Objetivo: Asignación registrada con efectos de auditoría/notificación definidos por el servicio.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Asignar un actor académico mediante `POST /api/v1/postulaciones/{id}/asignaciones/asignar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Reglas de ocupación, etapa, actor y modalidad vigentes. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar usuario, tipo de participación y contexto.
2. Exigir autoridad administrativa y validar AsignarActorSerializer.
3. Resolver postulación y usuario.
4. Aplicar AsignacionService y reglas de modalidad.
5. Devolver asignación registrada.

## Flujos alternativos

Cambiar una asignación existente se documenta mediante finalizar/reemplazar; no se presume que todos los cargos sean admisibles en todas las modalidades.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/asignaciones/asignar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('No tiene permisos para asignar actores.')` — [PostulacionViewSet.asignar](../../../../apps/postulantes/views.py); línea 661; método citado.
- `_assignment_validation_error(exc)` — [PostulacionViewSet.asignar](../../../../apps/postulantes/views.py); línea 677; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Asignación registrada con efectos de auditoría/notificación definidos por el servicio. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-104: El servicio valida participación, contexto, posición e incompatibilidades específicas; ser candidato no acredita elegibilidad.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.asignar](../../../../apps/postulantes/views.py); colaboración: [AsignacionService.asignar_actor](../../../../apps/postulantes/asignaciones.py).
- Entidades: ENT-POS-006, ENT-USR-002, ENT-POS-004, ENT-POS-005 (AsignacionPostulacion, CustomUser, Postulacion, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_assignments.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [AsignacionServiceTest.test_rechaza_misma_persona_como_presidente_y_secretario_en_defensa_publica](../../../../apps/postulantes/tests_assignments.py) (L314); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_rechaza_secretario_o_presidente_que_ya_es_tribunal](../../../../apps/postulantes/tests_assignments.py) (L320); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_permite_rol_historico_finalizado](../../../../apps/postulantes/tests_assignments.py) (L330); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionServiceTest.test_permite_roles_en_intentos_publicos_distintos](../../../../apps/postulantes/tests_assignments.py) (L342); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionServiceTest.test_asignar_tutor_y_obtener_tutor_activo](../../../../apps/postulantes/tests_assignments.py) (L353); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionServiceTest.test_impide_segundo_tutor_activo](../../../../apps/postulantes/tests_assignments.py) (L367); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_reemplazar_tutor_conserva_historial](../../../../apps/postulantes/tests_assignments.py) (L383); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionServiceTest.test_contrato_actual_tribunal_perfil_admite_ordenes_uno_dos_y_tres_en_su_contexto](../../../../apps/postulantes/tests_assignments.py) (L405); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionServiceTest.test_resolver_candidatos_mantiene_ocupados_visibles_y_bloqueados_por_politica](../../../../apps/postulantes/tests_assignments.py) (L424); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionServiceTest.test_contrato_actual_tribunal_perfil_bloquea_cuarto_miembro_en_mismo_contexto](../../../../apps/postulantes/tests_assignments.py) (L465); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_tribunal_bloquea_orden_duplicado](../../../../apps/postulantes/tests_assignments.py) (L489); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_docente_modalidad_unico_y_reemplazable](../../../../apps/postulantes/tests_assignments.py) (L509); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_bloquea_usuario_inactivo_y_estudiante](../../../../apps/postulantes/tests_assignments.py) (L529); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_finalizar_dos_veces_y_seguimiento_ajeno_bloqueados](../../../../apps/postulantes/tests_assignments.py) (L546); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_bloquea_finalizacion_si_la_asignacion_participa_en_evento_programado_o_en_curso](../../../../apps/postulantes/tests_assignments.py) (L568); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_no_bloquea_finalizacion_si_evento_vinculado_ya_finalizo](../../../../apps/postulantes/tests_assignments.py) (L621); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionServiceTest.test_reemplazar_actor_no_bypassea_proteccion_de_evento_activo](../../../../apps/postulantes/tests_assignments.py) (L665); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_reemplazo_es_atomico_si_falla_creacion_nueva](../../../../apps/postulantes/tests_assignments.py) (L704); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionServiceTest.test_auditoria_registra_creacion_finalizacion_y_reemplazo](../../../../apps/postulantes/tests_assignments.py) (L724); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [ProyectoGradoHitosAssignmentTests.test_tutor_se_designa_antes_de_aprobar_propuesta](../../../../apps/postulantes/tests_assignments.py) (L779); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [ProyectoGradoHitosAssignmentTests.test_tutor_permanece_compatible_en_pg_legacy](../../../../apps/postulantes/tests_assignments.py) (L820); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [ProyectoGradoHitosAssignmentTests.test_tutor_permanece_compatible_en_registro_historico](../../../../apps/postulantes/tests_assignments.py) (L830); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [ProyectoGradoHitosAssignmentTests.test_decision_rechaza_persona_duplicada_y_asignacion_de_otra_postulacion](../../../../apps/postulantes/tests_assignments.py) (L860); llamada a `AsignacionService.asignar_actor`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [AsignacionPublicaConcurrencyTest.test_solicitudes_concurrentes_no_crean_roles_incompatibles](../../../../apps/postulantes/tests_assignments.py) (L938); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_ocupacion_tutor_tribunal_se_valida_en_ambos_sentidos](../../../../apps/postulantes/tests_assignments.py) (L1003); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_candidatos_muestran_bloqueados_con_ocupacion_en_cualquier_contexto](../../../../apps/postulantes/tests_assignments.py) (L1089); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_get_muestra_ocupados_y_post_asignacion_rechaza_ocupacion_vigente](../../../../apps/postulantes/tests_assignments.py) (L1147); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_reemplazo_excluye_al_actual_muestra_ocupado_y_habilita_libre](../../../../apps/postulantes/tests_assignments.py) (L1216); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_otra_postulacion_e_historico_no_bloquean_y_finalizar_libera](../../../../apps/postulantes/tests_assignments.py) (L1246); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_reemplazo_excluye_persona_actual_y_buscador_pagina_sobre_elegibles](../../../../apps/postulantes/tests_assignments.py) (L1314); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_post_sigue_rechazando_candidato_que_dejo_de_ser_elegible](../../../../apps/postulantes/tests_assignments.py) (L1342); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_errores_de_acciones_conservan_claves_estables](../../../../apps/postulantes/tests_assignments.py) (L1405); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_estudiante_ve_solo_asignaciones_propias](../../../../apps/postulantes/tests_assignments.py) (L1443); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_docente_ve_asignaciones_donde_participa](../../../../apps/postulantes/tests_assignments.py) (L1479); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_patch_directo_rechazado_y_filtros_funcionan](../../../../apps/postulantes/tests_assignments.py) (L1503); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_contrato_canonico_filtra_postulacion_e_incluye_activas_e_historicas](../../../../apps/postulantes/tests_assignments.py) (L1542); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_contrato_canonico_filtra_activo_y_expone_tipos_reales](../../../../apps/postulantes/tests_assignments.py) (L1563); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_nombre_legible_y_aliases_estables](../../../../apps/postulantes/tests_assignments.py) (L1590); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_alcance_propietario_actor_activo_historico_y_ajeno](../../../../apps/postulantes/tests_assignments.py) (L1612); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.
- [AsignacionApiTest.test_staff_superuser_anonimo_y_get_sin_efectos](../../../../apps/postulantes/tests_assignments.py) (L1634); llamada a `AsignacionService.asignar_actor`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-004.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-004-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-004-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-004-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-004-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-004-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-004-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
