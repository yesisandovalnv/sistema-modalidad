# UC-USR-008 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-USR-008.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-USR-108 — El catálogo excluye estudiantes y la consulta contextual aplica ocupación; inclusión no certifica elegibilidad institucional.

Endpoint/operación del objetivo: `GET /api/v1/usuarios/candidatos-asignacion/; GET /api/v1/postulaciones/{id}/candidatos-asignacion/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-USR-008-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar catálogo o consulta contextual → Exigir autoridad y permisos de la vista elegida → Aplicar filtros de cuentas y contexto → Devolver candidatos con disponibilidad cuando corresponde.
- Comportamiento documentado: Candidatos consultados sin crear vínculos.
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/usuarios/views.py:AssignmentCandidateViewSet.get_queryset](../../../../apps/usuarios/views.py); [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-008-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: El contexto de participación/etapa puede imponer restricciones adicionales
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:AssignmentCandidateViewSet.get_queryset](../../../../apps/usuarios/views.py); [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-008-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no autoriza una asignación por sí solo.
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/usuarios/views.py:AssignmentCandidateViewSet.get_queryset](../../../../apps/usuarios/views.py); [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-008-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion L582.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('No tiene permisos para consultar candidatos de asignación.')
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-008-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion L588.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'posicion': 'La clave de posición es obligatoria.'})
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not posicion_clave [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-008-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion L590.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'accion': 'La acción debe ser ASIGNAR o REEMPLAZAR.'})
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `accion not in {'ASIGNAR', 'REEMPLAZAR'} [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-008-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion L601.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'posicion': 'La posición no existe en la configuración vigente de esta postulación.'})
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `position is None [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-008-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion L603.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'accion': 'La acción no está permitida para esta posición en su contexto actual.'})
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `position.get('habilitada') is False or accion not in position.get('acciones_permitidas', []) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-008-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion L613.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'posicion': 'La asignación actual ya no corresponde a esta posición.'})
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `accion == 'REEMPLAZAR' [then]; asignacion_actual is None [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-USR-008-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion L628.
- Comportamiento documentado: Rechazo declarado: _assignment_validation_error(exc)
- Regla: RN-USR-108; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.candidatos_asignacion](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
