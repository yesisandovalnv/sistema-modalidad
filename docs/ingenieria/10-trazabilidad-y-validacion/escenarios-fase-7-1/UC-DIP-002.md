# UC-DIP-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DIP-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DIP-102 — La conclusión aplica política propia y etapa CONCLUSION_ACADEMICA antes de formalizar estado general.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/diplomado/concluir/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DIP-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar conclusión → Exigir administración y resolver Diplomado → Validar gates e iniciar/aprobar etapa final si procede → Actualizar CONCLUIDA y devolver etapa.
- Comportamiento documentado: Diplomado concluido si sus gates son válidos.
- Regla: RN-DIP-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py); [apps/modalidades/diplomado_service.py:DiplomadoService.conclude](../../../../apps/modalidades/diplomado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Aprobar módulos no sustituye defensa, documentación y demás condiciones de la política.
- Regla: RN-DIP-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py); [apps/modalidades/diplomado_service.py:DiplomadoService.conclude](../../../../apps/modalidades/diplomado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-002-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post L32.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede operar Diplomado.')
- Regla: RN-DIP-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-002-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post L41.
- Comportamiento documentado: Rechazo declarado: ValidationError('La operación de Diplomado no existe.')
- Regla: RN-DIP-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-002-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post L43.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-DIP-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
