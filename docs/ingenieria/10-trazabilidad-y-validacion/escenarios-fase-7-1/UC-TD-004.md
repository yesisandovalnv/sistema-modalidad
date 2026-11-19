# UC-TD-004 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-TD-004.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-TD-104 — La consulta pasa por get_postulacion_in_scope y la validación de modalidad del servicio.

Endpoint/operación del objetivo: `GET /api/v1/postulaciones/{id}/trabajo-dirigido/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-TD-004-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar vista específica → Aplicar alcance común y vínculo → Resolver datos institucionales e informes → Devolver overview del servicio.
- Comportamiento documentado: Información específica consultada.
- Regla: RN-TD-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.get](../../../../apps/modalidades/trabajo_dirigido_api.py); [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.overview](../../../../apps/modalidades/trabajo_dirigido_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-004-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Postulación fuera de alcance o modalidad incorrecta no se presenta como un expediente válido.
- Regla: RN-TD-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/trabajo_dirigido_api.py:TrabajoDirigidoOverviewView.get](../../../../apps/modalidades/trabajo_dirigido_api.py); [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.overview](../../../../apps/modalidades/trabajo_dirigido_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TD-004-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: El overview devuelve el periodo del informe institucional registrado en la fixture.
- Comportamiento acotado comprobado por la aserción: El overview devuelve el periodo del informe institucional registrado en la fixture.
- Regla: RN-TD-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Antes de consultar se configura la institución y se registra el informe Agosto 2026; la aserción observa ese campo del overview. No demuestra autorización API ni todos los campos.
- Implementación: [apps/modalidades/trabajo_dirigido_service.py:TrabajoDirigidoService.overview](../../../../apps/modalidades/trabajo_dirigido_service.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [TrabajoDirigidoTest.test_desarrollo_exige_institucion_e_informe_periodico L1251](../../../../apps/modalidades/tests_trabajo_dirigido.py) | `self.assertEqual(TrabajoDirigidoService.overview(self.post)['informes'][0]['periodo'], 'Agosto 2026')` (L1262) | El overview devuelve el periodo del informe institucional registrado en la fixture. |
