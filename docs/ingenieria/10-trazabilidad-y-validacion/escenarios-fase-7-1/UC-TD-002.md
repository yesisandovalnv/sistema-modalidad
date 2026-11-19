# UC-TD-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-TD-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-TD-102 — El informe pertenece al expediente institucional y registra al usuario que lo incorpora.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/trabajo-dirigido/informes/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-TD-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar periodo y contenido del informe → Exigir administración y resolver Trabajo Dirigido → Validar expediente y datos mediante el servicio → Devolver id y periodo.
- Comportamiento documentado: Informe institucional guardado.
- Regla: RN-TD-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.registrar_informe](../../../../apps/modalidades/trabajo_dirigido_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: El supervisor puede estar descrito en el expediente, pero eso no crea una cuenta ni permiso de carga para él.
- Regla: RN-TD-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.registrar_informe](../../../../apps/modalidades/trabajo_dirigido_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-002-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post L32.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede operar Trabajo Dirigido.')
- Regla: RN-TD-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-002-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post L44.
- Comportamiento documentado: Rechazo declarado: ValidationError('La operación de Trabajo Dirigido no existe.')
- Regla: RN-TD-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-002-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post L46.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-TD-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-002-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.registrar_informe L45.
- Comportamiento documentado: Rechazo declarado: ValidationError('Primero debe registrar la institución de Trabajo Dirigido.')
- Regla: RN-TD-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.registrar_informe](../../../../apps/modalidades/trabajo_dirigido_service.py).
- Contexto sintáctico de guardas: `not expediente [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
