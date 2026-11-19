# UC-EG-003 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-EG-003.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-EG-103 — El overview usa la política y composición propias de Examen, bajo alcance común.

Endpoint/operación del objetivo: `GET /api/v1/postulaciones/{id}/examen/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-EG-003-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar overview de Examen → Resolver alcance y modalidad → Obtener áreas, evaluaciones y composición del servicio → Devolver vista específica.
- Comportamiento documentado: Vista de áreas devuelta.
- Regla: RN-EG-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.get](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.overview](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-003-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: No permite registrar evaluaciones al usuario lector.
- Regla: RN-EG-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.get](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.overview](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-003-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Los efectos auxiliares de ensure_areas se describen en el código
- Regla: RN-EG-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.get](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.overview](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-003-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no se afirma que todo GET sea físicamente inmutable.
- Regla: RN-EG-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.get](../../../../apps/modalidades/examen_grado_api.py); [apps/modalidades/examen_grado_service.py:ExamenGradoService.overview](../../../../apps/modalidades/examen_grado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EG-003-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.get L31.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)
- Regla: RN-EG-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/examen_grado_api.py:ExamenGradoOverviewView.get](../../../../apps/modalidades/examen_grado_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
