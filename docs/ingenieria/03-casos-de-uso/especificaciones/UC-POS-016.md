# UC-POS-016 — Consultar asignaciones e historial de cargos

## Identidad y estado

- Identificador: UC-POS-016.
- Objetivo: Asignaciones consultadas sin cambiar vigencia.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-POS-001 — Propietario de postulación; ACT-POS-002 — Usuario vinculado al expediente. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar asignaciones e historial de cargos mediante `GET /api/v1/asignaciones/; GET /api/v1/asignaciones/{id}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y queryset por administración, propietario o asignación. En estas consultas el vínculo no exige rol DOCENTE. Solo expedientes relacionados; el queryset concreto decide el tratamiento de asignaciones históricas.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar asignaciones con postulación y filtros.
2. Aplicar autenticación y alcance relacionado.
3. Serializar asignaciones activas e históricas.
4. Devolver resultado paginado.

## Flujos alternativos

Los alias contextuales de postulación conservan su helper específico; no se unifican sus permisos por analogía.

## Excepciones

Ámbito: `GET /api/v1/asignaciones/; GET /api/v1/asignaciones/{id}/`. La guarda de acceso es el perfil `RELATED` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `_assignment_validation_error(exc)` — [AsignacionPostulacionViewSet](../../../../apps/postulantes/views.py); línea 1132; colaborador agrupado; verificar variante.
- `_assignment_validation_error(exc)` — [AsignacionPostulacionViewSet](../../../../apps/postulantes/views.py); línea 1150; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Asignaciones consultadas sin cambiar vigencia. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-116: La consulta canónica usa all_objects y mantiene vínculos históricos en el alcance.

Perfil documental `RELATED`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [AsignacionPostulacionViewSet.get_queryset](../../../../apps/postulantes/views.py); colaboración: [AsignacionPostulacionViewSet](../../../../apps/postulantes/views.py).
- Entidades: ENT-POS-006, ENT-POS-004 (AsignacionPostulacion, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_assignments.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-016.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-016-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-016-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-016-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-016-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-POS-016-E002 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
