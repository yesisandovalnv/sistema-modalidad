# UC-NOT-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-NOT-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-NOT-101 — El destinatario determina el alcance de consulta, aunque la interfaz no muestre la capacidad al rol.

Endpoint/operación del objetivo: `GET /api/v1/notificaciones/; GET /api/v1/notificaciones/{id}/; GET /api/v1/notificaciones/no-leidas/count/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-NOT-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar lista, detalle o contador → Autenticar al usuario → Filtrar notificaciones por destinatario y filtros admitidos → Devolver lista paginada, detalle o número de no leídas.
- Comportamiento documentado: Notificaciones propias consultadas sin cambiar lectura.
- Regla: RN-NOT-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/notificaciones/views.py:NotificacionViewSet.get_queryset](../../../../apps/notificaciones/views.py); [apps/notificaciones/services.py:NotificationService.listar_usuario](../../../../apps/notificaciones/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-NOT-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Detalle ajeno devuelve 404
- Regla: RN-NOT-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/notificaciones/views.py:NotificacionViewSet.get_queryset](../../../../apps/notificaciones/views.py); [apps/notificaciones/services.py:NotificationService.listar_usuario](../../../../apps/notificaciones/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-NOT-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: la lista vacía es válida.
- Regla: RN-NOT-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/notificaciones/views.py:NotificacionViewSet.get_queryset](../../../../apps/notificaciones/views.py); [apps/notificaciones/services.py:NotificationService.listar_usuario](../../../../apps/notificaciones/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-NOT-001-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: No hay correo, push ni borrado por esta API.
- Regla: RN-NOT-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/notificaciones/views.py:NotificacionViewSet.get_queryset](../../../../apps/notificaciones/views.py); [apps/notificaciones/services.py:NotificationService.listar_usuario](../../../../apps/notificaciones/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
