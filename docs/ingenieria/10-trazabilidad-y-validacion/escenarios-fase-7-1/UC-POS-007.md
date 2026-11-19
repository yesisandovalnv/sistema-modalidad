# UC-POS-007 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-007.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-107 — La consolidación se resuelve por política, conservando semánticas de nota y efectos de aprobación/rechazo/reintento.

Endpoint/operación del objetivo: `POST /api/v1/eventos-defensa/{id}/evaluaciones/consolidar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-007-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Seleccionar evento para consolidar → Exigir administración y resolver evento visible → Validar y consolidar evaluaciones mediante la política → Aplicar los efectos de workflow que correspondan → Devolver evaluación consolidada.
- Comportamiento documentado: Consolidado y efectos permitidos registrados; no conclusión automática universal.
- Regla: RN-POS-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.consolidar](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-007-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Un rechazo puede producir reintento o conservar el rechazo conforme a política.
- Regla: RN-POS-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.consolidar](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-007-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: No todas las modalidades usan ponderación 30/70.
- Regla: RN-POS-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.consolidar](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-007-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento L232.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no soporta evaluaciones.')
- Regla: RN-POS-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `not policy.permite_evaluaciones() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-007-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento L233.
- Comportamiento documentado: Rechazo declarado: ValidationError('Sólo puede consolidarse un evento finalizado.')
- Regla: RN-POS-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `evento.estado != EventoDefensa.Estado.FINALIZADA [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-007-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento L234.
- Comportamiento documentado: Rechazo declarado: ValidationError('El evento ya tiene una evaluación consolidada.')
- Regla: RN-POS-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `evento.evaluaciones.filter(tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL).exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-007-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: La consolidación de la pública de esta fixture conserva nota 95, ponderación 70, aporte 66.50 y BRUTA_100.
- Comportamiento acotado comprobado por la aserción: La consolidación de la pública de esta fixture conserva nota 95, ponderación 70, aporte 66.50 y BRUTA_100.
- Regla: RN-POS-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La prueba crea evaluación por consenso con 95, finaliza el evento y observa el consolidado retornado; los valores son del contexto de prueba, no reglas universales.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ServiciosDefensaTests.test_consolidado_preserva_nota_bruta_aporte_ponderado_y_semantica L186](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(consolidated.nota_numerica, Decimal('95.00'))` (L196) | La consolidación de la pública de esta fixture conserva nota 95, ponderación 70, aporte 66.50 y BRUTA_100. |
| [ServiciosDefensaTests.test_consolidado_preserva_nota_bruta_aporte_ponderado_y_semantica L186](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(consolidated.ponderacion, Decimal('70.00'))` (L197) | La consolidación de la pública de esta fixture conserva nota 95, ponderación 70, aporte 66.50 y BRUTA_100. |
| [ServiciosDefensaTests.test_consolidado_preserva_nota_bruta_aporte_ponderado_y_semantica L186](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(consolidated.aporte_ponderado, Decimal('66.50'))` (L198) | La consolidación de la pública de esta fixture conserva nota 95, ponderación 70, aporte 66.50 y BRUTA_100. |
| [ServiciosDefensaTests.test_consolidado_preserva_nota_bruta_aporte_ponderado_y_semantica L186](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(consolidated.semantica_nota, 'BRUTA_100')` (L199) | La consolidación de la pública de esta fixture conserva nota 95, ponderación 70, aporte 66.50 y BRUTA_100. |
