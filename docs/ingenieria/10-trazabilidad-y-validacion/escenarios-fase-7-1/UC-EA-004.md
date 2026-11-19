# UC-EA-004 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-EA-004.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-EA-104 — La consulta usa alcance común y conserva disponibilidad del criterio sin inventar una nota.

Endpoint/operación del objetivo: `GET /api/v1/postulaciones/{id}/excelencia/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-EA-004-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Solicitar vista de Excelencia → Comprobar rol/vínculo y modalidad → Obtener criterio, evaluación y requisitos → Devolver overview.
- Comportamiento documentado: Información de Excelencia consultada.
- Regla: RN-EA-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.get](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.overview](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-004-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Un expediente todavía no configurado no se describe como evaluado.
- Regla: RN-EA-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.get](../../../../apps/modalidades/excelencia_academica_api.py); [apps/modalidades/excelencia_academica_service.py:ExcelenciaAcademicaService.overview](../../../../apps/modalidades/excelencia_academica_service.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-EA-004-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.get L31.
- Comportamiento documentado: Rechazo declarado: ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)
- Regla: RN-EA-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/modalidades/excelencia_academica_api.py:ExcelenciaAcademicaOverviewView.get](../../../../apps/modalidades/excelencia_academica_api.py).
- Contexto sintáctico de guardas: `sin if envolvente; puede ser propagación/validación delegada`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
