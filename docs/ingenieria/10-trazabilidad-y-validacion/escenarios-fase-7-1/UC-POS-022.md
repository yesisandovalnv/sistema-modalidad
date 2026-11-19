# UC-POS-022 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-022.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-122 — GET usa alcance común; POST exige administración y audita el cálculo.

Endpoint/operación del objetivo: `GET /api/v1/postulaciones/{id}/resultado-final/; POST /api/v1/postulaciones/{id}/resultado-final/calcular/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-022-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar resultado → Resolver alcance y exigir administración si es POST → Calcular con política y auditar según método → Devolver resultado.
- Comportamiento documentado: Resultado derivado devuelto; auditoría en POST.
- Regla: RN-POS-122; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/defensas_api.py:ResultadoFinalView](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EvaluacionDefensaService.calcular_resultado_final](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-022-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Estudiante/Docente solo participan en la variante GET
- Regla: RN-POS-122; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:ResultadoFinalView](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EvaluacionDefensaService.calcular_resultado_final](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-022-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: calcular no concluye.
- Regla: RN-POS-122; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:ResultadoFinalView](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EvaluacionDefensaService.calcular_resultado_final](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-022-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas_api.py:ResultadoFinalView L340.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Se requiere permiso administrativo.')
- Regla: RN-POS-122; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/defensas_api.py:ResultadoFinalView](../../../../apps/postulantes/defensas_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-022-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas_api.py:ResultadoFinalView L335.
- Comportamiento documentado: Rechazo declarado: ValidationError(e.messages)
- Regla: RN-POS-122; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/defensas_api.py:ResultadoFinalView](../../../../apps/postulantes/defensas_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-022-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EvaluacionDefensaService.calcular_resultado_final L265.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no soporta evaluaciones.')
- Regla: RN-POS-122; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService.calcular_resultado_final](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `not policy.permite_evaluaciones() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-022-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: En la fixture mixta, resultado final combina aporte legacy 25 y aporte nuevo 66.50 en 91.50.
- Comportamiento acotado comprobado por la aserción: En la fixture mixta, resultado final combina aporte legacy 25 y aporte nuevo 66.50 en 91.50.
- Regla: RN-POS-122; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Las evaluaciones de preparación declaran semánticas diferentes; result es el retorno del cálculo. No se afirma que calcular concluya la postulación.
- Implementación: [apps/postulantes/defensas.py:EvaluacionDefensaService.calcular_resultado_final](../../../../apps/postulantes/defensas.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ServiciosDefensaTests.test_resultado_final_mixto_usa_aporte_nuevo_y_preserva_nota_legacy L201](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(result['aporte_privada'], Decimal('25.00'))` (L219) | En la fixture mixta, resultado final combina aporte legacy 25 y aporte nuevo 66.50 en 91.50. |
| [ServiciosDefensaTests.test_resultado_final_mixto_usa_aporte_nuevo_y_preserva_nota_legacy L201](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(result['aporte_publica'], Decimal('66.50'))` (L220) | En la fixture mixta, resultado final combina aporte legacy 25 y aporte nuevo 66.50 en 91.50. |
| [ServiciosDefensaTests.test_resultado_final_mixto_usa_aporte_nuevo_y_preserva_nota_legacy L201](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(result['nota_final'], Decimal('91.50'))` (L221) | En la fixture mixta, resultado final combina aporte legacy 25 y aporte nuevo 66.50 en 91.50. |
| [ServiciosDefensaTests.test_resultado_final_mixto_usa_aporte_nuevo_y_preserva_nota_legacy L201](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(result['semantica_privada'], 'LEGACY_PONDERADA')` (L222) | En la fixture mixta, resultado final combina aporte legacy 25 y aporte nuevo 66.50 en 91.50. |
| [ServiciosDefensaTests.test_resultado_final_mixto_usa_aporte_nuevo_y_preserva_nota_legacy L201](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(result['semantica_publica'], 'BRUTA_100')` (L223) | En la fixture mixta, resultado final combina aporte legacy 25 y aporte nuevo 66.50 en 91.50. |
