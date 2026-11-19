# UC-DOC-003 — Consultar documentos y descargar versiones

## Identidad y estado

- Identificador: UC-DOC-003.
- Objetivo: Documentación consultada o descargada sin cambiar revisión.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-POS-001 — Propietario de postulación; ACT-POS-002 — Usuario vinculado al expediente. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar documentos y descargar versiones mediante `GET /api/v1/documentos/documentos/; GET /api/v1/documentos/documentos/{id}/versiones/; GET /api/v1/documentos/versiones/{id}/descargar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y queryset por administración, propietario o asignación. En estas consultas el vínculo no exige rol DOCENTE. Solo expedientes relacionados; el queryset concreto decide el tratamiento de asignaciones históricas.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar documentos, versiones o descarga.
2. Aplicar queryset y filtros de publicación.
3. Resolver versión y comprobar archivo si se descarga.
4. Devolver metadatos o archivo con nombre saneado.

## Flujos alternativos

Archivo ausente devuelve 404. No se ofrecen todas las versiones de un memorando a un lector relacionado.

## Excepciones

Ámbito: `GET /api/v1/documentos/documentos/; GET /api/v1/documentos/documentos/{id}/versiones/; GET /api/v1/documentos/versiones/{id}/descargar/`. La guarda de acceso es el perfil `RELATED` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `Http404('El archivo de esta versión no está disponible.')` — [VersionDocumentoViewSet.descargar](../../../../apps/documentos/views.py); línea 309; método citado.
- `Http404('El archivo de esta versión no está disponible.')` — [VersionDocumentoViewSet.descargar](../../../../apps/documentos/views.py); línea 314; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Documentación consultada o descargada sin cambiar revisión. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-DOC-103: El alcance documental admite propiedad/asignación; memorandos restringen visibilidad a publicaciones vigentes para no administradores.

Perfil documental `RELATED`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [VersionDocumentoViewSet.descargar](../../../../apps/documentos/views.py); colaboración: [DocumentoPostulacionViewSet.get_queryset](../../../../apps/documentos/views.py).
- Entidades: ENT-DOC-003, ENT-DOC-004, ENT-DOC-005 (DocumentoPostulacion, VersionDocumento, ObservacionDocumento). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/documentos/test_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-DOC-003.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-DOC-003-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-003-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-003-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-003-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-003-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
