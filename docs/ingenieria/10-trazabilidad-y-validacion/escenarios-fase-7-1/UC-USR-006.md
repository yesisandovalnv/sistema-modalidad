# UC-USR-006 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-USR-006.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-USR-106 — CanManageUsers protege el catálogo y ProtectedError impide eliminar roles referenciados.

Endpoint/operación del objetivo: `GET/POST /api/v1/usuarios/roles/; GET/PUT/PATCH/DELETE /api/v1/usuarios/roles/{id}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-USR-006-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar operación de rol → Comprobar permiso administrativo y actividad → Validar RoleAdminSerializer → Consultar o persistir mediante ViewSet.
- Comportamiento documentado: Catálogo gestionado sin cambiar políticas académicas.
- Regla: RN-USR-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/usuarios/views.py:RoleAdminViewSet](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:RoleAdminSerializer](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-006-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Si el rol está en uso, perform_destroy convierte ProtectedError en validación
- Regla: RN-USR-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:RoleAdminViewSet](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:RoleAdminSerializer](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-006-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: se propone inactivarlo.
- Regla: RN-USR-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:RoleAdminViewSet](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:RoleAdminSerializer](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-006-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/usuarios/views.py:RoleAdminViewSet L166.
- Comportamiento documentado: Rechazo declarado: ValidationError('No se puede eliminar un rol asignado a usuarios; inactívelo en su lugar.')
- Regla: RN-USR-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/usuarios/views.py:RoleAdminViewSet](../../../../apps/usuarios/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
