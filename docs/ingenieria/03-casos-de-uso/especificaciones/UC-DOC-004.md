# UC-DOC-004 — Marcar observación documental como corregida

## Identidad y estado

- Identificador: UC-DOC-004.
- Objetivo: Corrección marcada y requiere_correccion recalculado.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Marcar observación documental como corregida mediante `POST /api/v1/documentos/observaciones/{id}/marcar-corregida/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Seleccionar observación.
2. Aplicar permiso administrativo y resolver objeto.
3. Bloquear y marcar corrección con fecha.
4. Recalcular pendientes de la versión actual y auditar.

## Flujos alternativos

Una observación ya corregida rechaza la operación; corregir una versión histórica no inventa pendientes en la versión actual.

## Excepciones

Ámbito: `POST /api/v1/documentos/observaciones/{id}/marcar-corregida/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `DRFValidationError(str(exc))` — [ObservacionDocumentoViewSet.marcar_corregida](../../../../apps/documentos/views.py); línea 367; método citado.
- `NotFound('La observación no existe.')` — [DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py); línea 722; método citado.
- `NotFound('La observación no está activa.')` — [DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py); línea 725; método citado.
- `ValidationError('La observación ya está marcada como corregida.')` — [DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py); línea 727; método citado.
- `NotFound('La observación no está activa.')` — [DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py); línea 734; método citado.
- `ValidationError('La observación ya está marcada como corregida.')` — [DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py); línea 736; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Corrección marcada y requiere_correccion recalculado. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-DOC-104: La vista y el servicio exigen administración; ser propietario no autoriza esta escritura.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ObservacionDocumentoViewSet.marcar_corregida](../../../../apps/documentos/views.py); colaboración: [DocumentoService.marcar_observacion_corregida](../../../../apps/documentos/services.py).
- Entidades: ENT-DOC-005, ENT-DOC-004, ENT-DOC-003, ENT-USR-003 (ObservacionDocumento, VersionDocumento, DocumentoPostulacion, AuditLog). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/documentos/test_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-DOC-004.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-DOC-004-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-004-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-004-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-004-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-004-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-004-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-004-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-004-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-004-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
