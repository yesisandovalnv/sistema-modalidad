# UC-TD-004 — Consultar expediente específico de Trabajo Dirigido

## Identidad y estado

- Identificador: UC-TD-004.
- Objetivo: Información específica consultada.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-USR-002 — Estudiante; ACT-USR-003 — Docente. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar expediente específico de Trabajo Dirigido mediante `GET /api/v1/postulaciones/{id}/trabajo-dirigido/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

Filtro postulaciones_in_scope: administración; ESTUDIANTE propietario; DOCENTE asignado; otros roles sin alcance. Administración: todos; estudiante: propios; docente: asignados. No equivale a RELATED.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar vista específica.
2. Aplicar alcance común y vínculo.
3. Resolver datos institucionales e informes.
4. Devolver overview del servicio.

## Flujos alternativos

Postulación fuera de alcance o modalidad incorrecta no se presenta como un expediente válido.

## Excepciones

Ámbito: `GET /api/v1/postulaciones/{id}/trabajo-dirigido/`. La guarda de acceso es el perfil `COMMON` descrito arriba; no se deducen códigos HTTP universales.

NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.

## Postcondiciones

Información específica consultada. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-TD-104: La consulta pasa por get_postulacion_in_scope y la validación de modalidad del servicio.

Perfil documental `COMMON`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [TrabajoDirigidoOverviewView.get](../../../../apps/modalidades/trabajo_dirigido_api.py); colaboración: [TrabajoDirigidoService.overview](../../../../apps/modalidades/trabajo_dirigido_service.py).
- Entidades: ENT-MOD-006, ENT-MOD-007 (TrabajoDirigidoExpediente, InformeSeguimientoTrabajoDirigido). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_trabajo_dirigido.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [TrabajoDirigidoTest.test_desarrollo_exige_institucion_e_informe_periodico](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1251); llamada a `TrabajoDirigidoService.overview`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-TD-004.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-TD-004-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-TD-004-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-004-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
