# UC-POS-028 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-028.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-128 — La escritura del catálogo exige administración; destroy rechaza DELETE y propone desactivar.

Endpoint/operación del objetivo: `POST /api/v1/postulaciones/estados/; PUT/PATCH /api/v1/postulaciones/estados/{id}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-028-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar alta o edición de estado técnico → Aplicar IsAuthenticated e IsStaffOrReadOnly → Validar serializer del catálogo → Persistir el estado sin ejecutar una transición de expediente.
- Comportamiento documentado: Estado técnico registrado o actualizado.
- Regla: RN-POS-128; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:EstadoPostulacionViewSet](../../../../apps/postulantes/views.py); [apps/postulantes/serializers.py:EstadoPostulacionSerializer](../../../../apps/postulantes/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-028-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: DELETE se rechaza explícitamente
- Regla: RN-POS-128; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:EstadoPostulacionViewSet](../../../../apps/postulantes/views.py); [apps/postulantes/serializers.py:EstadoPostulacionSerializer](../../../../apps/postulantes/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-028-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: mantener un catálogo no concluye postulaciones.
- Regla: RN-POS-128; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:EstadoPostulacionViewSet](../../../../apps/postulantes/views.py); [apps/postulantes/serializers.py:EstadoPostulacionSerializer](../../../../apps/postulantes/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-028-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: GET es lectura autenticada.
- Regla: RN-POS-128; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:EstadoPostulacionViewSet](../../../../apps/postulantes/views.py); [apps/postulantes/serializers.py:EstadoPostulacionSerializer](../../../../apps/postulantes/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-028-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:EstadoPostulacionViewSet L90.
- Comportamiento documentado: Rechazo declarado: MethodNotAllowed('DELETE', detail='Los estados técnicos deben desactivarse, no eliminarse.')
- Regla: RN-POS-128; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/views.py:EstadoPostulacionViewSet](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-028-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/serializers.py:EstadoPostulacionSerializer L40.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('El código es obligatorio.')
- Regla: RN-POS-128; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/serializers.py:EstadoPostulacionSerializer](../../../../apps/postulantes/serializers.py).
- Contexto sintáctico de guardas: `not value or not value.strip() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-028-E003

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/serializers.py:EstadoPostulacionSerializer L46.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('El nombre es obligatorio.')
- Regla: RN-POS-128; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/serializers.py:EstadoPostulacionSerializer](../../../../apps/postulantes/serializers.py).
- Contexto sintáctico de guardas: `not value or not value.strip() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
