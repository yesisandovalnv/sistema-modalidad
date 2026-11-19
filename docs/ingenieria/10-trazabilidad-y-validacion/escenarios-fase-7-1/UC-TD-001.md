# UC-TD-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-TD-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-TD-101 — La institución se guarda en el expediente específico y valida modalidad y condiciones de ejecución.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/trabajo-dirigido/institucion/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-TD-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar datos institucionales → Exigir administración y resolver Trabajo Dirigido → Configurar y validar el expediente mediante el servicio → Devolver id y nombre institucional.
- Comportamiento documentado: Expediente institucional guardado.
- Regla: RN-TD-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.configurar_institucion](../../../../apps/modalidades/trabajo_dirigido_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: La ejecución externa exige convenio según el modelo
- Regla: RN-TD-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.configurar_institucion](../../../../apps/modalidades/trabajo_dirigido_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no se crea una integración con la institución.
- Regla: RN-TD-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.configurar_institucion](../../../../apps/modalidades/trabajo_dirigido_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-001-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post L32.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede operar Trabajo Dirigido.')
- Regla: RN-TD-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-001-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post L44.
- Comportamiento documentado: Rechazo declarado: ValidationError('La operación de Trabajo Dirigido no existe.')
- Regla: RN-TD-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-001-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post L46.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-TD-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
