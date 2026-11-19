# UC-USR-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-USR-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-USR-102 — CanManageUsers y permiso por objeto protegen cuentas superusuario frente a operadores que no son superusuarios.

Endpoint/operación del objetivo: `GET/POST /api/v1/usuarios/administracion/; GET/PUT/PATCH /api/v1/usuarios/administracion/{id}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-USR-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar listado o enviar datos de cuenta → Aplicar IsActiveUser y CanManageUsers → Validar rol, contraseña y coherencia mediante UserAdminSerializer → Consultar, crear o actualizar la cuenta con los mixins declarados.
- Comportamiento documentado: Cuenta consultada o persistida según el método; sin borrado de usuarios por esta vista.
- Regla: RN-USR-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/usuarios/views.py:UserAdminViewSet](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:UserAdminSerializer](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: GET permite filtrar por rol y actividad.
- Regla: RN-USR-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:UserAdminViewSet](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:UserAdminSerializer](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-002-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: DELETE no forma parte de los mixins de usuarios.
- Regla: RN-USR-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:UserAdminViewSet](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:UserAdminSerializer](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-002-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/usuarios/serializers.py:UserAdminSerializer L214.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError({'role_id': 'El rol debe ser ADMINISTRADOR, ADMINISTRACION, DOCENTE o ESTUDIANTE.'})
- Regla: RN-USR-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/usuarios/serializers.py:UserAdminSerializer](../../../../apps/usuarios/serializers.py).
- Contexto sintáctico de guardas: `role_code and role_code not in KNOWN_ROLE_CODES [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-002-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/usuarios/serializers.py:UserAdminSerializer L217.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError({'is_staff': 'Solo un usuario con rol ADMINISTRADOR puede tener acceso a Django Admin.'})
- Regla: RN-USR-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/usuarios/serializers.py:UserAdminSerializer](../../../../apps/usuarios/serializers.py).
- Contexto sintáctico de guardas: `role_code != ADMIN_ROLE_CODE and attrs.get('is_staff') [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-002-E003

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/usuarios/serializers.py:UserAdminSerializer L235.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError({'password': 'La contraseña inicial es obligatoria.'})
- Regla: RN-USR-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/usuarios/serializers.py:UserAdminSerializer](../../../../apps/usuarios/serializers.py).
- Contexto sintáctico de guardas: `not password [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-002-E004

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/usuarios/serializers.py:UserAdminSerializer L223.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError({'role_id': 'Un superusuario debe conservar el rol ADMINISTRADOR.'})
- Regla: RN-USR-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/usuarios/serializers.py:UserAdminSerializer](../../../../apps/usuarios/serializers.py).
- Contexto sintáctico de guardas: `self.instance and self.instance.is_superuser [then]; role_code != ADMIN_ROLE_CODE [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-002-E005

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/usuarios/serializers.py:UserAdminSerializer L225.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError({'is_staff': 'Un superusuario debe conservar el acceso a Django Admin.'})
- Regla: RN-USR-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/usuarios/serializers.py:UserAdminSerializer](../../../../apps/usuarios/serializers.py).
- Contexto sintáctico de guardas: `self.instance and self.instance.is_superuser [then]; 'is_staff' in attrs and (not attrs['is_staff']) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-002-E006

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/usuarios/serializers.py:UserAdminSerializer L227.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError({'is_active': 'Un superusuario debe conservarse activo.'})
- Regla: RN-USR-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/usuarios/serializers.py:UserAdminSerializer](../../../../apps/usuarios/serializers.py).
- Contexto sintáctico de guardas: `self.instance and self.instance.is_superuser [then]; 'is_active' in attrs and (not attrs['is_active']) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
