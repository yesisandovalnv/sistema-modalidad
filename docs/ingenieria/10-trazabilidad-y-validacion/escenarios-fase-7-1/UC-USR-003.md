# UC-USR-003 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-USR-003.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-USR-103 — Un refresh válido permite renovar según rotación y blacklist de SimpleJWT.

Endpoint/operación del objetivo: `POST /api/v1/auth/refresh/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-USR-003-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar refresh → Delegar en TokenRefreshView → Validar el token y aplicar configuración → Devolver tokens renovados.
- Comportamiento documentado: Tokens renovados sin crear cuenta.
- Regla: RN-USR-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/usuarios/views.py:CustomTokenRefreshView.post](../../../../apps/usuarios/views.py); [core/settings/base.py:SIMPLE_JWT](../../../../core/settings/base.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-003-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: No necesita un access vigente
- Regla: RN-USR-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:CustomTokenRefreshView.post](../../../../apps/usuarios/views.py); [core/settings/base.py:SIMPLE_JWT](../../../../core/settings/base.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-003-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: refresh expirado o revocado se rechaza.
- Regla: RN-USR-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:CustomTokenRefreshView.post](../../../../apps/usuarios/views.py); [core/settings/base.py:SIMPLE_JWT](../../../../core/settings/base.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
