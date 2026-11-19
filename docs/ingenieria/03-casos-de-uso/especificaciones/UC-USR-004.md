# UC-USR-004 — Cerrar sesión

## Identidad y estado

- Identificador: UC-USR-004.
- Objetivo: Refresh recibido revocado si fue válido.
- Actor principal: ACT-SYS-002 — Usuario autenticado. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Cerrar sesión mediante `POST /api/v1/auth/logout/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated e IsActiveUser en la vista. Cuenta de la sesión; no habilita otras cuentas.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar refresh con sesión aceptada.
2. Aplicar IsAuthenticated e IsActiveUser.
3. Añadir el refresh a blacklist.
4. Devolver mensaje de cierre.

## Flujos alternativos

Una excepción de procesamiento del token devuelve 400. No se observa aquí contraste explícito de propietario del refresh con request.user.

## Excepciones

Ámbito: `POST /api/v1/auth/logout/`. La guarda de acceso es el perfil `AUTH_ACTIVE` descrito arriba; no se deducen códigos HTTP universales.

NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.

## Postcondiciones

Refresh recibido revocado si fue válido. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-USR-104: La operación revoca el refresh recibido, no todos los access ya emitidos.

Perfil documental `AUTH_ACTIVE`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [LogoutView.post](../../../../apps/usuarios/views.py); colaboración: [LogoutSerializer](../../../../apps/usuarios/serializers.py).
- Entidades: ENT-USR-002 (CustomUser). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/usuarios/tests_contract.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-USR-004.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-USR-004-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-USR-004-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-004-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
