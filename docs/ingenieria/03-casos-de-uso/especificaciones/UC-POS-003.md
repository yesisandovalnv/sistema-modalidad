# UC-POS-003 — Ejecutar una transición de etapa

## Identidad y estado

- Identificador: UC-POS-003.
- Objetivo: Etapa actualizada y efectos del motor aplicados cuando la transición es válida.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Ejecutar una transición de etapa mediante `POST /api/v1/seguimientos-etapa/{id}/iniciar&#124;observar&#124;aprobar&#124;rechazar&#124;omitir/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Etapas previas, requisitos y estado editable según política y acción. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Elegir acción de etapa y enviar datos requeridos.
2. Aplicar IsWorkflowAdminOrReadOnlyOwner.
3. Resolver seguimiento y validar el serializer de la acción.
4. Invocar el método correspondiente de WorkflowService y sus validaciones de política.
5. Devolver seguimiento actualizado.

## Flujos alternativos

Iniciar no exige el mismo payload que observar o rechazar; cada acción conserva su validación. Los intentos nuevos son otro caso.

## Excepciones

Ámbito: `POST /api/v1/seguimientos-etapa/{id}/iniciar&#124;observar&#124;aprobar&#124;rechazar&#124;omitir/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `DRFValidationError(str(exc))` — [SeguimientoEtapaViewSet.aprobar](../../../../apps/postulantes/views.py); línea 1012; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Etapa actualizada y efectos del motor aplicados cuando la transición es válida. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-103: La transición depende del estado técnico y de los gates de la política, no de la visibilidad del botón.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [SeguimientoEtapaViewSet.aprobar](../../../../apps/postulantes/views.py); colaboración: [WorkflowService.aprobar_etapa](../../../../apps/postulantes/workflow.py).
- Entidades: ENT-POS-005, ENT-POS-004, ENT-POS-002 (SeguimientoEtapa, Postulacion, HistorialEstado). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_workflow.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [WorkflowServiceTest.test_acciones_rechazan_seguimiento_de_postulacion_historica](../../../../apps/postulantes/tests_workflow.py) (L244); llamada a `WorkflowService.aprobar_etapa`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [WorkflowServiceTest.test_aprobar_cierre_documental_bloquea_solo_requisitos_tecnicos](../../../../apps/postulantes/tests_workflow.py) (L320); llamada a `WorkflowService.aprobar_etapa`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [WorkflowServiceTest.test_crear_nuevo_intento_para_etapa_repetible_rechazada](../../../../apps/postulantes/tests_workflow.py) (L360); llamada a `WorkflowService.aprobar_etapa`; no acredita escenario de excepción.
- [WorkflowServiceTest.test_porcentaje_avance_no_sobrecuenta_intentos_repetidos](../../../../apps/postulantes/tests_workflow.py) (L392); llamada a `WorkflowService.aprobar_etapa`; no acredita escenario de excepción.
- [DocumentoFinalApprovalPreconditionTest.test_aprueba_etapa_si_documento_cumple_todas_las_precondiciones](../../../../apps/postulantes/tests_workflow.py) (L669); llamada a `WorkflowService.aprobar_etapa`; no acredita escenario de excepción.
- [WorkflowApiTest.test_admin_puede_crear_nuevo_intento_por_api](../../../../apps/postulantes/tests_workflow.py) (L990); llamada a `WorkflowService.aprobar_etapa`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-003.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-003-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-003-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-003-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-003-A03 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-003-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-003-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
