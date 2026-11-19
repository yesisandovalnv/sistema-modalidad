# UC-PG-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-PG-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-PG-102 — Aprobar revisión final, aprobar cierre documental y concluir son operaciones distintas; reabrir exige motivo.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/cierre/aprobar-revision-final|aprobar-cierre-documental|concluir|reabrir/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-PG-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **COBERTURA PARCIAL**.
- Origen: Flujo principal: Seleccionar acción de cierre y enviar observaciones o motivo → Exigir administración y resolver postulación → Validar serializer y política de cierre → Ejecutar la operación de CierrePostulacionService → Refrescar la postulación y devolver estado de cierre.
- Comportamiento documentado: Cierre actualizado según la acción; solo concluir formaliza su conclusión cuando procede.
- Comportamiento acotado comprobado por la aserción: Operar el cierre técnico mediante sus variantes documentadas.
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Comprueba un recorrido favorable y reapertura; no todos los errores, todos los efectos persistidos ni todas las combinaciones del caso agrupado.
- Implementación: [apps/postulantes/cierre_api.py:CierreAccionView.post](../../../../apps/postulantes/cierre_api.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_recorrido_integral_de_cierre_y_reapertura_auditada L271](../../../../apps/postulantes/tests_cierre.py) | `self.assertEqual(concluded.status_code, 200)` (L278) | Operar el cierre técnico mediante sus variantes documentadas. |
| [ApiTests.test_recorrido_integral_de_cierre_y_reapertura_auditada L271](../../../../apps/postulantes/tests_cierre.py) | `self.assertTrue(concluded.data['concluida'])` (L278) | Operar el cierre técnico mediante sus variantes documentadas. |
| [ApiTests.test_recorrido_integral_de_cierre_y_reapertura_auditada L271](../../../../apps/postulantes/tests_cierre.py) | `self.assertEqual(reopened.status_code, 200)` (L280) | Operar el cierre técnico mediante sus variantes documentadas. |
| [ApiTests.test_recorrido_integral_de_cierre_y_reapertura_auditada L271](../../../../apps/postulantes/tests_cierre.py) | `self.assertFalse(reopened.data['cierre_documental_aprobado'])` (L280) | Operar el cierre técnico mediante sus variantes documentadas. |

