# UC-POS-014 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-014.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-114 — Dictamen se atribuye a emisor y versión; el cargo tutor/tribunal no concede escritura API.

Endpoint/operación del objetivo: `POST /api/v1/seguimientos-etapa/{id}/dictamenes-revision/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-014-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar tipo, resultado y versiones → Exigir administración y validar payload → Aplicar validación de servicio y política → Devolver dictamen registrado.
- Comportamiento documentado: Dictamen vinculado a versión y emisor guardado.
- Regla: RN-POS-114; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.dictamenes_revision](../../../../apps/postulantes/views.py); [apps/postulantes/dictamenes_revision.py:DictamenRevisionDocumentoService.registrar](../../../../apps/postulantes/dictamenes_revision.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-014-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: GET de la misma acción consulta por alcance del seguimiento.
- Regla: RN-POS-114; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.dictamenes_revision](../../../../apps/postulantes/views.py); [apps/postulantes/dictamenes_revision.py:DictamenRevisionDocumentoService.registrar](../../../../apps/postulantes/dictamenes_revision.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-014-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:SeguimientoEtapaViewSet.dictamenes_revision L833.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede registrar el dictamen.')
- Regla: RN-POS-114; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.dictamenes_revision](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-014-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:SeguimientoEtapaViewSet.dictamenes_revision L841.
- Comportamiento documentado: Rechazo declarado: _assignment_validation_error(exc)
- Regla: RN-POS-114; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.dictamenes_revision](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-014-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/dictamenes_revision.py:DictamenRevisionDocumentoService.registrar L21.
- Comportamiento documentado: Rechazo declarado: ValidationError('Se requiere un usuario administrativo activo para registrar el dictamen.')
- Regla: RN-POS-114; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/dictamenes_revision.py:DictamenRevisionDocumentoService.registrar](../../../../apps/postulantes/dictamenes_revision.py).
- Contexto sintáctico de guardas: `not usuario or not usuario.is_active or (not is_staff_user(usuario)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-014-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/dictamenes_revision.py:DictamenRevisionDocumentoService.registrar L40.
- Comportamiento documentado: Rechazo declarado: ValidationError('Ya existe un dictamen activo para esta etapa, versión y tipo de revisión.')
- Regla: RN-POS-114; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/dictamenes_revision.py:DictamenRevisionDocumentoService.registrar](../../../../apps/postulantes/dictamenes_revision.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
