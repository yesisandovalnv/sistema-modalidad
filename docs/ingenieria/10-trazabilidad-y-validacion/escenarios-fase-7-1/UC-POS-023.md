# UC-POS-023 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-023.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-123 — Verificar o rechazar condiciones requiere administración y postulación operable.

Endpoint/operación del objetivo: `POST /api/v1/gestion-complementaria/condiciones/; POST /api/v1/gestion-complementaria/condiciones/{id}/verificar|rechazar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-023-P01

- Tipo: PRINCIPAL.
- Clasificación: **COBERTURA PARCIAL**.
- Origen: Flujo principal: Enviar condición o selección → Exigir administración y validar payload → Aplicar CondicionService → Devolver condición o lote.
- Comportamiento documentado: Condición registrada o verificada.
- Comportamiento acotado comprobado por la aserción: Verificar condiciones complementarias mediante la operación documentada.
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Demuestra listado y auditoría del servicio; no toda la operación API, ni todos los estados/rechazos.
- Implementación: [apps/postulantes/complementarios.py:CondicionService](../../../../apps/postulantes/complementarios.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ModelServiceTests.test_verificar_rechazar_listados_y_auditoria L31](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(CondicionService.listar_completadas(self.post).count(), 1)` (L34) | Verificar condiciones complementarias mediante la operación documentada. |
| [ModelServiceTests.test_verificar_rechazar_listados_y_auditoria L31](../../../../apps/postulantes/tests_complementarios.py) | `self.assertTrue(AuditLog.objects.filter(modulo='GESTION_COMPLEMENTARIA', accion='VERIFY_CONDITION').exists())` (L35) | Verificar condiciones complementarias mediante la operación documentada. |

