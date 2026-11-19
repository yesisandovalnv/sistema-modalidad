# UC-DOC-002 — Revisar un documento presentado

## Identidad y estado

- Identificador: UC-DOC-002.
- Objetivo: Estado o registro de observación actualizado y auditado por el servicio.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Revisar un documento presentado mediante `POST /api/v1/documentos/documentos/{id}/aprobar&#124;rechazar&#124;observar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Documento y postulación editables; versión vigente y observaciones según acción. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Elegir la revisión y enviar comentario o motivo requerido.
2. Resolver el documento visible y validar payload.
3. Aplicar el método de revisión de DocumentoService.
4. Validar versión, observaciones y estado permitidos.
5. Devolver documento u observación generada.

## Flujos alternativos

Observar devuelve una observación; rechazar exige motivo. Una aprobación no salta automáticamente todas las etapas académicas.

## Excepciones

Ámbito: `POST /api/v1/documentos/documentos/{id}/aprobar&#124;rechazar&#124;observar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `DRFValidationError(str(exc))` — [DocumentoPostulacionViewSet.aprobar](../../../../apps/documentos/views.py); línea 195; método citado.
- `ValidationError('La versión actual tiene observaciones pendientes.')` — [DocumentoService.aprobar_documento](../../../../apps/documentos/services.py); línea 529; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Estado o registro de observación actualizado y auditado por el servicio. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-DOC-102: Las operaciones de revisión verifican autoridad administrativa en el servicio; aprobación, rechazo y observación tienen controles distintos.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [DocumentoPostulacionViewSet.aprobar](../../../../apps/documentos/views.py); colaboración: [DocumentoService.aprobar_documento](../../../../apps/documentos/services.py).
- Entidades: ENT-DOC-003, ENT-DOC-004, ENT-DOC-005 (DocumentoPostulacion, VersionDocumento, ObservacionDocumento). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/documentos/test_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-DOC-002.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-DOC-002-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-002-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-002-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-002-A03 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-002-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-002-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
