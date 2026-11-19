# DIA-POS-065 — Programar e iniciar una defensa

- Identificador: DIA-POS-065.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de programar e iniciar una defensa, con decisiones, guardas y límites de evidencia.
- Alcance: Ciclo de defensa, participantes y asistencia; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-POS-004.
- Casos relacionados: UC-POS-006, UC-POS-018, UC-POS-019, UC-POS-020 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-POS-006, UC-POS-020.
- Reglas observadas: RN-POS-106, RN-POS-118, RN-POS-119, RN-POS-120.
- Componentes: CMP-CORE-001, CMP-POS-001.
- Entidades relacionadas: ENT-POS-004, ENT-POS-005, ENT-POS-006, ENT-POS-012, ENT-POS-013, ENT-POS-014.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-POS-065.puml) · [SVG](../../renderizados/fase-5/DIA-POS-065.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Las solicitudes de programación, inicio y finalización son variantes independientes; el diagrama resume sus guardas, no una transacción que abarque toda la vida de la defensa.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [EventoDefensaService.agregar_participante (L58)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.iniciar_evento_con_asistencia (L113)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.programar_evento (L25)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.registrar_asistencia (L142)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaService.validar_quorum (L153)](../../../../../apps/postulantes/defensas.py).
- [EventoDefensaViewSet.agregar (L260)](../../../../../apps/postulantes/defensas_api.py).
- [EventoDefensaViewSet.asistencia (L271)](../../../../../apps/postulantes/defensas_api.py).
- [EventoDefensaViewSet.get_queryset (L214)](../../../../../apps/postulantes/defensas_api.py).
- [PostulacionEventosView.post (L322)](../../../../../apps/postulantes/defensas_api.py).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/postulantes/tests_defensas.py](../../../../../apps/postulantes/tests_defensas.py).
- [apps/postulantes/tests_defensas_consulta.py](../../../../../apps/postulantes/tests_defensas_consulta.py).
