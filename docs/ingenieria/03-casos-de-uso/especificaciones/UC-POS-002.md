# UC-POS-002 — Consultar postulaciones y expediente

## Identidad y estado

- Identificador: UC-POS-002.
- Objetivo: Información del expediente visible devuelta sin transición académica solicitada.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-USR-002 — Estudiante; ACT-USR-003 — Docente. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar postulaciones y expediente mediante `GET /api/v1/postulaciones/; GET /api/v1/postulaciones/{id}/; GET /api/v1/postulaciones/{id}/flujo/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

Filtro postulaciones_in_scope: administración; ESTUDIANTE propietario; DOCENTE asignado; otros roles sin alcance. Administración: todos; estudiante: propios; docente: asignados. No equivale a RELATED.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar lista, detalle o flujo.
2. Autenticar y aplicar postulaciones_in_scope.
3. Resolver la postulación visible y cargar sus relaciones.
4. Serializar el recurso o el flujo ordenado.

## Flujos alternativos

La lista puede estar vacía; un detalle fuera de alcance responde 404. La participación histórica del docente no se filtra por activo aquí.

## Excepciones

Ámbito: `GET /api/v1/postulaciones/; GET /api/v1/postulaciones/{id}/; GET /api/v1/postulaciones/{id}/flujo/`. La guarda de acceso es el perfil `COMMON` descrito arriba; no se deducen códigos HTTP universales.

NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.

## Postcondiciones

Información del expediente visible devuelta sin transición académica solicitada. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-102: El alcance común distingue administración, ESTUDIANTE propietario y DOCENTE asignado; otros roles obtienen conjunto vacío.

Perfil documental `COMMON`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionViewSet.get_queryset](../../../../apps/postulantes/views.py); colaboración: [postulaciones_in_scope](../../../../apps/postulantes/permissions.py).
- Entidades: ENT-POS-004, ENT-POS-005 (Postulacion, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/usuarios/tests_role_authority.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-002.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-002-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-002-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-002-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-002-A03 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
