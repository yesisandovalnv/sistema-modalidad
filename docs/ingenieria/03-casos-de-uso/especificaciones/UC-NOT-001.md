# UC-NOT-001 — Consultar notificaciones propias

## Identidad y estado

- Identificador: UC-NOT-001.
- Objetivo: Notificaciones propias consultadas sin cambiar lectura.
- Actor principal: ACT-SYS-002 — Usuario autenticado. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar notificaciones propias mediante `GET /api/v1/notificaciones/; GET /api/v1/notificaciones/{id}/; GET /api/v1/notificaciones/no-leidas/count/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated; no se presume un IsActiveUser adicional. Catálogos autenticados o notificaciones propias; no concede acceso universal a expedientes.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar lista, detalle o contador.
2. Autenticar al usuario.
3. Filtrar notificaciones por destinatario y filtros admitidos.
4. Devolver lista paginada, detalle o número de no leídas.

## Flujos alternativos

Detalle ajeno devuelve 404; la lista vacía es válida. No hay correo, push ni borrado por esta API.

## Excepciones

Ámbito: `GET /api/v1/notificaciones/; GET /api/v1/notificaciones/{id}/; GET /api/v1/notificaciones/no-leidas/count/`. La guarda de acceso es el perfil `AUTH` descrito arriba; no se deducen códigos HTTP universales.

NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.

## Postcondiciones

Notificaciones propias consultadas sin cambiar lectura. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-NOT-101: El destinatario determina el alcance de consulta, aunque la interfaz no muestre la capacidad al rol.

Perfil documental `AUTH`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [NotificacionViewSet.get_queryset](../../../../apps/notificaciones/views.py); colaboración: [NotificationService.listar_usuario](../../../../apps/notificaciones/services.py).
- Entidades: ENT-NOT-001 (Notificacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/notificaciones/tests_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-NOT-001.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-NOT-001-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-NOT-001-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-NOT-001-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-NOT-001-A03 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
