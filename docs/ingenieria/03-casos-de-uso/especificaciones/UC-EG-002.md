# UC-EG-002 — Concluir Examen de Grado

## Identidad y estado

- Identificador: UC-EG-002.
- Objetivo: Examen concluido si cumple sus gates.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Concluir Examen de Grado mediante `POST /api/v1/postulaciones/{id}/examen/concluir/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Áreas y documentos exigidos por Examen válidos. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Solicitar conclusión.
2. Exigir administración y resolver Examen.
3. Validar condiciones e iniciar/aprobar etapa final si procede.
4. Actualizar estado general CONCLUIDA y devolver etapa.

## Flujos alternativos

POST del overview sin area también toma la rama de conclusión; es un alias operativo, no otro caso.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/examen/concluir/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede registrar evaluaciones.')` — [ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); línea 35; método citado.
- `ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))` — [ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); línea 43; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Examen concluido si cumple sus gates. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-EG-102: El servicio valida política, aprueba CONCLUSION_ACADEMICA y formaliza el estado general.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); colaboración: [ExamenGradoService.concluir](../../../../apps/modalidades/examen_grado_service.py).
- Entidades: ENT-POS-004, ENT-POS-005, ENT-MOD-001 (Postulacion, SeguimientoEtapa, ExamenArea). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_examen_grado.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [ExamenGradoContenidosTest.test_conclusion_exige_documentos_y_concluye_con_acta_y_hoja](../../../../apps/modalidades/tests_examen_grado.py) (L373); llamada a `ExamenGradoService.concluir`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-EG-002.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-EG-002-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-EG-002-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-002-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-EG-002-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-002-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
