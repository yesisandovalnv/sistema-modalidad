# UC-POS-007 — Consolidar la evaluación de una defensa

## Identidad y estado

- Identificador: UC-POS-007.
- Objetivo: Consolidado y efectos permitidos registrados; no conclusión automática universal.
- Actor principal: ACT-USR-001 — Administración funcional. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: IMPLEMENTADO; confirmación estática, pruebas no ejecutadas.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.

## Descripción y disparador

Consolidar la evaluación de una defensa mediante `POST /api/v1/eventos-defensa/{id}/evaluaciones/consolidar/`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.

## Precondiciones

IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio. Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.

Estado del evento, evaluación y quórum exigidos por servicio/política. La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

1. Seleccionar evento para consolidar.
2. Exigir administración y resolver evento visible.
3. Validar y consolidar evaluaciones mediante la política.
4. Aplicar los efectos de workflow que correspondan.
5. Devolver evaluación consolidada.

## Flujos alternativos

Un rechazo puede producir reintento o conservar el rechazo conforme a política. No todas las modalidades usan ponderación 30/70.

## Excepciones

Ámbito: `POST /api/v1/eventos-defensa/{id}/evaluaciones/consolidar/`. La guarda de acceso es el perfil `ADMIN` descrito arriba; no se deducen códigos HTTP universales.

Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):

- `ValidationError('La modalidad no soporta evaluaciones.')` — [EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py); línea 232; método citado.
- `ValidationError('Sólo puede consolidarse un evento finalizado.')` — [EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py); línea 233; método citado.
- `ValidationError('El evento ya tiene una evaluación consolidada.')` — [EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py); línea 234; método citado.

Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.

## Postcondiciones

Consolidado y efectos permitidos registrados; no conclusión automática universal. No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

RN-POS-107: La consolidación se resuelve por política, conservando semánticas de nota y efectos de aprobación/rechazo/reintento.

Perfil documental `ADMIN`; consultar [matriz por operación](../../02-actores-permisos/matriz-fase-4.md) y [catálogo de actores](../../02-actores-permisos/actores-fase-4.md). El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: [EventoDefensaViewSet.consolidar](../../../../apps/postulantes/defensas_api.py); colaboración: [EvaluacionDefensaService.consolidar_evaluacion_evento](../../../../apps/postulantes/defensas.py).
- Entidades: ENT-POS-014, ENT-POS-012, ENT-POS-005 (EvaluacionDefensa, EventoDefensa, SeguimientoEtapa). [Catálogo persistente](../../04-dominio-y-datos/catalogo-entidades.md).
- Pruebas relacionadas: [archivo de pruebas existente](../../../../apps/postulantes/tests_defensas.py). Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

### Métodos de prueba identificados

Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:

- [ServiciosDefensaTests.test_consolidado_preserva_nota_bruta_aporte_ponderado_y_semantica](../../../../apps/postulantes/tests_defensas.py) (L186); llamada a `EvaluacionDefensaService.consolidar_evaluacion_evento`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_consolidacion_suficiente_aprueba_perfil_y_deja_documento_final_pendiente](../../../../apps/postulantes/tests_defensas.py) (L299); llamada a `EvaluacionDefensaService.consolidar_evaluacion_evento`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_consolidacion_publica_aprueba_etapa_y_habilita_revision_final](../../../../apps/postulantes/tests_defensas.py) (L777); llamada a `EvaluacionDefensaService.consolidar_evaluacion_evento`; no acredita escenario de excepción.
- [ServiciosDefensaTests.test_consolidacion_publica_rechaza_evento_no_finalizado_y_duplicado](../../../../apps/postulantes/tests_defensas.py) (L793); llamada a `EvaluacionDefensaService.consolidar_evaluacion_evento`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.
- [ServiciosDefensaTests.test_consolidacion_publica_postergada_no_aprueba_etapa](../../../../apps/postulantes/tests_defensas.py) (L804); llamada a `EvaluacionDefensaService.consolidar_evaluacion_evento`; contiene aserción de excepción, asociación exacta guarda/aserción pendiente.

- [Matriz de trazabilidad](../../10-trazabilidad-y-validacion/matriz-fase-4.md) y [límites de la revisión](../../00-alcance-y-evidencia/revision-fase-4.md).

## Escenarios y aserciones — fase 7.1

La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. [Matriz detallada: regla, implementación, método, aserción y límites](../../10-trazabilidad-y-validacion/escenarios-fase-7-1/UC-POS-007.md).

| Escenario | Tipo | Clasificación |
| --- | --- | --- |
| ESC-POS-007-P01 | PRINCIPAL | SIN PRUEBA IDENTIFICADA |
| ESC-POS-007-A01 | ALTERNATIVO / LÍMITE DOCUMENTADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-007-A02 | ALTERNATIVO / LÍMITE DOCUMENTADO | NO VERIFICABLE |
| ESC-POS-007-E001 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-007-E002 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-007-E003 | EXCEPCIONAL DECLARADO | SIN PRUEBA IDENTIFICADA |
| ESC-POS-007-V01 | REFINAMIENTO VERIFICABLE | VERIFICADO DOCUMENTALMENTE |
