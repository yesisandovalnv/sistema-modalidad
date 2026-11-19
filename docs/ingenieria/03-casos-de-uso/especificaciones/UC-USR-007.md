# UC-USR-007 — Consultar estudiantes para postulación

## Identidad y estado

- Identificador: UC-USR-007.
- Objetivo: Opciones consultadas sin crear postulación.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar estudiantes para postulación mediante `GET /api/v1/usuarios/estudiantes/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated, IsActiveUser y permiso administrativo del recurso (CanManageUsers, CanManageApplications o IsStaff según la vista). Catálogos administrativos. La protección del superusuario y el filtro de candidatos añaden restricciones específicas.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar opciones con filtros.
2. Aplicar CanManageApplications y actividad.
3. Filtrar estudiantes y ocupación condicional.
4. Devolver opciones paginadas.

## Flujos alternativos

El alias bajo auth/estudiantes representa el mismo objetivo, no un caso duplicado.

## Excepciones

Ámbito: `GET /api/v1/usuarios/estudiantes/`. La guarda de acceso es el perfil `ADMIN_ACTIVE` descrito arriba; no se deducen códigos HTTP universales.

NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.

## Postcondiciones

Opciones consultadas sin crear postulación. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-USR-107: El catálogo limita a estudiantes activos; con periodo y modalidad excluye quienes tienen postulación vigente.

Perfil documental `ADMIN_ACTIVE`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [StudentOptionViewSet.get_queryset](../../../../apps/usuarios/views.py); colaboración: [CanManageApplications.has_permission](../../../../apps/usuarios/views.py).
- Entidades: ENT-USR-002, ENT-POS-004 (CustomUser, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/usuarios/tests_students_api.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-USR-007.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-USR-007-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-USR-007-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
