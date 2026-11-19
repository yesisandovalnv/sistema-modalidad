# UC-TG-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-TG-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-TG-101 — Especialización de UC-POS-008: Tesis valida su defensa pública y ACTA_DEFENSA vinculada, sin heredar el cierre técnico de Proyecto.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/{id}/concluir-academicamente/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-TG-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar conclusión para una postulación TESIS_GRADO → Resolver la postulación con autoridad administrativa → Validar los requisitos de conclusión de TesisGradoPolicy → Ejecutar la transición común a CONCLUIDA → Devolver la postulación.
- Comportamiento documentado: Tesis concluida solo cuando cumple su validación específica.
- Regla: RN-TG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); [apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TG-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: La idempotencia del motor común se conserva
- Regla: RN-TG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); [apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TG-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: un acta ajena o no válida no acredita el gate.
- Regla: RN-TG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py); [apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TG-001-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente L479.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede concluir académicamente una postulación.')
- Regla: RN-TG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TG-001-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente L485.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-TG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:PostulacionViewSet.concluir_academicamente](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TG-001-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica L818.
- Comportamiento documentado: Rechazo declarado: ValidationError('La conclusión académica requiere Defensa Pública aprobada.')
- Regla: RN-TG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py).
- Contexto sintáctico de guardas: `not public or public.estado != SeguimientoEtapa.EstadoChoices.APROBADA [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TG-001-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica L821.
- Comportamiento documentado: Rechazo declarado: ValidationError('La conclusión académica requiere nota final aprobatoria consolidada.')
- Regla: RN-TG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py).
- Contexto sintáctico de guardas: `resultado['nota_final'] is None or resultado['clasificacion'] == 'POSTERGADO' [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-TG-001-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica L834.
- Comportamiento documentado: Rechazo declarado: ValidationError('La conclusión académica requiere ACTA_DEFENSA vigente, aprobada y vinculada a la Defensa Pública.')
- Regla: RN-TG-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/tesis_grado.py:TesisGradoPolicy.validar_conclusion_academica](../../../../apps/modalidades/tesis_grado.py).
- Contexto sintáctico de guardas: `not acta [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
