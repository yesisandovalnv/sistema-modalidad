# UC-POS-027 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-027.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-127 — La lectura admite propiedad/asignación; http_method_names excluye PUT, PATCH y DELETE.

Endpoint/operación del objetivo: `GET /api/v1/gestion-complementaria/condiciones/; GET /api/v1/gestion-complementaria/entregas-fisicas/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-027-P01

- Tipo: PRINCIPAL.
- Clasificación: **COBERTURA PARCIAL**.
- Origen: Flujo principal: Solicitar controles con filtros → Autenticar y acotar queryset → Filtrar estado o pendientes/completadas → Devolver recursos visibles.
- Comportamiento documentado: Gestión complementaria consultada.
- Comportamiento acotado comprobado por la aserción: Consultar condiciones y entregas según el alcance documentado.
- Regla: RN-POS-127; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La preparación crea una condición propia y otra ajena y autentica al estudiante; verifica cantidad, pero no los IDs devueltos ni las entregas.
- Implementación: [apps/postulantes/complementarios_api.py:RelatedViewSet.get_queryset](../../../../apps/postulantes/complementarios_api.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_estudiante_solo_lee_propias L55](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(response.status_code, 200)` (L58) | Consultar condiciones y entregas según el alcance documentado. |
| [ApiTests.test_estudiante_solo_lee_propias L55](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(response.data['count'], 1)` (L58) | Consultar condiciones y entregas según el alcance documentado. |

## ESC-POS-027-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Un listado vacío no crea ni verifica controles.
- Regla: RN-POS-127; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/complementarios_api.py:RelatedViewSet.get_queryset](../../../../apps/postulantes/complementarios_api.py); [apps/postulantes/complementarios_api.py:CondicionViewSet](../../../../apps/postulantes/complementarios_api.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-027-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: GET de condiciones sin autenticación devuelve 401.
- Comportamiento acotado comprobado por la aserción: GET de condiciones sin autenticación devuelve 401.
- Regla: RN-POS-127; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La solicitud no autentica usuario y apunta exactamente al listado de condiciones; IsAuthenticated se declara en la base de la vista.
- Implementación: [apps/postulantes/complementarios_api.py:RelatedViewSet](../../../../apps/postulantes/complementarios_api.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ApiTests.test_sin_autenticacion L52](../../../../apps/postulantes/tests_complementarios.py) | `self.assertEqual(self.client.get('/api/v1/gestion-complementaria/condiciones/').status_code, 401)` (L53) | GET de condiciones sin autenticación devuelve 401. |
