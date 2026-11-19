# UC-DIP-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DIP-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DIP-101 — El módulo y su etapa deben ser operables; el quinto módulo corresponde al Taller de Investigación.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/diplomado/modulo/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DIP-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **COBERTURA PARCIAL**.
- Origen: Flujo principal: Enviar número de módulo, nota y observaciones → Exigir administración y resolver Diplomado → Aplicar validaciones y registrar el resultado mediante el servicio → Devolver orden, estado y nota del módulo.
- Comportamiento documentado: Resultado del DiplomadoModulo guardado (nota, estado y datos de registro). set_module_result no aprueba ni actualiza SeguimientoEtapa; el seguimiento requiere su operación independiente.
- Comportamiento acotado comprobado por la aserción: Registrar resultado del módulo mediante la operación documentada.
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Comprueba un efecto del servicio; no prueba autenticación, serializer, respuesta API ni todas las variantes de registro.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [DiplomadoTest.test_notas_66_y_100_aprueban_modulo L581](../../../../apps/modalidades/tests_diplomado.py) | `self.assertEqual(module.estado, DiplomadoModulo.Estado.APROBADO)` (L584) | Registrar resultado del módulo mediante la operación documentada. |

## ESC-DIP-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Una nota reprobatoria conserva el resultado correspondiente.
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py); [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: La defensa pública no sustituye los cinco módulos.
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py); [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-001-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post L32.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede operar Diplomado.')
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-001-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post L41.
- Comportamiento documentado: Rechazo declarado: ValidationError('La operación de Diplomado no existe.')
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-001-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post L43.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.post](../../../../apps/modalidades/diplomado_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-001-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result L47.
- Comportamiento documentado: Rechazo declarado: ValidationError({'modulo': 'El Diplomado tiene como máximo cinco módulos.'})
- Comportamiento acotado comprobado por la aserción: Con etapa de módulo iniciada, solicitar el módulo 6 provoca ValidationError.
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La prueba inicia la etapa y llama set_module_result con order=6 dentro de assertRaises; la guarda 1<=order<=5 rechaza antes de consultar el módulo.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).
- Contexto sintáctico de guardas: `not 1 <= order <= 5 [then]`. No equivale a una prueba de alcanzabilidad.

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [DiplomadoTest.test_crea_exactamente_cinco_modulos_y_no_permite_sexto L559](../../../../apps/modalidades/tests_diplomado.py) | `self.assertRaises(ValidationError)` (L564) | Con etapa de módulo iniciada, solicitar el módulo 6 provoca ValidationError. |

## ESC-DIP-001-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result L53.
- Comportamiento documentado: Rechazo declarado: ValidationError({'modulo': 'No existe una etapa académica de módulo en curso.'})
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).
- Contexto sintáctico de guardas: `current_stage is None [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-001-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result L56.
- Comportamiento documentado: Rechazo declarado: ValidationError({'modulo': 'La etapa actual no admite registrar resultados de módulo.'})
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).
- Contexto sintáctico de guardas: `expected_order is None [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-001-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result L58.
- Comportamiento documentado: Rechazo declarado: ValidationError({'modulo': 'Solo puede registrar el resultado del módulo correspondiente a la etapa actual.'})
- Comportamiento acotado comprobado por la aserción: Con la primera etapa de módulo iniciada, solicitar el módulo 2 provoca ValidationError.
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El helper inicia MODULO_1 por defecto; order=2 no coincide con expected_order y la llamada protegida es set_module_result.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).
- Contexto sintáctico de guardas: `order != expected_order [then]`. No equivale a una prueba de alcanzabilidad.

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [DiplomadoTest.test_no_permite_registrar_modulo_futuro L600](../../../../apps/modalidades/tests_diplomado.py) | `self.assertRaises(ValidationError)` (L603) | Con la primera etapa de módulo iniciada, solicitar el módulo 2 provoca ValidationError. |

## ESC-DIP-001-E008

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result L45.
- Comportamiento documentado: Rechazo declarado: ValidationError({'modulo': 'El módulo es obligatorio.'})
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-001-E009

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result L64.
- Comportamiento documentado: Rechazo declarado: ValidationError({'nota': 'La nota debe ser un número entre 0 y 100.'})
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-001-V03

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Una nota 65 guarda el módulo como REPROBADO.
- Comportamiento acotado comprobado por la aserción: Una nota 65 guarda el módulo como REPROBADO.
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La variable module procede de set_module_result(... Decimal("65") ...); se comprueba el estado del módulo. El assertRaises posterior pertenece a WorkflowService y no se usa para atribuir rechazo al guardado del módulo.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [DiplomadoTest.test_nota_65_reprobar_y_bloquea_aprobacion L573](../../../../apps/modalidades/tests_diplomado.py) | `self.assertEqual(module.estado, DiplomadoModulo.Estado.REPROBADO)` (L577) | Una nota 65 guarda el módulo como REPROBADO. |

## ESC-DIP-001-V04

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Una nota 66 guarda el módulo como APROBADO.
- Comportamiento acotado comprobado por la aserción: Una nota 66 guarda el módulo como APROBADO.
- Regla: RN-DIP-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Se selecciona la primera aserción, tras registrar Decimal("66"). La aprobación del seguimiento usa una llamada independiente y no se atribuye al guardado.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.set_module_result](../../../../apps/modalidades/diplomado_service.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [DiplomadoTest.test_notas_66_y_100_aprueban_modulo L581](../../../../apps/modalidades/tests_diplomado.py) | `self.assertEqual(module.estado, DiplomadoModulo.Estado.APROBADO)` (L584) | Una nota 66 guarda el módulo como APROBADO. |
