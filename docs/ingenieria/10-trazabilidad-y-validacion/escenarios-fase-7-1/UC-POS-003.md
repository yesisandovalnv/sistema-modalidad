# UC-POS-003 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-003.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-103 — La transición depende del estado técnico y de los gates de la política, no de la visibilidad del botón.

Endpoint/operación del objetivo: `POST /api/v1/seguimientos-etapa/{id}/iniciar|observar|aprobar|rechazar|omitir/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-003-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Elegir acción de etapa y enviar datos requeridos → Aplicar IsWorkflowAdminOrReadOnlyOwner → Resolver seguimiento y validar el serializer de la acción → Invocar el método correspondiente de WorkflowService y sus validaciones de política → Devolver seguimiento actualizado.
- Comportamiento documentado: Etapa actualizada y efectos del motor aplicados cuando la transición es válida.
- Regla: RN-POS-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.aprobar](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.aprobar_etapa](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-003-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Iniciar no exige el mismo payload que observar o rechazar
- Regla: RN-POS-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.aprobar](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.aprobar_etapa](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-003-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: cada acción conserva su validación.
- Regla: RN-POS-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.aprobar](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.aprobar_etapa](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-003-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Los intentos nuevos son otro caso.
- Regla: RN-POS-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.aprobar](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.aprobar_etapa](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-003-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:SeguimientoEtapaViewSet.aprobar L1012.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-POS-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.aprobar](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-003-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Aprobar la etapa con documento válido devuelve APROBADA con fecha y responsable.
- Comportamiento acotado comprobado por la aserción: Aprobar la etapa con documento válido devuelve APROBADA con fecha y responsable.
- Regla: RN-POS-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: actualizado es el retorno de aprobar_etapa tras preparar documento y versión; las tres propiedades se asertan en ese retorno. No se generaliza esta fixture a toda modalidad.
- Implementación: [apps/postulantes/workflow.py:WorkflowService.aprobar_etapa](../../../../apps/postulantes/workflow.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [DocumentoFinalApprovalPreconditionTest.test_aprueba_etapa_si_documento_cumple_todas_las_precondiciones L669](../../../../apps/postulantes/tests_workflow.py) | `self.assertEqual(actualizado.estado, SeguimientoEtapa.EstadoChoices.APROBADA)` (L675) | Aprobar la etapa con documento válido devuelve APROBADA con fecha y responsable. |
| [DocumentoFinalApprovalPreconditionTest.test_aprueba_etapa_si_documento_cumple_todas_las_precondiciones L669](../../../../apps/postulantes/tests_workflow.py) | `self.assertIsNotNone(actualizado.fecha_fin)` (L676) | Aprobar la etapa con documento válido devuelve APROBADA con fecha y responsable. |
| [DocumentoFinalApprovalPreconditionTest.test_aprueba_etapa_si_documento_cumple_todas_las_precondiciones L669](../../../../apps/postulantes/tests_workflow.py) | `self.assertEqual(actualizado.cerrada_por, self.admin)` (L677) | Aprobar la etapa con documento válido devuelve APROBADA con fecha y responsable. |
