# UC-POS-027 — Consultar condiciones y entregas

## Identidad y estado

- Identificador: UC-POS-027.
- Objetivo: Gestión complementaria consultada.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-POS-001 — Propietario de postulación; ACT-POS-002 — Usuario vinculado al expediente. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar condiciones y entregas mediante `GET /api/v1/gestion-complementaria/condiciones/; GET /api/v1/gestion-complementaria/entregas-fisicas/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y queryset por administración, propietario o asignación. En estas consultas el vínculo no exige rol DOCENTE. Solo expedientes relacionados; el queryset concreto decide el tratamiento de asignaciones históricas.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar controles con filtros.
2. Autenticar y acotar queryset.
3. Filtrar estado o pendientes/completadas.
4. Devolver recursos visibles.

## Flujos alternativos

Un listado vacío no crea ni verifica controles.

## Excepciones

Ámbito: `GET /api/v1/gestion-complementaria/condiciones/; GET /api/v1/gestion-complementaria/entregas-fisicas/`. La guarda de acceso es el perfil `RELATED` descrito arriba; no se deducen códigos HTTP universales.

NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.

## Postcondiciones

Gestión complementaria consultada. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-127: La lectura admite propiedad/asignación; http_method_names excluye PUT, PATCH y DELETE.

Perfil documental `RELATED`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [RelatedViewSet.get_queryset](../../../../apps/postulantes/complementarios_api.py); colaboración: [CondicionViewSet](../../../../apps/postulantes/complementarios_api.py).
- Entidades: ENT-POS-010, ENT-POS-011, ENT-POS-004 (CondicionPostulacion, EntregaFisica, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_complementarios.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-027.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-027-P01 | PRINCIPAL | COBERTURA PARCIAL |
| ESC-POS-027-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-027-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
