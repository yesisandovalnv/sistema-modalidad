# UC-POS-012 — Inicializar el flujo

## Identidad y estado

- Identificador: UC-POS-012.
- Objetivo: Seguimientos inicializados o conservados por el motor.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Inicializar el flujo mediante `POST /api/v1/postulaciones/{id}/flujo/inicializar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Etapas activas y política aplicable. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar inicialización.
2. Exigir administración y resolver postulación.
3. Invocar orquestador o WorkflowService según código.
4. Devolver seguimientos ordenados.

## Flujos alternativos

Configuración sin etapas o postulación no operativa rechaza la inicialización.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/flujo/inicializar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('No tiene permisos para inicializar el flujo.')` — [PostulacionViewSet.inicializar_flujo](../../../../apps/postulantes/views.py); línea 492; método citado.
- `DRFValidationError(str(exc))` — [PostulacionViewSet.inicializar_flujo](../../../../apps/postulantes/views.py); línea 503; método citado.
- `ValidationError('La modalidad no tiene etapas activas configuradas.')` — [WorkflowService.inicializar_flujo](../../../../apps/postulantes/workflow.py); línea 35; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Seguimientos inicializados o conservados por el motor. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-112: Esta acción usa el orquestador de Proyecto o el motor genérico; no es idéntica a todas las ramas de create.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.inicializar_flujo](../../../../apps/postulantes/views.py); colaboración: [WorkflowService.inicializar_flujo](../../../../apps/postulantes/workflow.py).
- Entidades: ENT-POS-005, ENT-POS-004, ENT-ACA-004 (SeguimientoEtapa, Postulacion, EtapaModalidad). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_workflow.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [WorkflowServiceTest.test_inicializar_flujo_crea_etapas_pendientes_e_idempotente](../../../../apps/postulantes/tests_workflow.py) (L217); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowServiceTest.test_workflow_rechaza_postulacion_historica](../../../../apps/postulantes/tests_workflow.py) (L236); llamada a `WorkflowService.inicializar_flujo`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [WorkflowServiceTest.test_inicializar_flujo_falla_si_modalidad_no_tiene_etapas](../../../../apps/postulantes/tests_workflow.py) (L265); llamada a `WorkflowService.inicializar_flujo`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [WorkflowServiceTest.test_iniciar_etapa_actualiza_estado_general_e_historial](../../../../apps/postulantes/tests_workflow.py) (L285); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowServiceTest.test_no_permite_iniciar_si_hay_etapas_obligatorias_previas_sin_aprobar](../../../../apps/postulantes/tests_workflow.py) (L302); llamada a `WorkflowService.inicializar_flujo`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [WorkflowServiceTest.test_observar_etapa_exige_observaciones](../../../../apps/postulantes/tests_workflow.py) (L313); llamada a `WorkflowService.inicializar_flujo`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [WorkflowServiceTest.test_aprobar_cierre_documental_bloquea_solo_requisitos_tecnicos](../../../../apps/postulantes/tests_workflow.py) (L320); llamada a `WorkflowService.inicializar_flujo`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [WorkflowServiceTest.test_no_permite_omitir_etapa_obligatoria](../../../../apps/postulantes/tests_workflow.py) (L354); llamada a `WorkflowService.inicializar_flujo`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [WorkflowServiceTest.test_crear_nuevo_intento_para_etapa_repetible_rechazada](../../../../apps/postulantes/tests_workflow.py) (L360); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowServiceTest.test_porcentaje_avance_no_sobrecuenta_intentos_repetidos](../../../../apps/postulantes/tests_workflow.py) (L392); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowServiceTest.test_conteo_progreso_comparte_semantica_con_porcentaje](../../../../apps/postulantes/tests_workflow.py) (L426); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowServiceTest.test_conteo_progreso_desde_ninguna_hasta_todas_las_obligatorias](../../../../apps/postulantes/tests_workflow.py) (L457); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_listado_filtra_modalidad_estado_etapa_y_periodo](../../../../apps/postulantes/tests_workflow.py) (L712); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_listado_combina_filtros_y_sin_filtros_conserva_compatibilidad](../../../../apps/postulantes/tests_workflow.py) (L731); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_filtros_no_amplian_el_alcance_del_usuario](../../../../apps/postulantes/tests_workflow.py) (L792); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_serializer_expone_capacidades_reales_por_estado](../../../../apps/postulantes/tests_workflow.py) (L800); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_serializer_no_expone_capacidades_operativas_a_usuario_no_admin](../../../../apps/postulantes/tests_workflow.py) (L819); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_listado_de_seguimiento_expone_datos_humanos_y_conserva_contrato](../../../../apps/postulantes/tests_workflow.py) (L828); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_admin_aprueba_etapa_en_proceso_por_api](../../../../apps/postulantes/tests_workflow.py) (L864); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_admin_rechaza_etapa_en_proceso_por_api](../../../../apps/postulantes/tests_workflow.py) (L882); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_admin_observa_y_luego_aprueba_etapa_por_api](../../../../apps/postulantes/tests_workflow.py) (L899); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_omitir_etapa_obligatoria_por_api_conserva_regla_de_negocio](../../../../apps/postulantes/tests_workflow.py) (L923); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_usuario_no_staff_recibe_403_en_acciones_de_seguimiento](../../../../apps/postulantes/tests_workflow.py) (L938); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_estudiante_puede_ver_su_flujo](../../../../apps/postulantes/tests_workflow.py) (L951); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_estudiante_no_puede_ver_flujo_ajeno](../../../../apps/postulantes/tests_workflow.py) (L961); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_admin_puede_crear_nuevo_intento_por_api](../../../../apps/postulantes/tests_workflow.py) (L990); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_estudiante_no_puede_ejecutar_acciones_operativas](../../../../apps/postulantes/tests_workflow.py) (L1018); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_endpoints_de_flujo_requieren_autenticacion](../../../../apps/postulantes/tests_workflow.py) (L1034); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.
- [WorkflowApiTest.test_patch_directo_sobre_seguimiento_no_esta_permitido](../../../../apps/postulantes/tests_workflow.py) (L1048); llamada a `WorkflowService.inicializar_flujo`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-012.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-012-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-012-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-012-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-012-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-012-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-012-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
