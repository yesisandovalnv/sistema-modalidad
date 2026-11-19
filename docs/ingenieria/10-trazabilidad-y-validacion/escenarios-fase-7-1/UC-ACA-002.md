# UC-ACA-002 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-ACA-002.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-ACA-102 — La evidencia oficial se vincula a la modalidad y la actualización queda auditada; no es una firma digital.

Endpoint/operación del objetivo: `POST /api/v1/academico/modalidades/{id}/documentos-oficiales/; PATCH/PUT /api/v1/academico/modalidades/{id}/documentos-oficiales/{documento_id}/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-ACA-002-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar archivo y nombre en el contexto de modalidad → Validar payload y pertenencia si se sustituye un documento → Guardar archivo y actualizado_por dentro de una transacción → Auditar y programar eliminación del archivo sustituido después del commit.
- Comportamiento documentado: Documento oficial publicado o actualizado con auditoría.
- Regla: RN-ACA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/academico/views.py:ModalidadViewSet._guardar_documento_oficial](../../../../apps/academico/views.py); [apps/academico/serializers.py:DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-002-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Actualizar solo el nombre conserva el archivo
- Regla: RN-ACA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:ModalidadViewSet._guardar_documento_oficial](../../../../apps/academico/views.py); [apps/academico/serializers.py:DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-002-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: documento ajeno al contexto no se acepta.
- Regla: RN-ACA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:ModalidadViewSet._guardar_documento_oficial](../../../../apps/academico/views.py); [apps/academico/serializers.py:DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-002-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/serializers.py:DocumentoOficialModalidadSerializer L66.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('El documento oficial debe ser un archivo PDF.')
- Regla: RN-ACA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/serializers.py:DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py).
- Contexto sintáctico de guardas: `not value or not value.name.lower().endswith('.pdf') [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-002-E002

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/serializers.py:DocumentoOficialModalidadSerializer L68.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('El documento oficial no puede estar vacío.')
- Regla: RN-ACA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/serializers.py:DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py).
- Contexto sintáctico de guardas: `value.size == 0 [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-002-E003

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/serializers.py:DocumentoOficialModalidadSerializer L70.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('El documento oficial no puede superar 10 MB.')
- Regla: RN-ACA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/serializers.py:DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py).
- Contexto sintáctico de guardas: `value.size > 10 * 1024 * 1024 [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-002-E004

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/serializers.py:DocumentoOficialModalidadSerializer L74.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('El contenido del archivo no corresponde a un PDF válido.')
- Regla: RN-ACA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/serializers.py:DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py).
- Contexto sintáctico de guardas: `header != b'%PDF-' [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-002-E005

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/academico/serializers.py:DocumentoOficialModalidadSerializer L80.
- Comportamiento documentado: Rechazo declarado: serializers.ValidationError('El nombre del documento es obligatorio.')
- Regla: RN-ACA-102; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/academico/serializers.py:DocumentoOficialModalidadSerializer](../../../../apps/academico/serializers.py).
- Contexto sintáctico de guardas: `not nombre [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
