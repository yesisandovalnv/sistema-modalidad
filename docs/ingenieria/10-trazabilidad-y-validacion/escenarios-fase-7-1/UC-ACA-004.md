# UC-ACA-004 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-ACA-004.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-ACA-104 — La relación modalidad/requisito es única y tiene orden válido; no es un gate universal.

Endpoint/operación del objetivo: `POST /api/v1/academico/requisitos/; POST /api/v1/academico/modalidad-requisitos/; PUT/PATCH/DELETE de sus detalles`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-ACA-004-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar requisito o relación → Exigir administración → Validar referencias y orden → Ejecutar operación de catálogo.
- Comportamiento documentado: Requisito o relación persistido.
- Regla: RN-ACA-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/academico/views.py:ModalidadRequisitoViewSet](../../../../apps/academico/views.py); [apps/academico/serializers.py:ModalidadRequisitoSerializer.validate](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-004-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: La lectura es autenticada.
- Regla: RN-ACA-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:ModalidadRequisitoViewSet](../../../../apps/academico/views.py); [apps/academico/serializers.py:ModalidadRequisitoSerializer.validate](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-004-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Actualizar un catálogo no demuestra que todos los gates de políticas se redefinan.
- Regla: RN-ACA-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:ModalidadRequisitoViewSet](../../../../apps/academico/views.py); [apps/academico/serializers.py:ModalidadRequisitoSerializer.validate](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-004-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/academico/serializers.py:ModalidadRequisitoSerializer.validate L156.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('Ya existe un requisito registrado para esta modalidad.')
- Regla: RN-ACA-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/academico/serializers.py:ModalidadRequisitoSerializer.validate](../../../../apps/academico/serializers.py).
- Contexto sintáctico de guardas: `modalidad and requisito [then]; exists [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
