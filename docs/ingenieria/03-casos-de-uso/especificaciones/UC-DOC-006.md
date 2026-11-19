# UC-DOC-006 — Adjuntar evidencia a un registro histórico

## Identidad y estado

- Identificador: UC-DOC-006.
- Objetivo: Evidencia asociada al registro histórico.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Adjuntar evidencia a un registro histórico mediante `GET /api/v1/postulaciones/{id}/documentos-historicos/tipos/; POST /api/v1/postulaciones/{id}/documentos-historicos/subir/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Registro HISTORICO y tipo de evidencia admitido. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Consultar tipos históricos admitidos.
2. Enviar evidencia con administración.
3. Validar tipo y registro histórico.
4. Guardar evidencia con el servicio histórico y devolver versión.

## Flujos alternativos

Una postulación ordinaria no se convierte en histórica para evitar requisitos de carga.

## Excepciones

Ámbito: `GET /api/v1/postulaciones/{id}/documentos-historicos/tipos/; POST /api/v1/postulaciones/{id}/documentos-historicos/subir/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `DRFValidationError({'tipo_documento_id': 'El tipo de documento no existe o no está activo.'})` — [PostulacionViewSet.subir_documento_historico](../../../../apps/postulantes/views.py); línea 460; método citado.
- `DRFValidationError(str(exc))` — [PostulacionViewSet.subir_documento_historico](../../../../apps/postulantes/views.py); línea 471; método citado.
- `ValidationError('La ruta histórica solo admite postulaciones HISTORICO.')` — [DocumentoService.subir_documento_historico](../../../../apps/documentos/services.py); línea 342; método citado.
- `NotFound('El tipo de documento no existe o no está activo.')` — [DocumentoService.subir_documento_historico](../../../../apps/documentos/services.py); línea 345; método citado.
- `ValidationError('El tipo de documento no está permitido para la modalidad histórica.')` — [DocumentoService.subir_documento_historico](../../../../apps/documentos/services.py); línea 350; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Evidencia asociada al registro histórico. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-DOC-106: La carga histórica tiene contrato específico y no debe simular el workflow ordinario.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.subir_documento_historico](../../../../apps/postulantes/views.py); colaboración: [DocumentoService.subir_documento_historico](../../../../apps/documentos/services.py).
- Entidades: ENT-POS-004, ENT-DOC-003, ENT-DOC-004 (Postulacion, DocumentoPostulacion, VersionDocumento). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_us007.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-DOC-006.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-DOC-006-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-006-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-006-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-006-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-006-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-006-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-006-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
