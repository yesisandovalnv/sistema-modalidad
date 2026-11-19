# UC-USR-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-USR-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-USR-101 — El acceso por contraseña usa authenticate; no exige autoridad administrativa para emitir JWT.

Endpoint/operación del objetivo: `POST /api/v1/auth/login/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-USR-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar username y password → Validar credenciales mediante LoginSerializer → Actualizar last_login del usuario aceptado → Emitir refresh y access mediante RefreshToken.for_user.
- Comportamiento documentado: Tokens emitidos y last_login actualizado; no se crea un usuario.
- Regla: RN-USR-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/usuarios/views.py:CustomTokenObtainPairView.post](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:LoginSerializer.validate](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: El acceso estudiantil por R.U./C.I. es un caso separado
- Regla: RN-USR-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/usuarios/views.py:CustomTokenObtainPairView.post](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:LoginSerializer.validate](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no es registro de cuentas.
- Regla: RN-USR-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/usuarios/views.py:CustomTokenObtainPairView.post](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:LoginSerializer.validate](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-001-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/usuarios/serializers.py:LoginSerializer.validate L56.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('Credenciales inválidas.')
- Regla: RN-USR-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/usuarios/serializers.py:LoginSerializer.validate](../../../../apps/usuarios/serializers.py).
- Contexto sintáctico de guardas: `not user [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-001-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/usuarios/serializers.py:LoginSerializer.validate L58.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('Usuario inactivo.')
- Regla: RN-USR-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/usuarios/serializers.py:LoginSerializer.validate](../../../../apps/usuarios/serializers.py).
- Contexto sintáctico de guardas: `not user.is_active [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
