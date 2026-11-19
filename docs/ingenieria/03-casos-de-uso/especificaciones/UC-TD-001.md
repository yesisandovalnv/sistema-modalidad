# UC-TD-001 — Configurar institución de Trabajo Dirigido

## Identidad y estado

- Identificador: UC-TD-001.
- Objetivo: Expediente institucional guardado.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Configurar institución de Trabajo Dirigido mediante `POST /api/v1/postulaciones/{id}/trabajo-dirigido/institucion/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

TRABAJO_DIRIGIDO y validaciones de institución/convenio. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar datos institucionales.
2. Exigir administración y resolver Trabajo Dirigido.
3. Configurar y validar el expediente mediante el servicio.
4. Devolver id y nombre institucional.

## Flujos alternativos

La ejecución externa exige convenio según el modelo; no se crea una integración con la institución.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/trabajo-dirigido/institucion/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Solo un usuario administrativo puede operar Trabajo Dirigido.')` — [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); línea 32; método citado.
- `ValidationError('La operación de Trabajo Dirigido no existe.')` — [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); línea 44; método citado.
- `ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else getattr(exc, 'messages', str(exc)))` — [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); línea 46; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Expediente institucional guardado. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-TD-101: La institución se guarda en el expediente específico y valida modalidad y condiciones de ejecución.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [TrabajoDirigidoOverviewView.post](../../../../apps/modalidades/trabajo_dirigido_api.py); colaboración: [TrabajoDirigidoService.configurar_institucion](../../../../apps/modalidades/trabajo_dirigido_service.py).
- Entidades: ENT-MOD-006, ENT-POS-004 (TrabajoDirigidoExpediente, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/modalidades/tests_trabajo_dirigido.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [TrabajoDirigidoTest.test_desarrollo_con_institucion_valida_orienta_al_documento_de_supervision](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L315); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_desarrollo_distingue_informe_estructurado_del_documento_aprobado](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L339); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_desarrollo_con_documento_presentado_mantiene_espera_de_revision](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L361); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_desarrollo_externo_orienta_al_convenio_documental_faltante](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L376); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_desarrollo_externo_con_convenio_presentado_orienta_a_esperar_revision](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L401); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_desarrollo_externo_con_convenio_observado_orienta_a_corregir](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L426); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_desarrollo_externo_con_convenio_aprobado_continua_orientacion](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L455); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_orientacion_muestra_convenio_aprobado_mientras_falta_otro_documento](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L471); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_documentos_aplicables_de_desarrollo_incluyen_convenio_solo_para_ejecucion_externa](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1116); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_documentos_aplicables_y_carga_de_convenio_externo_comparten_contexto](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1135); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_endpoint_documentos_aplicables_omite_convenio_para_ejecucion_interna](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1175); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_gates_de_aprobacion_de_desarrollo_siguen_exigiendo_convenio_externo](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1195); llamada a `TrabajoDirigidoService.configurar_institucion`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [TrabajoDirigidoTest.test_gate_de_aprobacion_de_desarrollo_interno_no_exige_convenio_externo](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1220); llamada a `TrabajoDirigidoService.configurar_institucion`; no acredita escenario de excepción.
- [TrabajoDirigidoTest.test_externo_exige_convenio_y_supervisor](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1242); llamada a `TrabajoDirigidoService.configurar_institucion`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [TrabajoDirigidoTest.test_desarrollo_exige_institucion_e_informe_periodico](../../../../apps/modalidades/tests_trabajo_dirigido.py) (L1251); llamada a `TrabajoDirigidoService.configurar_institucion`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-TD-001.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-TD-001-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-TD-001-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-001-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-001-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-001-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-TD-001-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
