# UC-USR-004 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-USR-004.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-USR-104 — La operación revoca el refresh recibido, no todos los access ya emitidos.

Endpoint/operación del objetivo: `POST /api/v1/auth/logout/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-USR-004-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar refresh con sesión aceptada → Aplicar IsAuthenticated e IsActiveUser → Añadir el refresh a blacklist → Devolver mensaje de cierre.
- Comportamiento documentado: Refresh recibido revocado si fue válido.
- Regla: RN-USR-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/usuarios/views.py:LogoutView.post](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:LogoutSerializer](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-004-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Una excepción de procesamiento del token devuelve 400.
- Regla: RN-USR-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:LogoutView.post](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:LogoutSerializer](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-004-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: No se observa aquí contraste explícito de propietario del refresh con request.user.
- Regla: RN-USR-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:LogoutView.post](../../../../apps/usuarios/views.py); [apps/usuarios/serializers.py:LogoutSerializer](../../../../apps/usuarios/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
