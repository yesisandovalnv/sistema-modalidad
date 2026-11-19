# UC-USR-005 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-USR-005.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-USR-105 — Las capacidades del perfil orientan la interfaz; no sustituyen autorización backend.

Endpoint/operación del objetivo: `GET /api/v1/auth/me/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-USR-005-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar perfil → Comprobar autenticación y actividad → Serializar request.user y resolver capacidades → Devolver perfil.
- Comportamiento documentado: Perfil consultado sin modificar cuenta.
- Regla: RN-USR-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/usuarios/views.py:MeView.get](../../../../apps/usuarios/views.py); [apps/usuarios/services.py:UserCapabilitiesService.resolve](../../../../apps/usuarios/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-005-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Campos heredados de compatibilidad no implican permiso de edición.
- Regla: RN-USR-105; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/usuarios/views.py:MeView.get](../../../../apps/usuarios/views.py); [apps/usuarios/services.py:UserCapabilitiesService.resolve](../../../../apps/usuarios/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
