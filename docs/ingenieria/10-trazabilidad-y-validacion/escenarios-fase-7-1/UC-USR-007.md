# UC-USR-007 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-USR-007.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-USR-107 — El catálogo limita a estudiantes activos; con periodo y modalidad excluye quienes tienen postulación vigente.

Endpoint/operación del objetivo: `GET /api/v1/usuarios/estudiantes/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-USR-007-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar opciones con filtros → Aplicar CanManageApplications y actividad → Filtrar estudiantes y ocupación condicional → Devolver opciones paginadas.
- Comportamiento documentado: Opciones consultadas sin crear postulación.
- Regla: RN-USR-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/usuarios/views.py:StudentOptionViewSet.get_queryset](../../../../apps/usuarios/views.py); [apps/usuarios/views.py:CanManageApplications.has_permission](../../../../apps/usuarios/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-007-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: El alias bajo auth/estudiantes representa el mismo objetivo, no un caso duplicado.
- Regla: RN-USR-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:StudentOptionViewSet.get_queryset](../../../../apps/usuarios/views.py); [apps/usuarios/views.py:CanManageApplications.has_permission](../../../../apps/usuarios/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
