# UC-USR-006 — Administrar roles

## Identidad y estado

- Identificador: UC-USR-006.
- Objetivo: Catálogo gestionado sin cambiar políticas académicas.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Administrar roles mediante `GET/POST /api/v1/usuarios/roles/; GET/PUT/PATCH/DELETE /api/v1/usuarios/roles/{id}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated, IsActiveUser y permiso administrativo del recurso (CanManageUsers, CanManageApplications o IsStaff según la vista). Catálogos administrativos. La protección del superusuario y el filtro de candidatos añaden restricciones específicas.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar operación de rol.
2. Comprobar permiso administrativo y actividad.
3. Validar RoleAdminSerializer.
4. Consultar o persistir mediante ViewSet.

## Flujos alternativos

Si el rol está en uso, perform_destroy convierte ProtectedError en validación; se propone inactivarlo.

## Excepciones

Ámbito: `GET/POST /api/v1/usuarios/roles/; GET/PUT/PATCH/DELETE /api/v1/usuarios/roles/{id}/`. La guarda de acceso es el perfil `ADMIN_ACTIVE` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError('No se puede eliminar un rol asignado a usuarios; inactívelo en su lugar.')` — [RoleAdminViewSet](../../../../apps/usuarios/views.py); línea 166; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Catálogo gestionado sin cambiar políticas académicas. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-USR-106: CanManageUsers protege el catálogo y ProtectedError impide eliminar roles referenciados.

Perfil documental `ADMIN_ACTIVE`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [RoleAdminViewSet](../../../../apps/usuarios/views.py); colaboración: [RoleAdminSerializer](../../../../apps/usuarios/serializers.py).
- Entidades: ENT-USR-001, ENT-USR-002 (Role, CustomUser). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/usuarios/tests_admin_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-USR-006.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-USR-006-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-USR-006-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-006-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-006-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
