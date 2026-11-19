# UC-POS-019 — Administrar participantes de defensa

## Identidad y estado

- Identificador: UC-POS-019.
- Objetivo: Participantes actualizados sin borrar historial.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Administrar participantes de defensa mediante `POST /api/v1/eventos-defensa/{id}/participantes/agregar/; POST /api/v1/eventos-defensa/{id}/participantes/{participante_id}/remover/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Estado y asignación admitidos por la política. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar asignación/rol o participante a retirar.
2. Exigir administración y resolver evento.
3. Validar pertenencia y estado.
4. Registrar alta, reactivación o retiro.

## Flujos alternativos

Reactivar reutiliza el registro histórico; estados terminales rechazan cambios.

## Excepciones

Ámbito: `POST /api/v1/eventos-defensa/{id}/participantes/agregar/; POST /api/v1/eventos-defensa/{id}/participantes/{participante_id}/remover/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError('El evento ya no admite participantes.')` — [EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py); línea 60; método citado.
- `ValidationError('La asignación debe estar activa al agregarla.')` — [EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py); línea 62; método citado.
- `ValidationError('El usuario asignado debe estar activo.')` — [EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py); línea 63; método citado.
- `ValidationError('La asignación no pertenece a la postulación.')` — [EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py); línea 64; método citado.
- `ValidationError('El rol no es compatible con la asignación.')` — [EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py); línea 65; método citado.
- `ValidationError({'non_field_errors': ['La persona ya participa activamente en el evento mediante otra asignación.']})` — [EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py); línea 72; método citado.
- `ValidationError({'non_field_errors': ['La asignación ya participa activamente en el evento.']})` — [EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py); línea 75; método citado.
- `ValidationError({'non_field_errors': ['La asignación ya participa en el evento.']})` — [EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py); línea 85; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Participantes actualizados sin borrar historial. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-119: Alta, retiro y reactivación validan estado y política; el retiro es lógico.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [EventoDefensaViewSet.agregar](../../../../apps/postulantes/defensas_api.py); colaboración: [EventoDefensaService.agregar_participante](../../../../apps/postulantes/defensas.py).
- Entidades: ENT-POS-013, ENT-POS-006, ENT-POS-012 (ParticipanteEvento, AsignacionPostulacion, EventoDefensa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_defensas.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [ServiciosDefensaTests.test_inicio_combinado_registra_todos_los_pendientes_y_delega_quorum_pg](../../../../apps/postulantes/tests_defensas.py) (L424); llamada a `EventoDefensaService.agregar_participante`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_inicio_reprogramado_preserva_asistencias_y_solo_registra_pendientes](../../../../apps/postulantes/tests_defensas.py) (L463); llamada a `EventoDefensaService.agregar_participante`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_matriz_de_estados_para_participantes_y_asistencia](../../../../apps/postulantes/tests_defensas.py) (L620); llamada a `EventoDefensaService.agregar_participante`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_retiro_y_reactivacion_reutilizan_registro_y_limpian_asistencia](../../../../apps/postulantes/tests_defensas.py) (L640); llamada a `EventoDefensaService.agregar_participante`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_alta_rechaza_duplicado_y_asignaciones_incompatibles](../../../../apps/postulantes/tests_defensas.py) (L660); llamada a `EventoDefensaService.agregar_participante`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_participante_rechaza_misma_persona_mediante_asignaciones_distintas](../../../../apps/postulantes/tests_defensas.py) (L679); llamada a `EventoDefensaService.agregar_participante`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-019.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-019-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-E004 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-E005 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-E006 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-E007 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-E008 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-019-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
