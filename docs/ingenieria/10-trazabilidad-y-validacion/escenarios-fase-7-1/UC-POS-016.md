# UC-POS-016 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-016.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-116 — La consulta canónica usa all_objects y mantiene vínculos históricos en el alcance.

Endpoint/operación del objetivo: `GET /api/v1/asignaciones/; GET /api/v1/asignaciones/{id}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-016-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar asignaciones con postulación y filtros → Aplicar autenticación y alcance relacionado → Serializar asignaciones activas e históricas → Devolver resultado paginado.
- Comportamiento documentado: Asignaciones consultadas sin cambiar vigencia.
- Regla: RN-POS-116; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:AsignacionPostulacionViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/views.py:AsignacionPostulacionViewSet](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-016-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Los alias contextuales de postulación conservan su helper específico
- Regla: RN-POS-116; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:AsignacionPostulacionViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/views.py:AsignacionPostulacionViewSet](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-016-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no se unifican sus permisos por analogía.
- Regla: RN-POS-116; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:AsignacionPostulacionViewSet.get_queryset](../../../../apps/postulantes/views.py); [apps/postulantes/views.py:AsignacionPostulacionViewSet](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-016-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:AsignacionPostulacionViewSet L1132.
- Comportamiento documentado: Rechazo declarado: _assignment_validation_error(exc)
- Regla: RN-POS-116; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/views.py:AsignacionPostulacionViewSet](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-016-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:AsignacionPostulacionViewSet L1150.
- Comportamiento documentado: Rechazo declarado: _assignment_validation_error(exc)
- Regla: RN-POS-116; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/views.py:AsignacionPostulacionViewSet](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
