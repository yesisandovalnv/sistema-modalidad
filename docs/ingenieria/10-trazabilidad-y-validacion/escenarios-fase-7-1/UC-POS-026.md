# UC-POS-026 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-026.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-126 — La recepción registra cantidades y responsable; no certifica una cantidad normativa universal.

Endpoint/operación del objetivo: `POST /api/v1/gestion-complementaria/entregas-fisicas/; POST /api/v1/gestion-complementaria/entregas-fisicas/{id}/registrar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-026-P01

- Tipo: PRINCIPAL.
- Clasificación: **COBERTURA PARCIAL**.
- Origen: Flujo principal: Enviar tipo o cantidades recibidas → Exigir administración y validar payload → Aplicar servicio de entregas → Devolver estado de recepción.
- Comportamiento documentado: Recepción o cantidad actualizada.
- Comportamiento acotado comprobado por la aserción: Recepcionar una entrega física mediante la operación documentada.
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Se verifica la respuesta para cantidad institucional 1; no se asertan auditoría, sustitución de cantidades ni todas las variantes.
- Implementación: [apps/postulantes/complementarios.py:EntregaFisicaService.registrar_entrega](../../../../apps/postulantes/complementarios.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_admin_registra_entrega L122](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(response.status_code, 200)` (L125) | Recepcionar una entrega física mediante la operación documentada. |
| [ApiTests.test_admin_registra_entrega L122](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(response.data['estado'], 'COMPLETA')` (L125) | Recepcionar una entrega física mediante la operación documentada. |

## ESC-POS-026-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: registrar-multiples recibe un lote
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/complementarios_api.py:EntregaFisicaViewSet](../../../../apps/postulantes/complementarios_api.py); [apps/postulantes/complementarios.py:EntregaFisicaService](../../../../apps/postulantes/complementarios.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-026-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: actualizar-cantidad reutiliza registrar.
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/complementarios_api.py:EntregaFisicaViewSet](../../../../apps/postulantes/complementarios_api.py); [apps/postulantes/complementarios.py:EntregaFisicaService](../../../../apps/postulantes/complementarios.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-026-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:EntregaFisicaService L86.
- Comportamiento documentado: Rechazo declarado: ValidationError('La cantidad recibida debe ser mayor que cero.')
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:EntregaFisicaService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `cantidad_recibida <= 0 [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-026-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:EntregaFisicaService L103.
- Comportamiento documentado: Rechazo declarado: ValidationError('Selecciona al menos una entrega para registrar.')
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:EntregaFisicaService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `not payload [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-026-E003

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:EntregaFisicaService L107.
- Comportamiento documentado: Rechazo declarado: ValidationError('La selección contiene entregas duplicadas.')
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:EntregaFisicaService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `len(ids) != len(set(ids)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-026-E004

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:EntregaFisicaService L118.
- Comportamiento documentado: Rechazo declarado: ValidationError('Una o más entregas no pertenecen a la postulación o ya no están disponibles.')
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:EntregaFisicaService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `len(items) != len(ids) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-026-E005

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:EntregaFisicaService L122.
- Comportamiento documentado: Rechazo declarado: ValidationError('Solo se pueden registrar entregas pendientes.')
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:EntregaFisicaService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `any((item.estado != EntregaFisica.Estado.PENDIENTE for item in items)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-026-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Un lote de entregas registra cantidades 1 y 2 y ambas quedan COMPLETA.
- Comportamiento acotado comprobado por la aserción: Un lote de entregas registra cantidades 1 y 2 y ambas quedan COMPLETA.
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Las cantidades institucionales coinciden con el payload; se asertan estado y cantidades persistidas después de refresh. No demuestra el caso PARCIAL.
- Implementación: [apps/postulantes/complementarios.py:EntregaFisicaService.registrar_multiples](../../../../apps/postulantes/complementarios.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_admin_registra_entregas_en_lote L127](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(response.status_code, 200, response.data)` (L140) | Un lote de entregas registra cantidades 1 y 2 y ambas quedan COMPLETA. |
| [ApiTests.test_admin_registra_entregas_en_lote L127](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual((first.estado, second.estado), ('COMPLETA', 'COMPLETA'))` (L143) | Un lote de entregas registra cantidades 1 y 2 y ambas quedan COMPLETA. |
| [ApiTests.test_admin_registra_entregas_en_lote L127](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual((first.cantidad_recibida, second.cantidad_recibida), (1, 2))` (L144) | Un lote de entregas registra cantidades 1 y 2 y ambas quedan COMPLETA. |

## ESC-POS-026-V02

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Un lote con entrega ajena devuelve 400 y conserva ambas pendientes.
- Comportamiento acotado comprobado por la aserción: Un lote con entrega ajena devuelve 400 y conserva ambas pendientes.
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: invalid corresponde a la llamada admin con dos postulaciones; se comprueba que ninguna entrega cambia.
- Implementación: [apps/postulantes/complementarios.py:EntregaFisicaService.registrar_multiples](../../../../apps/postulantes/complementarios.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_lote_de_entregas_requiere_administrador_y_respeta_ownership L147](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(invalid.status_code, 400)` (L158) | Un lote con entrega ajena devuelve 400 y conserva ambas pendientes. |
| [ApiTests.test_lote_de_entregas_requiere_administrador_y_respeta_ownership L147](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(own.estado, EntregaFisica.Estado.PENDIENTE)` (L160) | Un lote con entrega ajena devuelve 400 y conserva ambas pendientes. |
| [ApiTests.test_lote_de_entregas_requiere_administrador_y_respeta_ownership L147](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(foreign.estado, EntregaFisica.Estado.PENDIENTE)` (L161) | Un lote con entrega ajena devuelve 400 y conserva ambas pendientes. |

## ESC-POS-026-V03

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Una entrega ya completa impide procesar el lote y conserva las dos situaciones.
- Comportamiento acotado comprobado por la aserción: Una entrega ya completa impide procesar el lote y conserva las dos situaciones.
- Regla: RN-POS-126; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La preparación completa una entrega antes del POST. El guardado por lote exige pendientes y los refresh comprueban que no procesa la otra.
- Implementación: [apps/postulantes/complementarios.py:EntregaFisicaService.registrar_multiples](../../../../apps/postulantes/complementarios.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_lote_de_entregas_es_atomico_si_una_ya_no_esta_pendiente L163](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(response.status_code, 400)` (L174) | Una entrega ya completa impide procesar el lote y conserva las dos situaciones. |
| [ApiTests.test_lote_de_entregas_es_atomico_si_una_ya_no_esta_pendiente L163](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(pending.estado, EntregaFisica.Estado.PENDIENTE)` (L176) | Una entrega ya completa impide procesar el lote y conserva las dos situaciones. |
| [ApiTests.test_lote_de_entregas_es_atomico_si_una_ya_no_esta_pendiente L163](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(complete.estado, EntregaFisica.Estado.COMPLETA)` (L177) | Una entrega ya completa impide procesar el lote y conserva las dos situaciones. |
