# UC-DOC-007 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-DOC-007.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-DOC-107 — Los catálogos requieren autenticación; lectura no concede escritura ni acceso a archivos del expediente.

Endpoint/operación del objetivo: `GET /api/v1/documentos/estados-documento/; GET /api/v1/documentos/tipos-documento/; GET /api/v1/postulaciones/estados/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-DOC-007-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar catálogo o detalle → Aplicar autenticación y permiso de lectura → Filtrar y ordenar por contrato de la vista → Devolver los valores técnicos disponibles.
- Comportamiento documentado: Catálogo consultado.
- Regla: RN-DOC-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/documentos/views.py:TipoDocumentoViewSet](../../../../apps/documentos/views.py); [apps/postulantes/views.py:EstadoPostulacionViewSet](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-007-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Un tipo documental de catálogo no prueba que sea aplicable a toda modalidad o etapa.
- Regla: RN-DOC-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/documentos/views.py:TipoDocumentoViewSet](../../../../apps/documentos/views.py); [apps/postulantes/views.py:EstadoPostulacionViewSet](../../../../apps/postulantes/views.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-DOC-007-E001

- Tipo: CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Excepciones de la especificación; apps/postulantes/views.py:EstadoPostulacionViewSet L90.
- Comportamiento documentado: Rechazo declarado: MethodNotAllowed('DELETE', detail='Los estados técnicos deben desactivarse, no eliminarse.')
- Regla: RN-DOC-107; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.
- Implementación: [apps/postulantes/views.py:EstadoPostulacionViewSet](../../../../apps/postulantes/views.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
