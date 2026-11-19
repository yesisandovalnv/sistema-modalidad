# UC-EA-003 — Concluir Excelencia Académica

## Identidad y estado

- Identificador: UC-EA-003.
- Objetivo: Excelencia concluida si cumple su validación.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Concluir Excelencia Académica mediante `POST /api/v1/postulaciones/{id}/excelencia/concluir/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Evaluación favorable y acta válida según política. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar conclusión.
2. Exigir administración y resolver expediente.
3. Validar evaluación y acta mediante política.
4. Iniciar/aprobar conclusión y actualizar CONCLUIDA.

## Flujos alternativos

Una evaluación favorable sola no sustituye el acta y demás requisitos.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/excelencia/concluir/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede operar Excelencia Académica.')` — [ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); línea 35; método citado.
- `ValidationError('La operación de Excelencia Académica no existe.')` — [ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); línea 50; método citado.
- `ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))` — [ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); línea 52; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Excelencia concluida si cumple su validación. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-EA-103: Conclusión valida política propia, etapa final y estado general; no reutiliza defensa numérica de Proyecto.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ExcelenciaAcademicaOverviewView.post](../../../../apps/modalidades/excelencia_academica_api.py); colaboración: [ExcelenciaAcademicaService.concluir](../../../../apps/modalidades/excelencia_academica_service.py).
- Entidades: ENT-POS-004, ENT-MOD-003, ENT-POS-005 (Postulacion, ExcelenciaExpediente, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_excelencia_academica.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [ExcelenciaAcademicaTest.test_conclusion_bloqueada_hasta_acta_aprobada](../../../../apps/modalidades/tests_excelencia_academica.py) (L604); llamada a `ExcelenciaAcademicaService.concluir`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-EA-003.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-EA-003-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-EA-003-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-EA-003-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EA-003-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EA-003-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EA-003-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
