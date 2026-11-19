# UC-ACA-006 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-ACA-006.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-ACA-106 — La descarga comprueba pertenencia a modalidad y existencia del archivo.

Endpoint/operación del objetivo: `GET /api/v1/academico/modalidades/{id}/documentos-oficiales/; GET /api/v1/academico/modalidades/{id}/documentos-oficiales/{documento_id}/descargar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-ACA-006-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar metadatos o descarga → Autenticar y resolver documento del catálogo → Comprobar archivo para descarga → Devolver listado o FileResponse.
- Comportamiento documentado: Documento consultado sin publicarlo ni sustituirlo.
- Regla: RN-ACA-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial](../../../../apps/academico/views.py); [apps/academico/views.py:ModalidadViewSet._documento_oficial](../../../../apps/academico/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-006-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: La lista vacía es válida
- Regla: RN-ACA-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial](../../../../apps/academico/views.py); [apps/academico/views.py:ModalidadViewSet._documento_oficial](../../../../apps/academico/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-006-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: detalle/archivo ausente produce 404 en descarga.
- Regla: RN-ACA-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial](../../../../apps/academico/views.py); [apps/academico/views.py:ModalidadViewSet._documento_oficial](../../../../apps/academico/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-006-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial L130.
- Comportamiento documentado: Rechazo declarado: Http404('El documento oficial no pertenece a esta modalidad.')
- Regla: RN-ACA-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial](../../../../apps/academico/views.py).
- Contexto sintáctico de guardas: `not documento [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-006-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial L132.
- Comportamiento documentado: Rechazo declarado: Http404('El documento oficial no está disponible.')
- Regla: RN-ACA-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial](../../../../apps/academico/views.py).
- Contexto sintáctico de guardas: `not documento or not documento.archivo or (not documento.archivo.storage.exists(documento.archivo.name)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-ACA-006-E003

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial L136.
- Comportamiento documentado: Rechazo declarado: Http404('El documento oficial no está disponible.')
- Regla: RN-ACA-106; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/academico/views.py:ModalidadViewSet.descargar_documento_oficial](../../../../apps/academico/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
