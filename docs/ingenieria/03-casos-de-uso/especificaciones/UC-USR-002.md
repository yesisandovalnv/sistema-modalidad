# UC-USR-002 — Administrar cuentas de usuario

## Identidad y estado

- Identificador: UC-USR-002.
- Objetivo: Cuenta consultada o persistida según el método; sin borrado de usuarios por esta vista.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Administrar cuentas de usuario mediante `GET/POST /api/v1/usuarios/administracion/; GET/PUT/PATCH /api/v1/usuarios/administracion/{id}/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated, IsActiveUser y permiso administrativo del recurso (CanManageUsers, CanManageApplications o IsStaff según la vista). Catálogos administrativos. La protección del superusuario y el filtro de candidatos añaden restricciones específicas.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar listado o enviar datos de cuenta.
2. Aplicar IsActiveUser y CanManageUsers.
3. Validar rol, contraseña y coherencia mediante UserAdminSerializer.
4. Consultar, crear o actualizar la cuenta con los mixins declarados.

## Flujos alternativos

GET permite filtrar por rol y actividad. DELETE no forma parte de los mixins de usuarios.

## Excepciones

Ámbito: `GET/POST /api/v1/usuarios/administracion/; GET/PUT/PATCH /api/v1/usuarios/administracion/{id}/`. La guarda de acceso es el perfil `ADMIN_ACTIVE` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `serializers.ValidationError({'role_id': 'El rol debe ser ADMINISTRADOR, ADMINISTRACION, DOCENTE o ESTUDIANTE.'})` — [UserAdminSerializer](../../../../apps/usuarios/serializers.py); línea 214; colaborador agrupado; verificar variante.
- `serializers.ValidationError({'is_staff': 'Solo un usuario con rol ADMINISTRADOR puede tener acceso a Django Admin.'})` — [UserAdminSerializer](../../../../apps/usuarios/serializers.py); línea 217; colaborador agrupado; verificar variante.
- `serializers.ValidationError({'password': 'La contraseña inicial es obligatoria.'})` — [UserAdminSerializer](../../../../apps/usuarios/serializers.py); línea 235; colaborador agrupado; verificar variante.
- `serializers.ValidationError({'role_id': 'Un superusuario debe conservar el rol ADMINISTRADOR.'})` — [UserAdminSerializer](../../../../apps/usuarios/serializers.py); línea 223; colaborador agrupado; verificar variante.
- `serializers.ValidationError({'is_staff': 'Un superusuario debe conservar el acceso a Django Admin.'})` — [UserAdminSerializer](../../../../apps/usuarios/serializers.py); línea 225; colaborador agrupado; verificar variante.
- `serializers.ValidationError({'is_active': 'Un superusuario debe conservarse activo.'})` — [UserAdminSerializer](../../../../apps/usuarios/serializers.py); línea 227; colaborador agrupado; verificar variante.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Cuenta consultada o persistida según el método; sin borrado de usuarios por esta vista. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-USR-102: CanManageUsers y permiso por objeto protegen cuentas superusuario frente a operadores que no son superusuarios.

Perfil documental `ADMIN_ACTIVE`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [UserAdminViewSet](../../../../apps/usuarios/views.py); colaboración: [UserAdminSerializer](../../../../apps/usuarios/serializers.py).
- Entidades: ENT-USR-002, ENT-USR-001 (CustomUser, Role). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/usuarios/tests_admin_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-USR-002.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-USR-002-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-USR-002-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-002-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-USR-002-E001 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-USR-002-E002 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-USR-002-E003 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-USR-002-E004 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-USR-002-E005 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
| ESC-USR-002-E006 | CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO | NO VERIFICABLE |
