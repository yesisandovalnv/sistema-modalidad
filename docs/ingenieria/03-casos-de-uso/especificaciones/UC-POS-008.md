# UC-POS-008 — Concluir académicamente por el motor común

## Identidad y estado

- Identificador: UC-POS-008.
- Objetivo: Estado general CONCLUIDA si la política lo autoriza; no elimina registros.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Concluir académicamente por el motor común mediante `POST /api/v1/postulaciones/{id}/concluir-academicamente/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Gates propios de la modalidad, sin cierre técnico universal. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar solicitud de conclusión.
2. Exigir administración y resolver postulación.
3. Bloquear postulación y validar_conclusion_academica de su política.
4. Actualizar estado general e historial cuando corresponde.
5. Devolver postulación serializada.

## Flujos alternativos

Si ya está CONCLUIDA se conserva el estado sin duplicar la transición. Los endpoints de conclusión por modalidad se documentan con sus etapas propias.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/concluir-academicamente/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede concluir académicamente una postulación.')` — [PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); línea 479; método citado.
- `DRFValidationError(str(exc))` — [PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); línea 485; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Estado general CONCLUIDA si la política lo autoriza; no elimina registros. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-108: La política valida la conclusión antes de cambiar el estado general; una postulación ya concluida retorna de forma idempotente.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); colaboración: [WorkflowService.concluir_postulacion](../../../../apps/postulantes/workflow.py).
- Entidades: ENT-POS-004, ENT-POS-001, ENT-POS-002 (Postulacion, EstadoPostulacion, HistorialEstado). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_cierre.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-008.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-008-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-008-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-008-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-008-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-008-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