## ESC-PG-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: GET /cierre/ solo consulta
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/cierre_api.py:CierreAccionView.post](../../../../apps/postulantes/cierre_api.py); [apps/postulantes/cierre.py:CierrePostulacionService](../../../../apps/postulantes/cierre.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-002-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: los faltantes y advertencias conservan el significado que les da la política, sin convertir toda advertencia en bloqueo.
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/cierre_api.py:CierreAccionView.post](../../../../apps/postulantes/cierre_api.py); [apps/postulantes/cierre.py:CierrePostulacionService](../../../../apps/postulantes/cierre.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-002-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/cierre.py:CierrePostulacionService L108.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no tiene política de cierre configurada.')
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/cierre.py:CierrePostulacionService](../../../../apps/postulantes/cierre.py).
- Contexto sintáctico de guardas: `not cierre [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-002-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/cierre.py:CierrePostulacionService L117.
- Comportamiento documentado: Rechazo declarado: ValidationError(f'No existe seguimiento para {code}.')
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/cierre.py:CierrePostulacionService](../../../../apps/postulantes/cierre.py).
- Contexto sintáctico de guardas: `not obj [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-002-E003

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/cierre.py:CierrePostulacionService L136.
- Comportamiento documentado: Rechazo declarado: ValidationError({'faltantes': result['faltantes'], 'advertencias': result['advertencias']})
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/cierre.py:CierrePostulacionService](../../../../apps/postulantes/cierre.py).
- Contexto sintáctico de guardas: `not result['cumple'] [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-002-E004

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/cierre.py:CierrePostulacionService L145.
- Comportamiento documentado: Rechazo declarado: ValidationError({'faltantes': result['faltantes'], 'advertencias': result['advertencias']})
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/cierre.py:CierrePostulacionService](../../../../apps/postulantes/cierre.py).
- Contexto sintáctico de guardas: `not result['cumple'] [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-002-E005

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/cierre.py:CierrePostulacionService L155.
- Comportamiento documentado: Rechazo declarado: ValidationError('El cierre documental y todas las etapas obligatorias deben estar aprobados.')
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/cierre.py:CierrePostulacionService](../../../../apps/postulantes/cierre.py).
- Contexto sintáctico de guardas: `not cls._policy(post).puede_concluir(post) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-002-E006

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/cierre.py:CierrePostulacionService L164.
- Comportamiento documentado: Rechazo declarado: ValidationError('El motivo de reapertura es obligatorio.')
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/cierre.py:CierrePostulacionService](../../../../apps/postulantes/cierre.py).
- Contexto sintáctico de guardas: `not motivo.strip() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-002-E007

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/cierre.py:CierrePostulacionService L166.
- Comportamiento documentado: Rechazo declarado: ValidationError('El cierre documental no está aprobado.')
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/cierre.py:CierrePostulacionService](../../../../apps/postulantes/cierre.py).
- Contexto sintáctico de guardas: `stage.estado != 'APROBADA' [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-PG-002-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Repetir conclusión conserva CONCLUIDA y el número de historiales de conclusión.
- Comportamiento acotado comprobado por la aserción: Repetir conclusión conserva CONCLUIDA y el número de historiales de conclusión.
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: count se toma entre las dos llamadas. Acredita idempotencia de estado e historial; no se atribuye comprobación de ausencia de auditoría/eventos repetidos.
- Implementación: [apps/postulantes/cierre.py:CierrePostulacionService.concluir_postulacion](../../../../apps/postulantes/cierre.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [PolicyServiceTests.test_conclusion_idempotente_crea_historial_y_auditoria L240](../../../../apps/postulantes/tests_cierre.py) | `self.assertEqual(self.post.estado_actual.codigo, 'CONCLUIDA')` (L243) | Repetir conclusión conserva CONCLUIDA y el número de historiales de conclusión. |
| [PolicyServiceTests.test_conclusion_idempotente_crea_historial_y_auditoria L240](../../../../apps/postulantes/tests_cierre.py) | `self.assertEqual(HistorialEstado.objects.filter(postulacion=self.post, estado_nuevo=self.concluded).count(), count)` (L243) | Repetir conclusión conserva CONCLUIDA y el número de historiales de conclusión. |

## ESC-PG-002-V02

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Solicitar conclusión sin los gates de cierre provoca ValidationError.
- Comportamiento acotado comprobado por la aserción: Solicitar conclusión sin los gates de cierre provoca ValidationError.
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La fixture prepara defensas y revisión pendiente; no aprueba cierre. La llamada bajo assertRaises es concluir_postulacion; el servicio valida puede_concluir antes de cambiar estado.
- Implementación: [apps/postulantes/cierre.py:CierrePostulacionService.concluir_postulacion](../../../../apps/postulantes/cierre.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [PolicyServiceTests.test_no_concluye_solo_por_defensa L245](../../../../apps/postulantes/tests_cierre.py) | `self.assertRaises(ValidationError)` (L246) | Solicitar conclusión sin los gates de cierre provoca ValidationError. |

## ESC-PG-002-V03

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: El estudiante que intenta concluir por la API de cierre recibe 403.
- Comportamiento acotado comprobado por la aserción: El estudiante que intenta concluir por la API de cierre recibe 403.
- Regla: RN-PG-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La autenticación de estudiante precede al POST; _admin exige autoridad administrativa aunque el mismo usuario pueda leer.
- Implementación: [apps/postulantes/cierre_api.py:CierreAccionView.post](../../../../apps/postulantes/cierre_api.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_auth_estudiante_y_docente_lectura L255](../../../../apps/postulantes/tests_cierre.py) | `self.assertEqual(self.client.post(url + 'concluir/', {}).status_code, 403)` (L257) | El estudiante que intenta concluir por la API de cierre recibe 403. |