## ESC-POS-023-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: verificar-multiples usa payload propio
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/complementarios_api.py:CondicionViewSet](../../../../apps/postulantes/complementarios_api.py); [apps/postulantes/complementarios.py:CondicionService](../../../../apps/postulantes/complementarios.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-023-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: condición administrativa no equivale a archivo.
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/complementarios_api.py:CondicionViewSet](../../../../apps/postulantes/complementarios_api.py); [apps/postulantes/complementarios.py:CondicionService](../../../../apps/postulantes/complementarios.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-023-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:CondicionService L31.
- Comportamiento documentado: Rechazo declarado: ValidationError('La condición ya fue verificada.')
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:CondicionService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `obj.estado != obj.Estado.PENDIENTE [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-023-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:CondicionService L40.
- Comportamiento documentado: Rechazo declarado: ValidationError('Selecciona al menos una condición para verificar.')
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:CondicionService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `not ids [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-023-E003

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:CondicionService L42.
- Comportamiento documentado: Rechazo declarado: ValidationError('La selección contiene condiciones duplicadas.')
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:CondicionService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `len(ids) != len(set(ids)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-023-E004

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:CondicionService L52.
- Comportamiento documentado: Rechazo declarado: ValidationError('Una o más condiciones no pertenecen a la postulación o ya no están disponibles.')
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:CondicionService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `len(conditions) != len(ids) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-023-E005

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/complementarios.py:CondicionService L54.
- Comportamiento documentado: Rechazo declarado: ValidationError('Solo se pueden verificar condiciones pendientes.')
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/complementarios.py:CondicionService](../../../../apps/postulantes/complementarios.py).
- Contexto sintáctico de guardas: `any((item.estado != CondicionPostulacion.Estado.PENDIENTE for item in conditions)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-023-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Un lote válido verifica las dos condiciones y registra responsables y dos auditorías.
- Comportamiento acotado comprobado por la aserción: Un lote válido verifica las dos condiciones y registra responsables y dos auditorías.
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El payload contiene los dos IDs propios y se autentica a admin. Las aserciones comprueban respuesta, estados persistidos, responsables y auditorías después de refrescar.
- Implementación: [apps/postulantes/complementarios.py:CondicionService.verificar_multiples](../../../../apps/postulantes/complementarios.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_admin_verifica_condiciones_en_lote L68](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(response.status_code, 200, response.data)` (L77) | Un lote válido verifica las dos condiciones y registra responsables y dos auditorías. |
| [ApiTests.test_admin_verifica_condiciones_en_lote L68](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual((first.estado, second.estado), ('CUMPLE', 'CUMPLE'))` (L80) | Un lote válido verifica las dos condiciones y registra responsables y dos auditorías. |
| [ApiTests.test_admin_verifica_condiciones_en_lote L68](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual((first.verificado_por, second.verificado_por), (self.admin, self.admin))` (L81) | Un lote válido verifica las dos condiciones y registra responsables y dos auditorías. |
| [ApiTests.test_admin_verifica_condiciones_en_lote L68](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(AuditLog.objects.filter(modulo='GESTION_COMPLEMENTARIA', accion='VERIFY_CONDITION').count(), 2)` (L83) | Un lote válido verifica las dos condiciones y registra responsables y dos auditorías. |

## ESC-POS-023-V02

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Un lote con una condición ajena devuelve 400 y conserva ambas condiciones pendientes.
- Comportamiento acotado comprobado por la aserción: Un lote con una condición ajena devuelve 400 y conserva ambas condiciones pendientes.
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: invalid procede del POST autenticado como admin con own y foreign. La guarda compara las filas de la postulación contra los IDs recibidos; se comprueban los dos estados tras refresh.
- Implementación: [apps/postulantes/complementarios.py:CondicionService.verificar_multiples](../../../../apps/postulantes/complementarios.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_lote_requiere_administrador_y_rechaza_ids_de_otra_postulacion L85](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(invalid.status_code, 400)` (L96) | Un lote con una condición ajena devuelve 400 y conserva ambas condiciones pendientes. |
| [ApiTests.test_lote_requiere_administrador_y_rechaza_ids_de_otra_postulacion L85](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(own.estado, 'PENDIENTE')` (L99) | Un lote con una condición ajena devuelve 400 y conserva ambas condiciones pendientes. |
| [ApiTests.test_lote_requiere_administrador_y_rechaza_ids_de_otra_postulacion L85](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(foreign.estado, 'PENDIENTE')` (L100) | Un lote con una condición ajena devuelve 400 y conserva ambas condiciones pendientes. |

## ESC-POS-023-V03

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Un lote con una condición ya cumplida devuelve 400, conserva estados y no verifica parcialmente.
- Comportamiento acotado comprobado por la aserción: Un lote con una condición ya cumplida devuelve 400, conserva estados y no verifica parcialmente.
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La preparación marca complete CUMPLE; el servicio exige que todas estén pendientes antes de resolver. Se asertan los estados persistidos y ausencia de auditoría de verificación.
- Implementación: [apps/postulantes/complementarios.py:CondicionService.verificar_multiples](../../../../apps/postulantes/complementarios.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_lote_atomico_falla_si_una_condicion_ya_no_esta_pendiente L103](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(response.status_code, 400)` (L116) | Un lote con una condición ya cumplida devuelve 400, conserva estados y no verifica parcialmente. |
| [ApiTests.test_lote_atomico_falla_si_una_condicion_ya_no_esta_pendiente L103](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(pending.estado, 'PENDIENTE')` (L118) | Un lote con una condición ya cumplida devuelve 400, conserva estados y no verifica parcialmente. |
| [ApiTests.test_lote_atomico_falla_si_una_condicion_ya_no_esta_pendiente L103](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(complete.estado, 'CUMPLE')` (L119) | Un lote con una condición ya cumplida devuelve 400, conserva estados y no verifica parcialmente. |
| [ApiTests.test_lote_atomico_falla_si_una_condicion_ya_no_esta_pendiente L103](../../../../apps/postulantes/tests_complementarios.py) | `self.assertFalse(AuditLog.objects.filter(modulo='GESTION_COMPLEMENTARIA', accion='VERIFY_CONDITION').exists())` (L120) | Un lote con una condición ya cumplida devuelve 400, conserva estados y no verifica parcialmente. |

## ESC-POS-023-V04

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Un estudiante que intenta verificar condiciones en lote recibe 403.
- Comportamiento acotado comprobado por la aserción: Un estudiante que intenta verificar condiciones en lote recibe 403.
- Regla: RN-POS-123; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: denied es el POST del estudiante, anterior a force_authenticate(admin); no se confunde con el 400 de pertenencia posterior.
- Implementación: [apps/postulantes/complementarios_api.py:RelatedViewSet._admin](../../../../apps/postulantes/complementarios_api.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_lote_requiere_administrador_y_rechaza_ids_de_otra_postulacion L85](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(denied.status_code, 403)` (L92) | Un estudiante que intenta verificar condiciones en lote recibe 403. |
