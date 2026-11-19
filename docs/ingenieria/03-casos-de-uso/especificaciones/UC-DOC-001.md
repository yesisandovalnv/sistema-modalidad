# UC-DOC-001 — Cargar un documento o una nueva versión

## Identidad y estado

- Identificador: UC-DOC-001.
- Objetivo: Versión registrada y estados documentales aplicados según contexto.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-POS-001 — Propietario de postulación. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Cargar un documento o una nueva versión mediante `POST /api/v1/documentos/documentos/subir/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

Administración o propietario; la asignación sola no permite esta escritura. Solo expediente propio o administración, sujeto a política documental y etapa.

Política y contexto documental, extensión, tamaño, firma PDF y permisos de carga. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar postulación, tipo, archivo y evento cuando corresponda.
2. Validar payload y resolver referencias.
3. Comprobar actor, aplicabilidad, estado y archivo en DocumentoService.
4. Crear documento o versión y actualizar la versión vigente transaccionalmente.
5. Devolver VersionDocumentoSerializer.

## Flujos alternativos

Nueva versión y autoaprobaciones administrativas siguen condiciones del servicio; no toda carga queda aprobada. Histórico usa una acción separada.

## Excepciones

Ámbito: `POST /api/v1/documentos/documentos/subir/`. La guarda de acceso es el perfil `OWNER_ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `DRFValidationError({'postulacion_id': 'La postulación no existe.'})` — [DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py); línea 131; método citado.
- `DRFValidationError({'tipo_documento_id': 'El tipo de documento no existe.'})` — [DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py); línea 135; método citado.
- `DRFValidationError({'evento_defensa_id': 'El evento de defensa no existe.'})` — [DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py); línea 140; método citado.
- `DRFValidationError(str(exc))` — [DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py); línea 152; método citado.
- `NotFound('El tipo de documento no existe o no está activo.')` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 174; método citado.
- `PermissionDenied('El usuario no tiene permisos para subir este documento.')` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 179; método citado.
- `PermissionDenied('La hoja de observaciones de Defensa de Perfil solo puede cargarla un usuario administrativo.')` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 181; método citado.
- `ValidationError(capacidad_carga['mensaje'])` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 241; método citado.
- `ValidationError('La modalidad no admite vincular documentos a eventos.')` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 230; método citado.
- `ValidationError('La modalidad no tiene una policy académica configurada para cargar documentos.')` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 232; método citado.
- `PermissionDenied(capacidad_carga['mensaje'])` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 240; método citado.
- `ValidationError('La hoja de observaciones ya está vinculada a otra Defensa de Perfil.')` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 258; método citado.
- `ValidationError('No se puede cargar un documento ordinario sin un contexto académico válido.')` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 215; método citado.
- `ValidationError(f"El tipo '{tipo_documento.nombre}' no puede cargarse en la etapa '{etapa_actual_codigo}'. Tipos permitidos: {', '.join(documentos_permitidos) or 'ninguno'}.")` — [DocumentoService.subir_documento](../../../../apps/documentos/services.py); línea 225; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Versión registrada y estados documentales aplicados según contexto. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-DOC-101: Solo administración o propietario pueden cargar, sujetos a actores documentales, contexto y estado; una asignación no basta.

Perfil documental `OWNER_ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py); colaboración: [DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Entidades: ENT-DOC-003, ENT-DOC-004, ENT-DOC-002, ENT-USR-003 (DocumentoPostulacion, VersionDocumento, TipoDocumento, AuditLog). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/documentos/test_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-DOC-001.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-DOC-001-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-A03 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-DOC-001-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E007 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E008 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E009 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E010 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E011 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E012 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E013 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-001-E014 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
