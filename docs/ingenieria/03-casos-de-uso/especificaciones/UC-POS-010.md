# UC-POS-010 — Consultar historial y observaciones

## Identidad y estado

- Identificador: UC-POS-010.
- Objetivo: Trazabilidad consultada.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-POS-001 — Propietario de postulación; ACT-POS-002 — Usuario vinculado al expediente. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar historial y observaciones mediante `GET /api/v1/postulaciones/historial/; GET /api/v1/postulaciones/observaciones/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y queryset por administración, propietario o asignación. En estas consultas el vínculo no exige rol DOCENTE. Solo expedientes relacionados; el queryset concreto decide el tratamiento de asignaciones históricas.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar historial u observaciones.
2. Autenticar y filtrar recursos relacionados.
3. Aplicar búsqueda y orden admitidos.
4. Devolver registros visibles.

## Flujos alternativos

Una lista vacía no revela datos ajenos. Registrar observaciones es otro objetivo administrativo.

## Excepciones

Ámbito: `GET /api/v1/postulaciones/historial/; GET /api/v1/postulaciones/observaciones/`. La guarda de acceso es el perfil `RELATED` descrito arriba; no se deducen códigos HTTP universales.

NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.

## Postcondiciones

Trazabilidad consultada. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-110: Ambos querysets acotan por propiedad o asignación; el historial no admite CRUD de escritura.

Perfil documental `RELATED`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [HistorialEstadoViewSet.get_queryset](../../../../apps/postulantes/views.py); colaboración: [ObservacionViewSet.get_queryset](../../../../apps/postulantes/views.py).
- Entidades: ENT-POS-002, ENT-POS-003, ENT-POS-004 (HistorialEstado, Observacion, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_security_contract.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-010.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-010-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-010-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-010-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
