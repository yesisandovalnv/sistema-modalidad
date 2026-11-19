# UC-REP-002 — Consultar dashboard institucional

## Identidad y estado

- Identificador: UC-REP-002.
- Objetivo: Indicadores consultados sin modificar expedientes.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-USR-003 — Docente. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar dashboard institucional mediante `GET /api/v1/reportes/dashboard/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y administración o rol DOCENTE en la vista de reportes. Administración global; docente asignados. ESTUDIANTE rechazado en la vista aunque ScopeService contemple propiedad.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar filtros del dashboard.
2. Exigir permiso institucional.
3. Obtener indicadores sobre queryset permitido.
4. Devolver agregados.

## Flujos alternativos

Un conjunto sin datos conserva la respuesta del servicio, sin ampliar alcance por rol.

## Excepciones

Ámbito: `GET /api/v1/reportes/dashboard/`. La guarda de acceso es el perfil `REPORT` descrito arriba; no se deducen códigos HTTP universales.

NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.

## Postcondiciones

Indicadores consultados sin modificar expedientes. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-REP-102: CanViewInstitutionalReports permite administración o DOCENTE y el servicio aplica alcance de datos.

Perfil documental `REPORT`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [DashboardView.get](../../../../apps/reportes/views.py); colaboración: [DashboardService.obtener_dashboard](../../../../apps/reportes/services.py).
- Entidades: ENT-POS-004, ENT-ACA-002 (Postulacion, Modalidad). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/reportes/tests_dashboard.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-REP-002.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-REP-002-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-REP-002-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
