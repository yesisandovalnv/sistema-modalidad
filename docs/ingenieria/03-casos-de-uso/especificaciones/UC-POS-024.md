# UC-POS-024 — Cambiar estado general administrativamente

## Identidad y estado

- Identificador: UC-POS-024.
- Objetivo: Estado general cambiado si el servicio lo acepta.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Cambiar estado general administrativamente mediante `PATCH /api/v1/postulaciones/{id}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Estado existente y diferente; no se infieren gates adicionales ausentes. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar estado_actual y comentario.
2. Exigir administración y resolver postulación.
3. Resolver estado y rechazar cambio idéntico.
4. Guardar estado, historial y auditoría.

## Flujos alternativos

Sin estado_actual usa actualización ordinaria; no se atribuyen gates de WorkflowService a esta rama.

## Excepciones

Ámbito: `PATCH /api/v1/postulaciones/{id}/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `DRFValidationError({'estado_actual': 'El estado no existe.'})` — [PostulacionViewSet.partial_update](../../../../apps/postulantes/views.py); línea 270; método citado.
- `DRFValidationError(str(exc))` — [PostulacionViewSet.partial_update](../../../../apps/postulantes/views.py); línea 282; método citado.
- `ValueError('Se requieren datos para cambiar el estado de la postulación.')` — [PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py); línea 248; método citado.
- `ValidationError('La postulación es obligatoria.')` — [PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py); línea 257; método citado.
- `ValidationError('El estado nuevo es obligatorio.')` — [PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py); línea 259; método citado.
- `ValidationError('El usuario responsable del cambio es obligatorio.')` — [PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py); línea 261; método citado.
- `ValidationError('El estado nuevo debe ser diferente al estado actual.')` — [PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py); línea 266; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Estado general cambiado si el servicio lo acepta. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-124: PATCH con estado_actual llama cambiar_estado; no es el mismo recorrido que concluir_academicamente.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.partial_update](../../../../apps/postulantes/views.py); colaboración: [PostulacionService.cambiar_estado](../../../../apps/postulantes/services.py).
- Entidades: ENT-POS-004, ENT-POS-001, ENT-POS-002, ENT-USR-003 (Postulacion, EstadoPostulacion, HistorialEstado, AuditLog). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-024.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-024-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-024-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-024-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-024-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-024-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-024-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-024-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-024-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-024-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-024-E007 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
