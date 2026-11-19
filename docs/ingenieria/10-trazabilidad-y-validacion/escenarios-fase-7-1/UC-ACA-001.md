# UC-ACA-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-ACA-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-ACA-101 — La vista rechaza crear o eliminar modalidades oficiales; las actualizaciones están sujetas al serializer y permisos.

Endpoint/operación del objetivo: `PUT/PATCH /api/v1/academico/modalidades/{id}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-ACA-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Identificar una modalidad existente → Comprobar IsAuthenticated e IsStaffOrReadOnly → Validar los campos permitidos por ModalidadSerializer → Guardar y devolver la representación actualizada.
- Comportamiento documentado: Modalidad actualizada dentro del contrato del serializer.
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/academico/views.py:ModalidadViewSet](../../../../apps/academico/views.py); [apps/academico/serializers.py:ModalidadSerializer](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: POST de creación y DELETE se rechazan expresamente
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:ModalidadViewSet](../../../../apps/academico/views.py); [apps/academico/serializers.py:ModalidadSerializer](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no son alternativas válidas de mantenimiento.
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:ModalidadViewSet](../../../../apps/academico/views.py); [apps/academico/serializers.py:ModalidadSerializer](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-001-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/views.py:ModalidadViewSet L56.
- Comportamiento documentado: Rechazo declarado: MethodNotAllowed('POST', detail='Las modalidades oficiales no se crean desde esta API.')
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/views.py:ModalidadViewSet](../../../../apps/academico/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-001-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/views.py:ModalidadViewSet L59.
- Comportamiento documentado: Rechazo declarado: MethodNotAllowed('DELETE', detail='Las modalidades oficiales no se eliminan desde esta API.')
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/views.py:ModalidadViewSet](../../../../apps/academico/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-001-E003

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/views.py:ModalidadViewSet L120.
- Comportamiento documentado: Rechazo declarado: Http404('El documento oficial no pertenece a esta modalidad.')
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/views.py:ModalidadViewSet](../../../../apps/academico/views.py).
- Contexto sintáctico de guardas: `not documento [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-001-E004

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/views.py:ModalidadViewSet L130.
- Comportamiento documentado: Rechazo declarado: Http404('El documento oficial no pertenece a esta modalidad.')
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/views.py:ModalidadViewSet](../../../../apps/academico/views.py).
- Contexto sintáctico de guardas: `not documento [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-001-E005

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/views.py:ModalidadViewSet L132.
- Comportamiento documentado: Rechazo declarado: Http404('El documento oficial no está disponible.')
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/views.py:ModalidadViewSet](../../../../apps/academico/views.py).
- Contexto sintáctico de guardas: `not documento or not documento.archivo or (not documento.archivo.storage.exists(documento.archivo.name)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-001-E006

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/views.py:ModalidadViewSet L136.
- Comportamiento documentado: Rechazo declarado: Http404('El documento oficial no está disponible.')
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/views.py:ModalidadViewSet](../../../../apps/academico/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-001-E007

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/serializers.py:ModalidadSerializer L44.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError({field: 'Este campo no puede modificarse.'})
- Regla: RN-ACA-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/serializers.py:ModalidadSerializer](../../../../apps/academico/serializers.py).
- Contexto sintáctico de guardas: `self.instance [then]; field in self.initial_data and self.initial_data[field] != getattr(self.instance, field) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
