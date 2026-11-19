# UC-POS-015 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-POS-015.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-POS-115 — El informe y la sustitución de evidencia validan revisión y contexto habilitados.

Endpoint/operación del objetivo: `POST /api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/; POST /api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/{informe_id}/actualizar-evidencia/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-POS-015-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar informe o evidencia nueva → Exigir administración y resolver seguimiento → Ejecutar registrar_informe o actualizar_evidencia → Devolver informe serializado.
- Comportamiento documentado: Informe/evidencia registrados.
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal](../../../../apps/postulantes/views.py); [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: GET permite consultar informes relacionados
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal](../../../../apps/postulantes/views.py); [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: actualizar evidencia no crea otra etapa.
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal](../../../../apps/postulantes/views.py); [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal L872.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('Solo un usuario administrativo puede registrar el informe.')
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `not is_staff_user(request.user) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal L882.
- Comportamiento documentado: Rechazo declarado: _assignment_validation_error(exc)
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E003

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L21.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no tiene revisión previa de tribunal configurada.')
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `not policy [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E004

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L29.
- Comportamiento documentado: Rechazo declarado: ValidationError('El seguimiento de revisión previa no está activo.')
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `not seguimiento.activo [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E005

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L34.
- Comportamiento documentado: Rechazo declarado: ValidationError('La revisión previa debe estar EN_PROCESO u OBSERVADA.')
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `seguimiento.estado not in (SeguimientoEtapa.EstadoChoices.EN_PROCESO, SeguimientoEtapa.EstadoChoices.OBSERVADA) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E006

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L59.
- Comportamiento documentado: Rechazo declarado: ValidationError('Se requiere un Documento Final activo, aprobado, sin correcciones y con versión actual activa.')
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `not documento or documento.estado.codigo != 'APR' or documento.requiere_correccion or (not version) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E007

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L73.
- Comportamiento documentado: Rechazo declarado: ValidationError({'version_documento_revisada': ['La versión revisada debe ser la versión actual activa del Documento Final.']})
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `not version_revisada.activo or version_revisada.pk != actual.pk or (not version_revisada.es_version_actual) or (version_revisada.documento.postulacion_id != seguimiento.postulacion_id) or (version_revisada.documento.tipo_documento.codigo != cls._policy(seguimiento).get_documento_final_codigo()) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E008

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L95.
- Comportamiento documentado: Rechazo declarado: ValidationError({'evidencia_version': ['La evidencia debe ser una versión actual, activa y disponible del Informe de Evaluación del Tribunal.']})
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `not valida [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E009

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L110.
- Comportamiento documentado: Rechazo declarado: ValidationError('Se requiere un usuario administrativo activo para registrar el informe.')
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `not usuario or not usuario.is_active or (not is_staff_user(usuario)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E010

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L146.
- Comportamiento documentado: Rechazo declarado: ValidationError({'observaciones': ['Las observaciones son obligatorias para un resultado INSUFICIENTE.']})
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `resultado == InformeRevisionTribunalPrevia.Resultado.INSUFICIENTE and (not observaciones) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E011

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L148.
- Comportamiento documentado: Rechazo declarado: ValidationError({'resultado': ['El resultado debe ser SUFICIENTE o INSUFICIENTE.']})
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `resultado not in InformeRevisionTribunalPrevia.Resultado.values [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E012

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L153.
- Comportamiento documentado: Rechazo declarado: ValidationError({'non_field_errors': ['Ya existe un informe activo para esta etapa y versión del Documento Final.']})
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `InformeRevisionTribunalPrevia.objects.filter(seguimiento_etapa=seguimiento, version_documento_revisada=version_documento_revisada).exists() [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E013

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L259.
- Comportamiento documentado: Rechazo declarado: ValidationError('No existe un informe activo para la versión actual del Documento Final.')
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `not informe [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E014

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L262.
- Comportamiento documentado: Rechazo declarado: ValidationError('El informe de la versión actual declara el trabajo INSUFICIENTE.')
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `informe.resultado != InformeRevisionTribunalPrevia.Resultado.SUFICIENTE [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E015

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L166.
- Comportamiento documentado: Rechazo declarado: ValidationError({'non_field_errors': ['Ya existe un informe activo para esta etapa y versión del Documento Final.']})
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-POS-015-E016

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService L211.
- Comportamiento documentado: Rechazo declarado: ValidationError({'informe': ['No existe un informe activo para actualizar en esta etapa.']})
- Regla: RN-POS-115; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/revision_tribunal.py:RevisionTribunalPreviaService](../../../../apps/postulantes/revision_tribunal.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
