# UC-POS-020 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-020.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-120 — El participante pertenece al evento; asistencia se registra en EN_CURSO.

Endpoint/operación del objetivo: `POST /api/v1/eventos-defensa/{id}/asistencia/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-020-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar participante y presencia → Exigir administración y validar payload → Comprobar pertenencia al evento → Registrar y devolver asistencia.
- Comportamiento documentado: Asistencia y responsable registrados.
- Regla: RN-POS-120; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.asistencia](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.registrar_asistencia](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-020-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: El inicio de evento recibe asistencias iniciales mediante otro payload del ciclo.
- Regla: RN-POS-120; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.asistencia](../../../../apps/postulantes/defensas_api.py); [apps/postulantes/defensas.py:EventoDefensaService.registrar_asistencia](../../../../apps/postulantes/defensas.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-020-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas_api.py:EventoDefensaViewSet.asistencia L273.
- Comportamiento documentado: Rechazo declarado: ValidationError('Participante ajeno al evento.')
- Regla: RN-POS-120; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas_api.py:EventoDefensaViewSet.asistencia](../../../../apps/postulantes/defensas_api.py).
- Contexto sintáctico de guardas: `s.validated_data['participante'].evento_id != self.get_object().pk [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-020-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/defensas.py:EventoDefensaService.registrar_asistencia L144.
- Comportamiento documentado: Rechazo declarado: ValidationError('El evento no está en curso.')
- Regla: RN-POS-120; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.registrar_asistencia](../../../../apps/postulantes/defensas.py).
- Contexto sintáctico de guardas: `p.evento.estado != EventoDefensa.Estado.EN_CURSO [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-020-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Registrar asistencia en evento EN_CURSO conserva responsable y fecha de registro.
- Comportamiento acotado comprobado por la aserción: Registrar asistencia en evento EN_CURSO conserva responsable y fecha de registro.
- Regla: RN-POS-120; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: p es el retorno de registrar_asistencia con True; las aserciones comprueban responsable y fecha, sin atribuir validación del quórum completo.
- Implementación: [apps/postulantes/defensas.py:EventoDefensaService.registrar_asistencia](../../../../apps/postulantes/defensas.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [ModelosDefensaTests.test_asistencia_registra_responsable_y_fecha L99](../../../../apps/postulantes/tests_defensas.py) | `self.assertEqual(p.registrado_por, self.admin)` (L102) | Registrar asistencia en evento EN_CURSO conserva responsable y fecha de registro. |
| [ModelosDefensaTests.test_asistencia_registra_responsable_y_fecha L99](../../../../apps/postulantes/tests_defensas.py) | `self.assertIsNotNone(p.fecha_registro_asistencia)` (L102) | Registrar asistencia en evento EN_CURSO conserva responsable y fecha de registro. |
