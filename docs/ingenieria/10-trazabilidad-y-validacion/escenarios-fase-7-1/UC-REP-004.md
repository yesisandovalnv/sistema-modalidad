# UC-REP-004 — escenarios revisados

[Especificación](../../03-casos-de-uso/especificaciones/UC-REP-004.md) · [Índice y criterios](../matriz-escenarios-fase-7-1.md).

Regla contextual: RN-REP-104 — Exportar requiere administración; filtros, formatos y límites dependen del recurso de reporte elegido.

Endpoint/operación del objetivo: `GET /api/v1/reportes/postulaciones/exportar/; GET /api/v1/reportes/resultados/exportar/`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.

## ESC-REP-004-P01

- Tipo: PRINCIPAL.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujo principal: Enviar filtros y formato de exportación → Comprobar CanExportReports → Construir filas del reporte correspondiente → Generar y devolver archivo según formato admitido.
- Comportamiento documentado: Archivo generado sin alterar evaluaciones.
- Regla: RN-REP-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.
- Implementación: [apps/reportes/views.py:ExportView.get](../../../../apps/reportes/views.py); [apps/reportes/permissions.py:CanExportReports.has_permission](../../../../apps/reportes/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-REP-004-A01

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: Resultados usa AcademicResultsExportView
- Regla: RN-REP-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Variante documentada; no se identificó aserción directa en esta revisión.
- Implementación: [apps/reportes/views.py:ExportView.get](../../../../apps/reportes/views.py); [apps/reportes/permissions.py:CanExportReports.has_permission](../../../../apps/reportes/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-REP-004-A02

- Tipo: ALTERNATIVO / LÍMITE DOCUMENTADO.
- Clasificación: **NO VERIFICABLE**.
- Origen: Flujos alternativos de la especificación.
- Comportamiento documentado: no se presume que ambos reportes soporten idénticos formatos o límites.
- Regla: RN-REP-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.
- Implementación: [apps/reportes/views.py:ExportView.get](../../../../apps/reportes/views.py); [apps/reportes/permissions.py:CanExportReports.has_permission](../../../../apps/reportes/permissions.py).

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-REP-004-E001

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/reportes/views.py:ExportView.get L762.
- Comportamiento documentado: Rechazo declarado: ValidationError({'formato': 'Solo se admite CSV, XLSX o HTML.'})
- Regla: RN-REP-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/reportes/views.py:ExportView.get](../../../../apps/reportes/views.py).
- Contexto sintáctico de guardas: `formato not in EXPORT_ACTIONS [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.

## ESC-REP-004-E002

- Tipo: EXCEPCIONAL DECLARADO.
- Clasificación: **SIN PRUEBA IDENTIFICADA**.
- Origen: Excepciones de la especificación; apps/reportes/views.py:ExportView.get L764.
- Comportamiento documentado: Rechazo declarado: ValidationError({'detail': f'La exportación supera el límite de {limit} filas; aplique filtros.'})
- Regla: RN-REP-104; Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.
- Correspondencia/límite: Raise localizado; no se identificó una aserción que demuestre su guarda concreta.
- Implementación: [apps/reportes/views.py:ExportView.get](../../../../apps/reportes/views.py).
- Contexto sintáctico de guardas: `count > limit [then]`. No equivale a una prueba de alcanzabilidad.

Método de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.
