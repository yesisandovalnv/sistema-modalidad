# UC-POS-006 — Administrar el ciclo de una defensa

## Identidad y estado

- Identificador: UC-POS-006.
- Objetivo: Evento creado o ciclo actualizado; no se presume evaluación ni conclusión.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Administrar el ciclo de una defensa mediante `POST /api/v1/postulaciones/{id}/eventos-defensa/programar/; POST /api/v1/eventos-defensa/{id}/iniciar&#124;finalizar&#124;suspender&#124;cancelar&#124;reprogramar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Asignaciones, fecha, etapa, estado y requisitos de la modalidad; la variante local de Proyecto no se generaliza. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar etapa, tipo y programación o seleccionar una acción de evento existente.
2. Exigir administración y validar el payload de la acción.
3. Aplicar EventoDefensaService con sus gates.
4. Registrar el evento o el nuevo estado y sus efectos.
5. Devolver representación del evento.

## Flujos alternativos

Iniciar usa asistencias del payload; suspender/cancelar y reprogramar tienen motivo y precondiciones propios. Participantes y evaluación son casos separados.

## Excepciones

Ámbito: `POST /api/v1/postulaciones/{id}/eventos-defensa/programar/; POST /api/v1/eventos-defensa/{id}/iniciar&#124;finalizar&#124;suspender&#124;cancelar&#124;reprogramar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `PermissionDenied('Se requiere permiso administrativo.')` — [PostulacionEventosView.post](../../../../apps/postulantes/defensas_api.py); línea 323; método citado.
- `ValidationError(e.message_dict if hasattr(e, 'message_dict') else e.messages)` — [PostulacionEventosView.post](../../../../apps/postulantes/defensas_api.py); línea 326; método citado.
- `ValidationError('La modalidad no soporta eventos académicos.')` — [EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py); línea 30; método citado.
- `ValidationError('El seguimiento no está habilitado para programar una defensa.')` — [EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py); línea 32; método citado.
- `ValidationError('Las etapas obligatorias anteriores deben estar aprobadas.')` — [EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py); línea 34; método citado.
- `ValidationError({'non_field_errors': ['Ya existe una defensa activa del mismo tipo e intento.']})` — [EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py); línea 44; método citado.
- `ValidationError({'non_field_errors': ['Ya existe una defensa activa del mismo tipo e intento.']})` — [EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py); línea 52; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Evento creado o ciclo actualizado; no se presume evaluación ni conclusión. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-106: La programación y cada cambio de ciclo usan validaciones del evento y de la modalidad.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [PostulacionEventosView.post](../../../../apps/postulantes/defensas_api.py); colaboración: [EventoDefensaService.programar_evento](../../../../apps/postulantes/defensas.py).
- Entidades: ENT-POS-012, ENT-POS-005, ENT-POS-004 (EventoDefensa, SeguimientoEtapa, Postulacion). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_defensas.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [ServiciosDefensaTests.test_programacion_y_auditoria](../../../../apps/postulantes/tests_defensas.py) (L325); llamada a `EventoDefensaService.programar_evento`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_hitos_no_programa_defensa_perfil_sin_precondiciones_academicas](../../../../apps/postulantes/tests_defensas.py) (L329); llamada a `EventoDefensaService.programar_evento`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_contrato_actual_reutiliza_tribunales_de_perfil_para_programar_privada_y_publica](../../../../apps/postulantes/tests_defensas.py) (L342); llamada a `EventoDefensaService.programar_evento`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_programacion_rechaza_anteriores_y_48_horas](../../../../apps/postulantes/tests_defensas.py) (L373); llamada a `EventoDefensaService.programar_evento`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_programacion_publica_rechaza_identidades_repetidas](../../../../apps/postulantes/tests_defensas.py) (L378); llamada a `EventoDefensaService.programar_evento`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_programacion_publica_acepta_composicion_con_identidades_distintas](../../../../apps/postulantes/tests_defensas.py) (L391); llamada a `EventoDefensaService.programar_evento`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_programacion_duplicada_y_carrera_de_integridad_son_errores_controlados](../../../../apps/postulantes/tests_defensas.py) (L401); llamada a `EventoDefensaService.programar_evento`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_postulacion_inactiva_bloquea_todas_las_acciones](../../../../apps/postulantes/tests_defensas.py) (L600); llamada a `EventoDefensaService.programar_evento`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-006.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-006-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-A03 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-006-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-E007 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-006-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
