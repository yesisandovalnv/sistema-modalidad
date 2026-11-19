# UC-DIP-003 — Consultar módulos y resultado de Diplomado

## Identidad y estado

- Identificador: UC-DIP-003.
- Objetivo: Vista de Diplomado devuelta.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-USR-002 — Estudiante; ACT-USR-003 — Docente. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar módulos y resultado de Diplomado mediante `GET /api/v1/postulaciones/{id}/diplomado/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

Filtro postulaciones_in_scope: administración; ESTUDIANTE propietario; DOCENTE asignado; otros roles sin alcance. Administración: todos; estudiante: propios; docente: asignados. No equivale a RELATED.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar vista específica.
2. Resolver permisos y modalidad.
3. Obtener módulos y datos derivados mediante el servicio.
4. Devolver overview.

## Flujos alternativos

La inicialización auxiliar de módulos del servicio no equivale a aprobación académica ni autoriza al lector a cargar notas.

## Excepciones

Ámbito: `GET /api/v1/postulaciones/{id}/diplomado/`. La guarda de acceso es el perfil `COMMON` descrito arriba; no se deducen códigos HTTP universales.

NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.

## Postcondiciones

Vista de Diplomado devuelta. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-DIP-103: El overview pertenece a Diplomado y se limita por alcance común.

Perfil documental `COMMON`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [DiplomadoOverviewView.get](../../../../apps/modalidades/diplomado_api.py); colaboración: [DiplomadoService.overview](../../../../apps/modalidades/diplomado_service.py).
- Entidades: ENT-MOD-004, ENT-MOD-005 (DiplomadoModulo, DiplomadoDefensa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_diplomado.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [DiplomadoTest.test_overview_expone_horas_creditos_y_modulos](../../../../apps/modalidades/tests_diplomado.py) (L923); llamada a `DiplomadoService.overview`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-DIP-003.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-DIP-003-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-DIP-003-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-DIP-003-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
