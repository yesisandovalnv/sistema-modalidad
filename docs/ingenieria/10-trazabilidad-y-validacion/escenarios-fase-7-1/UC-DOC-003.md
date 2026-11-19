# UC-DOC-003 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DOC-003.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DOC-103 — El alcance documental admite propiedad/asignación; memorandos restringen visibilidad a publicaciones vigentes para no administradores.

Endpoint/operación del objetivo: `GET /api/v1/documentos/documentos/; GET /api/v1/documentos/documentos/{id}/versiones/; GET /api/v1/documentos/versiones/{id}/descargar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DOC-003-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar documentos, versiones o descarga → Aplicar queryset y filtros de publicación → Resolver versión y comprobar archivo si se descarga → Devolver metadatos o archivo con nombre saneado.
- Comportamiento documentado: Documentación consultada o descargada sin cambiar revisión.
- Regla: RN-DOC-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/documentos/views.py:VersionDocumentoViewSet.descargar](../../../../apps/documentos/views.py); [apps/documentos/views.py:DocumentoPostulacionViewSet.get_queryset](../../../../apps/documentos/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-003-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Archivo ausente devuelve 404.
- Regla: RN-DOC-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:VersionDocumentoViewSet.descargar](../../../../apps/documentos/views.py); [apps/documentos/views.py:DocumentoPostulacionViewSet.get_queryset](../../../../apps/documentos/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-003-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: No se ofrecen todas las versiones de un memorando a un lector relacionado.
- Regla: RN-DOC-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:VersionDocumentoViewSet.descargar](../../../../apps/documentos/views.py); [apps/documentos/views.py:DocumentoPostulacionViewSet.get_queryset](../../../../apps/documentos/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-003-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:VersionDocumentoViewSet.descargar L309.
- Comportamiento documentado: Rechazo declarado: Http404('El archivo de esta versión no está disponible.')
- Regla: RN-DOC-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/views.py:VersionDocumentoViewSet.descargar](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `not archivo or not archivo.name or (not archivo.storage.exists(archivo.name)) [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-003-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/documentos/views.py:VersionDocumentoViewSet.descargar L314.
- Comportamiento documentado: Rechazo declarado: Http404('El archivo de esta versión no está disponible.')
- Regla: RN-DOC-103; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/documentos/views.py:VersionDocumentoViewSet.descargar](../../../../apps/documentos/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
