# UC-POS-013 — Crear un nuevo intento de etapa

## Identidad y estado

- Identificador: UC-POS-013.
- Objetivo: Intento nuevo registrado si es admisible.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Crear un nuevo intento de etapa mediante `POST /api/v1/postulaciones/{id}/etapas/{etapa_id}/nuevo-intento/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Estado previo y repetición elegibles según política. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Seleccionar etapa activa.
2. Exigir administración y resolver contexto.
3. Validar repetición y límites.
4. Crear y devolver nuevo seguimiento.

## Flujos alternativos

Etapa inexistente o límite alcanzado rechaza; no hay máximo universal.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/etapas/{etapa_id}/nuevo-intento/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('No tiene permisos para crear un nuevo intento.')` — [PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py); línea 519; método citado.
- `DRFValidationError({'etapa_id': 'La etapa no existe.'})` — [PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py); línea 524; método citado.
- `DRFValidationError(str(exc))` — [PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py); línea 529; método citado.
- `ValidationError('La etapa es obligatoria.')` — [WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py); línea 221; método citado.
- `ValidationError('La etapa no pertenece a la modalidad de la postulacion.')` — [WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py); línea 228; método citado.
- `ValidationError('La etapa no permite crear un nuevo intento.')` — [WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py); línea 230; método citado.
- `ValidationError('La etapa aun no fue inicializada para esta postulacion.')` — [WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py); línea 238; método citado.
- `ValidationError('Solo se puede crear un nuevo intento a partir de una etapa rechazada.')` — [WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py); línea 242; método citado.
- `ValidationError('Ya existe un seguimiento para ese intento.')` — [WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py); línea 256; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Intento nuevo registrado si es admisible. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-113: La elegibilidad de repetición e intentos corresponde a la política de la modalidad.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.nuevo_intento](../../../../apps/postulantes/views.py); colaboración: [WorkflowService.crear_nuevo_intento](../../../../apps/postulantes/workflow.py).
- Entidades: ENT-POS-005, ENT-ACA-004, ENT-POS-004 (SeguimientoEtapa, EtapaModalidad, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_workflow.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [WorkflowServiceTest.test_crear_nuevo_intento_para_etapa_repetible_rechazada](../../../../apps/postulantes/tests_workflow.py) (L360); llamada a `WorkflowService.crear_nuevo_intento`; no acredita escenario de excepción.
- [WorkflowServiceTest.test_porcentaje_avance_no_sobrecuenta_intentos_repetidos](../../../../apps/postulantes/tests_workflow.py) (L392); llamada a `WorkflowService.crear_nuevo_intento`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-013.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-013-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-013-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-E007 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-E008 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-013-E009 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
