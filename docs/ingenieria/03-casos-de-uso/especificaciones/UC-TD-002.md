# UC-TD-002 — Registrar informe institucional de Trabajo Dirigido

## Identidad y estado

- Identificador: UC-TD-002.
- Objetivo: Informe institucional guardado.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar informe institucional de Trabajo Dirigido mediante `POST /api/v1/postulaciones/{id}/trabajo-dirigido/informes/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

TRABAJO_DIRIGIDO y expediente institucional válido. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar periodo y contenido del informe.
2. Exigir administración y resolver Trabajo Dirigido.
3. Validar expediente y datos mediante el servicio.
4. Devolver id y periodo.

## Flujos alternativos

El supervisor puede estar descrito en el expediente, pero eso no crea una cuenta ni permiso de carga para él.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/trabajo-dirigido/informes/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede operar Trabajo Dirigido.')` — [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); línea 32; método citado.
- `ValidationError('La operación de Trabajo Dirigido no existe.')` — [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); línea 44; método citado.
- `ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))` — [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); línea 46; método citado.
- `ValidationError('Primero debe registrar la institución de Trabajo Dirigido.')` — [TrabajoDirigidoService.registrar_informe](../../../../apps/modalidades/trabajo_dirigido_service.py); línea 45; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Informe institucional guardado. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-TD-102: El informe pertenece al expediente institucional y registra al usuario que lo incorpora.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); colaboración: [TrabajoDirigidoService.registrar_informe](../../../../apps/modalidades/trabajo_dirigido_service.py).
- Entidades: ENT-MOD-007, ENT-MOD-006 (InformeSeguimientoTrabajoDirigido, TrabajoDirigidoExpediente). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_trabajo_dirigido.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [TrabajoDirigidoTest.test_gates_de_aprobacion_de_desarrollo_siguen_exigiendo_convenio_externo](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1195); llamada a `TrabajoDirigidoService.registrar_informe`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [TrabajoDirigidoTest.test_gate_de_aprobacion_de_desarrollo_interno_no_exige_convenio_externo](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1220); llamada a `TrabajoDirigidoService.registrar_informe`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_desarrollo_exige_institucion_e_informe_periodico](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1251); llamada a `TrabajoDirigidoService.registrar_informe`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-TD-002.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-TD-002-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-TD-002-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-TD-002-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-002-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-002-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-002-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
