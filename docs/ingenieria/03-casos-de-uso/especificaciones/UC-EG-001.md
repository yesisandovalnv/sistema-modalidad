# UC-EG-001 — Registrar evaluación de un área de Examen

## Identidad y estado

- Identificador: UC-EG-001.
- Objetivo: Evaluación del área y efectos de etapa registrados.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar evaluación de un área de Examen mediante `POST /api/v1/postulaciones/{id}/examen/areas/{area}/evaluar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

EXAMEN_GRADO, área/intento habilitados y escala propia. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar nota, observaciones y datos de evaluación del área.
2. Exigir administración y resolver postulación.
3. Registrar evaluación mediante ExamenGradoService.
4. Devolver área, intento, nota y resultado.

## Flujos alternativos

Evaluación individual y consenso siguen los parámetros y gates del servicio. TypeError, ValueError y validaciones se convierten en error de entrada.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/examen/areas/{area}/evaluar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede registrar evaluaciones.')` — [ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); línea 35; método citado.
- `ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))` — [ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); línea 43; método citado.
- `ValidationError('El área no existe.')` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 63; método citado.
- `ValidationError('El área ya tiene un resultado definitivo.')` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 65; método citado.
- `ValidationError({'modalidad_registro': 'La modalidad de registro no es válida.'})` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 67; método citado.
- `ValidationError({'nota': 'La nota del área debe estar entre 0 y 100.'})` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 69; método citado.
- `ValidationError('El nuevo examen debe realizarse dentro de los 15 días calendario.')` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 71; método citado.
- `ValidationError('El área debe estar en proceso para registrar su evaluación.')` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 76; método citado.
- `ValidationError(f'La composición del Examen no permite evaluar: {detail}')` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 80; método citado.
- `ValidationError({'modalidad_registro': 'No se pueden mezclar evaluaciones individuales y por consenso en el mismo intento.'})` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 83; método citado.
- `ValidationError({'evaluador': 'La evaluación individual requiere un tribunal activo del mismo Examen.'})` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 88; método citado.
- `ValidationError({'evaluador': 'El tribunal ya registró la evaluación de este intento.'})` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 90; método citado.
- `ValidationError({'modalidad_registro': 'El área ya tiene una evaluación consensuada para este intento.'})` — [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py); línea 92; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Evaluación del área y efectos de etapa registrados. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-EG-101: El servicio valida área, intento, nota y modalidad de registro de Examen, sin convertir al evaluador atribuido en usuario autorizado.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [ExamenGradoOverviewView.post](../../../../apps/modalidades/examen_grado_api.py); colaboración: [ExamenGradoService.registrar_evaluacion](../../../../apps/modalidades/examen_grado_service.py).
- Entidades: ENT-MOD-001, ENT-MOD-002, ENT-POS-005 (ExamenArea, ExamenEvaluacion, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_examen_grado.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [ExamenGradoContenidosTest.test_reemplazo_antes_de_calificar_mantiene_composicion_evaluable](../../../../apps/modalidades/tests_examen_grado.py) (L325); llamada a `ExamenGradoService.registrar_evaluacion`; no acredita escenario de excepción.
- [ExamenGradoContenidosTest.test_reemplazo_despues_de_nota_bloquea_mezcla_y_conserva_historial](../../../../apps/modalidades/tests_examen_grado.py) (L339); llamada a `ExamenGradoService.registrar_evaluacion`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ExamenGradoContenidosTest.test_finalizacion_directa_deja_bloqueada_la_evaluacion](../../../../apps/modalidades/tests_examen_grado.py) (L356); llamada a `ExamenGradoService.registrar_evaluacion`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ExamenGradoContenidosTest.test_no_permite_mezclar_registro_individual_y_consenso](../../../../apps/modalidades/tests_examen_grado.py) (L365); llamada a `ExamenGradoService.registrar_evaluacion`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-EG-001.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-EG-001-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E007 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E008 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E009 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E010 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E011 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E012 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-EG-001-E013 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
