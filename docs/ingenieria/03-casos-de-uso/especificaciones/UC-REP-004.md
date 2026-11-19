# UC-REP-004 — Exportar un reporte institucional

## Identidad y estado

- Identificador: UC-REP-004.
- Objetivo: Archivo generado sin alterar evaluaciones.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Exportar un reporte institucional mediante `GET /api/v1/reportes/postulaciones/exportar/; GET /api/v1/reportes/resultados/exportar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar filtros y formato de exportación.
2. Comprobar CanExportReports.
3. Construir filas del reporte correspondiente.
4. Generar y devolver archivo según formato admitido.

## Flujos alternativos

Resultados usa AcademicResultsExportView; no se presume que ambos reportes soporten idénticos formatos o límites.

## Excepciones

Ámbito: `GET /api/v1/reportes/postulaciones/exportar/; GET /api/v1/reportes/resultados/exportar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError({'formato': 'Solo se admite CSV, XLSX o HTML.'})` — [ExportView.get](../../../../apps/reportes/views.py); línea 762; método citado.
- `ValidationError({'detail': f'La exportación supera el límite de {limit} filas; aplique filtros.'})` — [ExportView.get](../../../../apps/reportes/views.py); línea 764; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Archivo generado sin alterar evaluaciones. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-REP-104: Exportar requiere administración; filtros, formatos y límites dependen del recurso de reporte elegido.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ExportView.get](../../../../apps/reportes/views.py); colaboración: [CanExportReports.has_permission](../../../../apps/reportes/permissions.py).
- Entidades: ENT-POS-004, ENT-POS-014 (Postulacion, EvaluacionDefensa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/reportes/tests_resultados_export.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-REP-004.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-REP-004-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-REP-004-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-REP-004-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-REP-004-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-REP-004-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
