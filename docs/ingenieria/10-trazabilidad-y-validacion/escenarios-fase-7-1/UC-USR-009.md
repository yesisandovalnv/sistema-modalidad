# UC-USR-009 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-USR-009.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-USR-109 — Requiere cuenta estudiantil existente, activa y no staff/superusuario; controla intentos por cuenta y origen.

Endpoint/operación del objetivo: `POST /api/v1/auth/student-login/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-USR-009-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar ru y ci → Normalizar identificadores y comprobar contadores → Resolver cuenta inequívoca y comparar C.I. → Emitir JWT o contabilizar rechazo.
- Comportamiento documentado: Tokens emitidos y last_login actualizado, o rechazo registrado.
- Regla: RN-USR-109; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/usuarios/views.py:StudentTokenObtainPairView.post](../../../../apps/usuarios/views.py); [apps/usuarios/student_auth.py:authenticate_student](../../../../apps/usuarios/student_auth.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-009-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Bloqueo y credenciales inválidas reciben mensaje genérico
- Regla: RN-USR-109; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:StudentTokenObtainPairView.post](../../../../apps/usuarios/views.py); [apps/usuarios/student_auth.py:authenticate_student](../../../../apps/usuarios/student_auth.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-009-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: nunca autoinscribe una cuenta.
- Regla: RN-USR-109; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:StudentTokenObtainPairView.post](../../../../apps/usuarios/views.py); [apps/usuarios/student_auth.py:authenticate_student](../../../../apps/usuarios/student_auth.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-009-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/usuarios/student_auth.py:authenticate_student L133.
- Comportamiento documentado: Rechazo declarado: StudentLoginRejected(GENERIC_ERROR)
- Regla: RN-USR-109; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/usuarios/student_auth.py:authenticate_student](../../../../apps/usuarios/student_auth.py).
- Contexto sintáctico de guardas: `rejection_reason [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
