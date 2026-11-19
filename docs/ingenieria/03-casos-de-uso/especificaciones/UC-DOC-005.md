# UC-DOC-005 — Registrar confirmación técnica entre versiones

## Identidad y estado

- Identificador: UC-DOC-005.
- Objetivo: Confirmación técnica y auditoría guardadas.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar confirmación técnica entre versiones mediante `POST /api/v1/documentos/confirmaciones-correccion/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

**Superficie heredada pendiente:** el ModelViewSet también expone actualización y eliminación; no se afirma que reproduzcan las validaciones de create. Deben caracterizarse antes de documentarlas como flujos equivalentes.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Versiones del mismo documento, corregida posterior y contexto válido según política. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar versiones, contexto y asignación confirmante.
2. Exigir administración y validar serializer.
3. Construir confirmación con confirmado_por=request.user.
4. Ejecutar full_clean, validación de política y auditoría.

## Flujos alternativos

PUT/PATCH/DELETE están heredados del ModelViewSet y no pasan por este método create; se registran como superficie pendiente de caracterización, no se ejecutan.

## Excepciones

Ámbito: `POST /api/v1/documentos/confirmaciones-correccion/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `DRFValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)` — [ConfirmacionCorreccionDocumentoViewSet.create](../../../../apps/documentos/views.py); línea 389; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Confirmación técnica y auditoría guardadas. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-DOC-105: La confirmación exige coherencia de versiones, postulación, evento y asignación, más validación de política.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ConfirmacionCorreccionDocumentoViewSet.create](../../../../apps/documentos/views.py); colaboración: [ConfirmacionCorreccionDocumentoService.registrar](../../../../apps/documentos/services.py).
- Entidades: ENT-DOC-006, ENT-DOC-004, ENT-POS-006 (ConfirmacionCorreccionDocumento, VersionDocumento, AsignacionPostulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/documentos/test_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-DOC-005.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-DOC-005-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-005-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-005-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-DOC-005-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
