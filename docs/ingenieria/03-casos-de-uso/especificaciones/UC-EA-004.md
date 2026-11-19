# UC-EA-004 — Consultar expediente de Excelencia

## Identidad y estado

- Identificador: UC-EA-004.
- Objetivo: Información de Excelencia consultada.
- Actor principal: ACT-USR-001 — Administración funcional; ACT-USR-002 — Estudiante; ACT-USR-003 — Docente. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consultar expediente de Excelencia mediante `GET /api/v1/postulaciones/{id}/excelencia/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

Filtro postulaciones_in_scope: administración; ESTUDIANTE propietario; DOCENTE asignado; otros roles sin alcance. Administración: todos; estudiante: propios; docente: asignados. No equivale a RELATED.

Sin guarda académica adicional en esta operación. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar vista de Excelencia.
2. Comprobar rol/vínculo y modalidad.
3. Obtener criterio, evaluación y requisitos.
4. Devolver overview.

## Flujos alternativos

Un expediente todavía no configurado no se describe como evaluado.

## Excepciones

Ámbito: `GET /api/v1/postulaciones/{id}/excelencia/`. La guarda de acceso es el perfil `COMMON` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)` — [ExcelenciaAcademicaOverviewView.get](../../../../apps/modalidades/excelencia_academica_api.py); línea 31; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Información de Excelencia consultada. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-EA-104: La consulta usa alcance común y conserva disponibilidad del criterio sin inventar una nota.

Perfil documental `COMMON`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ExcelenciaAcademicaOverviewView.get](../../../../apps/modalidades/excelencia_academica_api.py); colaboración: [ExcelenciaAcademicaService.overview](../../../../apps/modalidades/excelencia_academica_service.py).
- Entidades: ENT-MOD-003, ENT-POS-004 (ExcelenciaExpediente, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_excelencia_academica.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-EA-004.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-EA-004-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-EA-004-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-EA-004-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
