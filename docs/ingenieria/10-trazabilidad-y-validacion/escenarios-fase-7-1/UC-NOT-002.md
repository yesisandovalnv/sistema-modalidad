# UC-NOT-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-NOT-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-NOT-102 — Solo el destinatario modifica lectura; los cambios masivos se limitan a sus notificaciones.

Endpoint/operación del objetivo: `POST /api/v1/notificaciones/{id}/marcar-leida|marcar-no-leida/; POST /api/v1/notificaciones/marcar-todas-leidas/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-NOT-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Elegir leída, no leída o todas leídas → Autenticar y resolver notificación propia si corresponde → Aplicar servicio y fecha de lectura → Devolver notificación o cantidad actualizada.
- Comportamiento documentado: Lectura actualizada conforme al destinatario.
- Regla: RN-NOT-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/notificaciones/views.py:NotificacionViewSet.marcar_leida](../../../../apps/notificaciones/views.py); [apps/notificaciones/services.py:NotificationService.marcar_leida](../../../../apps/notificaciones/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-NOT-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Marcar leída nuevamente conserva idempotencia
- Regla: RN-NOT-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/notificaciones/views.py:NotificacionViewSet.marcar_leida](../../../../apps/notificaciones/views.py); [apps/notificaciones/services.py:NotificationService.marcar_leida](../../../../apps/notificaciones/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-NOT-002-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no hay borrado habilitado.
- Regla: RN-NOT-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/notificaciones/views.py:NotificacionViewSet.marcar_leida](../../../../apps/notificaciones/views.py); [apps/notificaciones/services.py:NotificationService.marcar_leida](../../../../apps/notificaciones/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
