# UC-DIP-003 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DIP-003.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DIP-103 — El overview pertenece a Diplomado y se limita por alcance común.

Endpoint/operación del objetivo: `GET /api/v1/postulaciones/{id}/diplomado/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DIP-003-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar vista específica → Resolver permisos y modalidad → Obtener módulos y datos derivados mediante el servicio → Devolver overview.
- Comportamiento documentado: Vista de Diplomado devuelta.
- Regla: RN-DIP-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.get](../../../../apps/modalidades/diplomado_api.py); [apps/modalidades/diplomado_service.py:DiplomadoService.overview](../../../../apps/modalidades/diplomado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-003-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: La inicialización auxiliar de módulos del servicio no equivale a aprobación académica ni autoriza al lector a cargar notas.
- Regla: RN-DIP-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/modalidades/diplomado_api.py:DiplomadoOverviewView.get](../../../../apps/modalidades/diplomado_api.py); [apps/modalidades/diplomado_service.py:DiplomadoService.overview](../../../../apps/modalidades/diplomado_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DIP-003-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: El overview de la fixture devuelve cinco módulos y reglas 800 horas, 20 créditos y reintento de 30 días.
- Comportamiento acotado comprobado por la aserción: El overview de la fixture devuelve cinco módulos y reglas 800 horas, 20 créditos y reintento de 30 días.
- Regla: RN-DIP-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: data es el retorno del overview; se comprueban los cuatro campos declarados, sin atribuir mutación académica ni verificar la normativa externa.
- Implementación: [apps/modalidades/diplomado_service.py:DiplomadoService.overview](../../../../apps/modalidades/diplomado_service.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [DiplomadoTest.test_overview_expone_horas_creditos_y_modulos L923](../../../../apps/modalidades/tests_diplomado.py) | `self.assertEqual(len(data['modulos']), 5)` (L925) | El overview de la fixture devuelve cinco módulos y reglas 800 horas, 20 créditos y reintento de 30 días. |
| [DiplomadoTest.test_overview_expone_horas_creditos_y_modulos L923](../../../../apps/modalidades/tests_diplomado.py) | `self.assertEqual(data['reglas']['horas_totales'], 800)` (L926) | El overview de la fixture devuelve cinco módulos y reglas 800 horas, 20 créditos y reintento de 30 días. |
| [DiplomadoTest.test_overview_expone_horas_creditos_y_modulos L923](../../../../apps/modalidades/tests_diplomado.py) | `self.assertEqual(data['reglas']['creditos'], 20)` (L927) | El overview de la fixture devuelve cinco módulos y reglas 800 horas, 20 créditos y reintento de 30 días. |
| [DiplomadoTest.test_overview_expone_horas_creditos_y_modulos L923](../../../../apps/modalidades/tests_diplomado.py) | `self.assertEqual(data['reglas']['reintento_dias'], 30)` (L928) | El overview de la fixture devuelve cinco módulos y reglas 800 horas, 20 créditos y reintento de 30 días. |
