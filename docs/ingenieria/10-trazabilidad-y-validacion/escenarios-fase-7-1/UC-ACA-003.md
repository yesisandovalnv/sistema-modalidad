# UC-ACA-003 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-ACA-003.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-ACA-103 — La escritura exige administración; PeriodoSerializer compara fechas cuando ambas se reciben, y el modelo declara unicidad de gestión/semestre.

Endpoint/operación del objetivo: `POST /api/v1/academico/periodos/; PUT/PATCH/DELETE /api/v1/academico/periodos/{id}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-ACA-003-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar operación y datos → Aplicar IsStaffOrReadOnly → Validar el serializer, sin presumir llamada automática a model.clean → Persistir y devolver recurso.
- Comportamiento documentado: Periodo gestionado conforme al modelo.
- Regla: RN-ACA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/academico/views.py:PeriodoViewSet](../../../../apps/academico/views.py); [apps/academico/serializers.py:PeriodoSerializer.validate](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-003-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: GET permite lectura autenticada.
- Regla: RN-ACA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:PeriodoViewSet](../../../../apps/academico/views.py); [apps/academico/serializers.py:PeriodoSerializer.validate](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-003-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Las referencias pueden impedir eliminación.
- Regla: RN-ACA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:PeriodoViewSet](../../../../apps/academico/views.py); [apps/academico/serializers.py:PeriodoSerializer.validate](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-003-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/academico/serializers.py:PeriodoSerializer.validate L24.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError({'fecha_fin': 'La fecha de fin debe ser posterior a la fecha de inicio.'})
- Regla: RN-ACA-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/academico/serializers.py:PeriodoSerializer.validate](../../../../apps/academico/serializers.py).
- Contexto sintáctico de guardas: `fecha_inicio and fecha_fin and (fecha_fin <= fecha_inicio) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
