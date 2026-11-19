# UC-POS-014 — Registrar dictamen documental

## Identidad y estado

- Identificador: UC-POS-014.
- Objetivo: Dictamen vinculado a versión y emisor guardado.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar dictamen documental mediante `POST /api/v1/seguimientos-etapa/{id}/dictamenes-revision/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Etapa, asignación y evidencia válidas. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar tipo, resultado y versiones.
2. Exigir administración y validar payload.
3. Aplicar validación de servicio y política.
4. Devolver dictamen registrado.

## Flujos alternativos

GET de la misma acción consulta por alcance del seguimiento.

## Excepciones

Ámbito: `POST /api/v1/seguimientos-etapa/{id}/dictamenes-revision/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede registrar el dictamen.')` — [SeguimientoEtapaViewSet.dictamenes_revision](../../../../apps/postulantes/views.py); línea 833; método citado.
- `_assignment_validation_error(exc)` — [SeguimientoEtapaViewSet.dictamenes_revision](../../../../apps/postulantes/views.py); línea 841; método citado.
- `ValidationError('Se requiere un usuario administrativo activo para registrar el dictamen.')` — [DictamenRevisionDocumentoService.registrar](../../../../apps/postulantes/dictamenes_revision.py); línea 21; método citado.
- `ValidationError('Ya existe un dictamen activo para esta etapa, versión y tipo de revisión.')` — [DictamenRevisionDocumentoService.registrar](../../../../apps/postulantes/dictamenes_revision.py); línea 40; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Dictamen vinculado a versión y emisor guardado. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-114: Dictamen se atribuye a emisor y versión; el cargo tutor/tribunal no concede escritura API.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [SeguimientoEtapaViewSet.dictamenes_revision](../../../../apps/postulantes/views.py); colaboración: [DictamenRevisionDocumentoService.registrar](../../../../apps/postulantes/dictamenes_revision.py).
- Entidades: ENT-POS-015, ENT-DOC-004, ENT-POS-006, ENT-POS-005 (DictamenRevisionDocumento, VersionDocumento, AsignacionPostulacion, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_dictamen_revision.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-014.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-014-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-014-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-014-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-014-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-014-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-014-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
