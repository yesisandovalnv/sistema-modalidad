# UC-TD-003 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-TD-003.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-TD-103 — El servicio opera CIERRE_DOCUMENTAL y después invoca conclusión común con validación propia.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/trabajo-dirigido/concluir/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-TD-003-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar conclusión con administración → Resolver postulación de Trabajo Dirigido → Iniciar/aprobar cierre documental si corresponde → Invocar WorkflowService.concluir_postulacion → Devolver la etapa de cierre.
- Comportamiento documentado: Trabajo Dirigido concluido cuando sus gates lo permiten.
- Regla: RN-TD-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.concluir](../../../../apps/modalidades/trabajo_dirigido_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-003-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: No es la misma secuencia que la conclusión de Examen o el cierre técnico de Proyecto.
- Regla: RN-TD-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.concluir](../../../../apps/modalidades/trabajo_dirigido_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-003-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post L32.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede operar Trabajo Dirigido.')
- Regla: RN-TD-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-003-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post L44.
- Comportamiento documentado: Rechazo declarado: ValidationError('La operación de Trabajo Dirigido no existe.')
- Regla: RN-TD-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-003-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post L46.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-TD-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
