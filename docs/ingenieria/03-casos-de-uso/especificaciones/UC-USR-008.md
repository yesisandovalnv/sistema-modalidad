# UC-USR-008 — Consultar candidatos a asignación

## Identidad y estado

- Identificador: UC-USR-008.
- Objetivo: Candidatos consultados sin crear vínculos.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar candidatos a asignación mediante `GET /api/v1/usuarios/candidatos-asignacion/; GET /api/v1/postulaciones/{id}/candidatos-asignacion/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

**Variantes de permiso:** el catálogo global aplica IsAuthenticated, IsActiveUser e IsStaff. El endpoint contextual aplica la autoridad administrativa de PostulacionViewSet y filtros de política; no se le atribuye un IsActiveUser adicional no declarado.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar catálogo o consulta contextual.
2. Exigir autoridad y permisos de la vista elegida.
3. Aplicar filtros de cuentas y contexto.
4. Devolver candidatos con disponibilidad cuando corresponde.

## Flujos alternativos

El contexto de participación/etapa puede imponer restricciones adicionales; no autoriza una asignación por sí solo.

## Excepciones

Ámbito: `GET /api/v1/usuarios/candidatos-asignacion/; GET /api/v1/postulaciones/{id}/candidatos-asignacion/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('No tiene permisos para consultar candidatos de asignación.')` — [PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py); línea 582; método citado.
- `DRFValidationError({'posicion': 'La clave de posición es obligatoria.'})` — [PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py); línea 588; método citado.
- `DRFValidationError({'accion': 'La acción debe ser ASIGNAR o REEMPLAZAR.'})` — [PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py); línea 590; método citado.
- `DRFValidationError({'posicion': 'La posición no existe en la configuración vigente de esta postulación.'})` — [PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py); línea 601; método citado.
- `DRFValidationError({'accion': 'La acción no está permitida para esta posición en su contexto actual.'})` — [PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py); línea 603; método citado.
- `DRFValidationError({'posicion': 'La asignación actual ya no corresponde a esta posición.'})` — [PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py); línea 613; método citado.
- `_assignment_validation_error(exc)` — [PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py); línea 628; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Candidatos consultados sin crear vínculos. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-USR-108: El catálogo excluye estudiantes y la consulta contextual aplica ocupación; inclusión no certifica elegibilidad institucional.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [AssignmentCandidateViewSet.get_queryset](../../../../apps/usuarios/views.py); colaboración: [PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).
- Entidades: ENT-USR-002, ENT-POS-006 (CustomUser, AsignacionPostulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/usuarios/tests_assignment_candidates_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-USR-008.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-USR-008-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-USR-008-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-008-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-008-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-008-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-008-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-008-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-008-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-008-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-008-E007 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
