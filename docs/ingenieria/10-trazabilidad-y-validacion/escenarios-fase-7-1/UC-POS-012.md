# UC-POS-012 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-012.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-112 — Esta acción usa el orquestador de Proyecto o el motor genérico; no es idéntica a todas las ramas de create.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/flujo/inicializar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-012-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar inicialización → Exigir administración y resolver postulación → Invocar orquestador o WorkflowService según código → Devolver seguimientos ordenados.
- Comportamiento documentado: Seguimientos inicializados o conservados por el motor.
- Regla: RN-POS-112; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.inicializar_flujo](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.inicializar_flujo](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-012-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Configuración sin etapas o postulación no operativa rechaza la inicialización.
- Regla: RN-POS-112; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.inicializar_flujo](../../../../apps/postulantes/views.py); [apps/postulantes/workflow.py:WorkflowService.inicializar_flujo](../../../../apps/postulantes/workflow.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-012-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.inicializar_flujo L492.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('No tiene permisos para inicializar el flujo.')
- Regla: RN-POS-112; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.inicializar_flujo](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-012-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.inicializar_flujo L503.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-POS-112; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.inicializar_flujo](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-012-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/workflow.py:WorkflowService.inicializar_flujo L35.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no tiene etapas activas configuradas.')
- Regla: RN-POS-112; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/workflow.py:WorkflowService.inicializar_flujo](../../../../apps/postulantes/workflow.py).
- Contexto sintáctico de guardas: `not etapas [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-012-V01

- Tipo: REFINAMIENTO VERIFICABLE.
- Clasificación: **VERIFICADO DOCUMENTALMENTE**.
- Origen: Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba..
- Comportamiento documentado: Dos inicializaciones de la fixture devuelven cuatro seguimientos y mantienen cuatro filas, con primer intento pendiente.
- Comportamiento acotado comprobado por la aserción: Dos inicializaciones de la fixture devuelven cuatro seguimientos y mantienen cuatro filas, con primer intento pendiente.
- Regla: RN-POS-112; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Se observan los dos retornos y el conteo persistido. Cuatro etapas es configuración de esta fixture, no cantidad universal.
- Implementación: [apps/postulantes/workflow.py:WorkflowService.inicializar_flujo](../../../../apps/postulantes/workflow.py).

| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |
| --- | --- | --- |
| [WorkflowServiceTest.test_inicializar_flujo_crea_etapas_pendientes_e_idempotente L217](../../../../apps/postulantes/tests_workflow.py) | `self.assertEqual(len(seguimientos), 4)` (L221) | Dos inicializaciones de la fixture devuelven cuatro seguimientos y mantienen cuatro filas, con primer intento pendiente. |
| [WorkflowServiceTest.test_inicializar_flujo_crea_etapas_pendientes_e_idempotente L217](../../../../apps/postulantes/tests_workflow.py) | `self.assertTrue(all((seguimiento.estado == SeguimientoEtapa.EstadoChoices.PENDIENTE and seguimiento.numero_intento == 1 for seguimiento in seguimientos)))` (L226) | Dos inicializaciones de la fixture devuelven cuatro seguimientos y mantienen cuatro filas, con primer intento pendiente. |
| [WorkflowServiceTest.test_inicializar_flujo_crea_etapas_pendientes_e_idempotente L217](../../../../apps/postulantes/tests_workflow.py) | `self.assertEqual(SeguimientoEtapa.objects.filter(postulacion=self.postulacion).count(), 4)` (L233) | Dos inicializaciones de la fixture devuelven cuatro seguimientos y mantienen cuatro filas, con primer intento pendiente. |
| [WorkflowServiceTest.test_inicializar_flujo_crea_etapas_pendientes_e_idempotente L217](../../../../apps/postulantes/tests_workflow.py) | `self.assertEqual(len(repetido), 4)` (L234) | Dos inicializaciones de la fixture devuelven cuatro seguimientos y mantienen cuatro filas, con primer intento pendiente. |
