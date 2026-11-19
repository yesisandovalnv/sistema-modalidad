# UC-POS-018 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-018.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-118 — La vista de eventos admite propiedad, asignación o participación; el alias contextual usa alcance común.

Endpoint/operación del objetivo: `GET /api/v1/eventos-defensa/; GET /api/v1/eventos-defensa/{id}/quorum/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-018-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar eventos o quórum → Aplicar alcance de eventos → Cargar participantes y evidencias → Devolver datos o conteos/faltantes.
- Comportamiento documentado: Evento consultado sin iniciar defensa.
- Regla: RN-POS-118; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.get_queryset](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.validar_quorum](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-018-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Quórum técnico no certifica composición institucional
- Regla: RN-POS-118; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.get_queryset](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.validar_quorum](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-018-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: lista vacía y 404 conservan aislamiento.
- Regla: RN-POS-118; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.get_queryset](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.validar_quorum](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-018-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.validar_quorum L155.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no soporta eventos académicos.')
- Regla: RN-POS-118; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.validar_quorum](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `not policy.evento_policy [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
