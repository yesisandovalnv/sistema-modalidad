# UC-POS-020 — Registrar asistencia de defensa

## Identidad y estado

- Identificador: UC-POS-020.
- Objetivo: Asistencia y responsable registrados.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Registrar asistencia de defensa mediante `POST /api/v1/eventos-defensa/{id}/asistencia/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Evento EN_CURSO y participante válido. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Enviar participante y presencia.
2. Exigir administración y validar payload.
3. Comprobar pertenencia al evento.
4. Registrar y devolver asistencia.

## Flujos alternativos

El inicio de evento recibe asistencias iniciales mediante otro payload del ciclo.

## Excepciones

Ámbito: `POST /api/v1/eventos-defensa/{id}/asistencia/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError('Participante ajeno al evento.')` — [EventoDefensaViewSet.asistencia](../../../../apps/postulantes/defensas_api.py); línea 273; método citado.
- `ValidationError('El evento no está en curso.')` — [EventoDefensaService.registrar_asistencia](../../../../apps/postulantes/defensas.py); línea 144; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Asistencia y responsable registrados. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-120: El participante pertenece al evento; asistencia se registra en EN_CURSO.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [EventoDefensaViewSet.asistencia](../../../../apps/postulantes/defensas_api.py); colaboración: [EventoDefensaService.registrar_asistencia](../../../../apps/postulantes/defensas.py).
- Entidades: ENT-POS-013, ENT-POS-012 (ParticipanteEvento, EventoDefensa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_defensas.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [ModelosDefensaTests.test_asistencia_registra_responsable_y_fecha](../../../../apps/postulantes/tests_defensas.py) (L99); llamada a `EventoDefensaService.registrar_asistencia`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_inicio_reprogramado_preserva_asistencias_y_solo_registra_pendientes](../../../../apps/postulantes/tests_defensas.py) (L463); llamada a `EventoDefensaService.registrar_asistencia`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_inicio_combinado_falla_si_falta_decision_pendiente_o_incluye_asistencia_existente](../../../../apps/postulantes/tests_defensas.py) (L505); llamada a `EventoDefensaService.registrar_asistencia`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_matriz_de_estados_para_participantes_y_asistencia](../../../../apps/postulantes/tests_defensas.py) (L620); llamada a `EventoDefensaService.registrar_asistencia`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_retiro_y_reactivacion_reutilizan_registro_y_limpian_asistencia](../../../../apps/postulantes/tests_defensas.py) (L640); llamada a `EventoDefensaService.registrar_asistencia`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_asistencia_se_corrige_y_retiro_ajeno_es_controlado](../../../../apps/postulantes/tests_defensas.py) (L689); llamada a `EventoDefensaService.registrar_asistencia`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_asignacion_historica_conserva_participante_asistencia_y_quorum](../../../../apps/postulantes/tests_defensas.py) (L701); llamada a `EventoDefensaService.registrar_asistencia`; no acredita escenario de excepción.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-020.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-020-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-020-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-020-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-020-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-020-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
