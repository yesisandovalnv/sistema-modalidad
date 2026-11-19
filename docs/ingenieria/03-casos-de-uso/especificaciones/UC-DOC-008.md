# UC-DOC-008 — Administrar tipos y estados documentales

## Identidad y estado

- Identificador: UC-DOC-008.
- Objetivo: Catálogo documental mantenido conforme al método admitido.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Administrar tipos y estados documentales mediante `POST /api/v1/documentos/tipos-documento/; PUT/PATCH/DELETE /api/v1/documentos/tipos-documento/{id}/; POST /api/v1/documentos/estados-documento/; PUT/PATCH /api/v1/documentos/estados-documento/{id}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Seleccionar catálogo y variante permitida.
2. Aplicar IsAuthenticated e IsStaffOrReadOnly.
3. Validar serializer del recurso.
4. Persistir por ModelViewSet cuando el método está permitido.

## Flujos alternativos

Eliminar un estado devuelve MethodNotAllowed; las relaciones de un tipo pueden restringir su eliminación. No modifica por sí mismo la política académica.

## Excepciones

Ámbito: `POST /api/v1/documentos/tipos-documento/; PUT/PATCH/DELETE /api/v1/documentos/tipos-documento/{id}/; POST /api/v1/documentos/estados-documento/; PUT/PATCH /api/v1/documentos/estados-documento/{id}/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `MethodNotAllowed('DELETE', detail='Los estados técnicos deben desactivarse, no eliminarse.')` — [EstadoDocumentoViewSet](../../../../apps/documentos/views.py); línea 45; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Catálogo documental mantenido conforme al método admitido. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-DOC-108: La escritura exige administración; DELETE de estados documentales está prohibido expresamente, a diferencia del tipo documental.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [EstadoDocumentoViewSet](../../../../apps/documentos/views.py); colaboración: [TipoDocumentoViewSet](../../../../apps/documentos/views.py).
- Entidades: ENT-DOC-001, ENT-DOC-002 (EstadoDocumento, TipoDocumento). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/documentos/test_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-DOC-008.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-DOC-008-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-008-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-008-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-008-A03 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-DOC-008-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
