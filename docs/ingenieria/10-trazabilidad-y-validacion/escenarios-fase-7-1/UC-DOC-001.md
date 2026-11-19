# UC-DOC-001 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DOC-001.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DOC-101 — Solo administración o propietario pueden cargar, sujetos a actores documentales, contexto y estado; una asignación no basta.

Endpoint/operación del objetivo: `POST /api/v1/documentos/documentos/subir/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DOC-001-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar postulación, tipo, archivo y evento cuando corresponda → Validar payload y resolver referencias → Comprobar actor, aplicabilidad, estado y archivo en DocumentoService → Crear documento o versión y actualizar la versión vigente transaccionalmente → Devolver VersionDocumentoSerializer.
- Comportamiento documentado: Versión registrada y estados documentales aplicados según contexto.
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Nueva versión y autoaprobaciones administrativas siguen condiciones del servicio
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no toda carga queda aprobada.
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-A03

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Histórico usa una acción separada.
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py); [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:DocumentoPostulacionViewSet.subir L131.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'postulacion_id': 'La postulación no existe.'})
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `not postulacion [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:DocumentoPostulacionViewSet.subir L135.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'tipo_documento_id': 'El tipo de documento no existe.'})
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `not tipo_documento [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:DocumentoPostulacionViewSet.subir L140.
- Comportamiento documentado: Rechazo declarado: DRFValidationError({'evento_defensa_id': 'El evento de defensa no existe.'})
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `serializer.validated_data.get('evento_defensa_id') is not None [then]; not evento_defensa [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E004

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:DocumentoPostulacionViewSet.subir L152.
- Comportamiento documentado: Rechazo declarado: DRFValidationError(str(exc))
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/views.py:DocumentoPostulacionViewSet.subir](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E005

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L174.
- Comportamiento documentado: Rechazo declarado: NotFound('El tipo de documento no existe o no está activo.')
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `not isinstance(tipo_documento, TipoDocumento) or not tipo_documento.pk or (not tipo_documento.activo) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E006

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L179.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('El usuario no tiene permisos para subir este documento.')
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `usuario != postulacion.estudiante and (not is_staff_user(usuario)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E007

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L181.
- Comportamiento documentado: Rechazo declarado: PermissionDenied('La hoja de observaciones de Defensa de Perfil solo puede cargarla un usuario administrativo.')
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `tipo_documento.codigo == 'OBSERVACIONES_DEFENSA_PERFIL' and (not is_staff_user(usuario)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E008

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L241.
- Comportamiento documentado: Rechazo declarado: ValidationError(capacidad_carga['mensaje'])
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `not capacidad_carga['permitida'] [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E009

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L230.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no admite vincular documentos a eventos.')
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `ModalidadPolicyRegistry.has_policy(postulacion) [else]; evento_defensa is not None [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E010

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L232.
- Comportamiento documentado: Rechazo declarado: ValidationError('La modalidad no tiene una policy académica configurada para cargar documentos.')
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `ModalidadPolicyRegistry.has_policy(postulacion) [else]; evento_defensa is not None [else]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E011

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L240.
- Comportamiento documentado: Rechazo declarado: PermissionDenied(capacidad_carga['mensaje'])
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `not capacidad_carga['permitida'] [then]; capacidad_carga['codigo'] in {'NO_AUTORIZADO', 'ACTOR_CARGA_NO_AUTORIZADO'} [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E012

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L258.
- Comportamiento documentado: Rechazo declarado: ValidationError('La hoja de observaciones ya está vinculada a otra Defensa de Perfil.')
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `es_carga_inicial [else]; tipo_documento.codigo == 'OBSERVACIONES_DEFENSA_PERFIL' and evento_defensa is not None and (documento.evento_defensa_id not in (None, evento_defensa.pk)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E013

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L215.
- Comportamiento documentado: Rechazo declarado: ValidationError('No se puede cargar un documento ordinario sin un contexto académico válido.')
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `ModalidadPolicyRegistry.has_policy(postulacion) [then]; not es_carga_especial [then]; not etapa_actual_codigo [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-001-E014

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/services.py:DocumentoService.subir_documento L225.
- Comportamiento documentado: Rechazo declarado: ValidationError(f"El tipo '{tipo_documento.nombre}' no puede cargarse en la etapa '{etapa_actual_codigo}'. Tipos permitidos: {', '.join(documentos_permitidos) or 'ninguno'}.")
- Regla: RN-DOC-101; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/services.py:DocumentoService.subir_documento](../../../../apps/documentos/services.py).
- Contexto sintáctico de guardas: `ModalidadPolicyRegistry.has_policy(postulacion) [then]; not es_carga_especial [then]; tipo_documento.codigo not in documentos_permitidos and (not capacidad_carga.get('excepcion_aplicabilidad', False)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
