# DIA-POS-082 — Ciclo de evento de defensa

- Identificador: DIA-POS-082.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de ciclo de evento de defensa, con decisiones, guardas y límites de evidencia.
- Alcance: Ciclo de defensa, participantes y asistencia; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-004.
- Casos relacionados: UC-POS-006, UC-POS-018, UC-POS-019, UC-POS-020 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-POS-006.
- Reglas observadas: RN-POS-106, RN-POS-118, RN-POS-119, RN-POS-120.
- Componentes: CMP-CORE-001, CMP-POS-001.
- Entidades relacionadas: ENT-POS-004, ENT-POS-005, ENT-POS-006, ENT-POS-012, ENT-POS-013, ENT-POS-014.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-POS-082.puml) · [SVG](../../renderizados/fase-5/DIA-POS-082.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

No se añade reapertura de FINALIZADA/CANCELADA. Asistencia y evaluación son dimensiones separadas: registrar evaluación admite EN_CURSO/FINALIZADA, consolidar requiere FINALIZADA. No se inventa estado EVALUADA del evento.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [EventoDefensaService._cerrar (L173)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.agregar_participante (L58)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.finalizar_evento (L162)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.iniciar_evento (L103)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.programar_evento (L25)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.registrar_asistencia (L142)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.reprogramar_evento (L187)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.validar_quorum (L153)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaViewSet.agregar (L260)](../../../../../apps/postulantes/defensas_api.py).
- [EventoDefensaViewSet.asistencia (L271)](../../../../../apps/postulantes/defensas_api.py).
- [EventoDefensaViewSet.get_queryset (L214)](../../../../../apps/postulantes/defensas_api.py).
- [PostulacionEventosView.post (L322)](../../../../../apps/postulantes/defensas_api.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | programar_evento | Etapa habilitada; previas aprobadas; policy; sin duplicado activo | Crear evento con default PROGRAMADA | PROGRAMADA | No ejecutar si falla la guarda; [EventoDefensaService.programar_evento (L25)](../../../../../apps/postulantes/defensas.py) |
| T02 | PROGRAMADA | iniciar_evento | Postulación activa; fecha alcanzada y policy de inicio | Guardar inicio real y usuario | EN_CURSO | No ejecutar si falla la guarda; [EventoDefensaService.iniciar_evento (L103)](../../../../../apps/postulantes/defensas.py) |
| T03 | EN_CURSO | finalizar_evento | Postulación activa; policy y quórum válidos | Guardar fin real y usuario; evento postcommit | FINALIZADA | No ejecutar si falla la guarda; [EventoDefensaService.finalizar_evento (L162)](../../../../../apps/postulantes/defensas.py) |
| T04 | PROGRAMADA | suspender_evento | Postulación activa; motivo no vacío | Cerrar con SUSPENDIDA y publicar evento | SUSPENDIDA | No ejecutar si falla la guarda; [EventoDefensaService._cerrar (L173)](../../../../../apps/postulantes/defensas.py) |
| T05 | EN_CURSO | suspender_evento | Postulación activa; motivo no vacío | Cerrar con SUSPENDIDA y publicar evento | SUSPENDIDA | No ejecutar si falla la guarda; [EventoDefensaService._cerrar (L173)](../../../../../apps/postulantes/defensas.py) |
| T06 | PROGRAMADA | cancelar_evento | Postulación activa; motivo; no FINALIZADA/CANCELADA | Guardar cancelación y publicar evento | CANCELADA | No ejecutar si falla la guarda; [EventoDefensaService._cerrar (L173)](../../../../../apps/postulantes/defensas.py) |
| T07 | EN_CURSO | cancelar_evento | Postulación activa; motivo; no FINALIZADA/CANCELADA | Guardar cancelación y publicar evento | CANCELADA | No ejecutar si falla la guarda; [EventoDefensaService._cerrar (L173)](../../../../../apps/postulantes/defensas.py) |
| T08 | SUSPENDIDA | cancelar_evento | Postulación activa; motivo; no FINALIZADA/CANCELADA | Guardar cancelación y publicar evento | CANCELADA | No ejecutar si falla la guarda; [EventoDefensaService._cerrar (L173)](../../../../../apps/postulantes/defensas.py) |
| T09 | PROGRAMADA | reprogramar_evento | Postulación activa; motivo y nueva fecha validados por policy | Cambiar fecha y limpiar inicio/fin/responsables | PROGRAMADA | No ejecutar si falla la guarda; [EventoDefensaService.reprogramar_evento (L187)](../../../../../apps/postulantes/defensas.py) |
| T10 | SUSPENDIDA | reprogramar_evento | Postulación activa; motivo y nueva fecha validados por policy | Cambiar fecha y limpiar inicio/fin/responsables | PROGRAMADA | No ejecutar si falla la guarda; [EventoDefensaService.reprogramar_evento (L187)](../../../../../apps/postulantes/defensas.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests_defensas.py](../../../../../apps/postulantes/tests_defensas.py).
- [apps/postulantes/tests_defensas_consulta.py](../../../../../apps/postulantes/tests_defensas_consulta.py).
