# UC-EG-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-EG-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-EG-102 — El servicio valida política, aprueba CONCLUSION_ACADEMICA y formaliza el estado general.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/examen/concluir/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-EG-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar conclusión → Exigir administración y resolver Examen → Validar condiciones e iniciar/aprobar etapa final si procede → Actualizar estado general CONCLUIDA y devolver etapa.
- Comportamiento documentado: Examen concluido si cumple sus gates.
- Regla: RN-EG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.concluir](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: POST del overview sin area también toma la rama de conclusión
- Regla: RN-EG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.concluir](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-002-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: es un alias operativo, no otro caso.
- Regla: RN-EG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.concluir](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-002-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post L35.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede registrar evaluaciones.')
- Regla: RN-EG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-002-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post L43.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-EG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
