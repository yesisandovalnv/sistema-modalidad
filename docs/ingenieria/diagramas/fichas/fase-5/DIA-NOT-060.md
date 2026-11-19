# DIA-NOT-060 — Publicación interna y notificaciones propias

- Identificador: DIA-NOT-060.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de publicación interna y notificaciones propias, con decisiones, guardas y límites de evidencia.
- Alcance: Notificación interna y lectura; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-NOT-001.
- Casos relacionados: UC-NOT-001, UC-NOT-002 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-NOT-001, UC-NOT-002.
- Reglas observadas: RN-NOT-101, RN-NOT-102.
- Componentes: CMP-CORE-001, CMP-NOT-001.
- Entidades relacionadas: ENT-NOT-001, ENT-USR-003.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-NOT-060.puml) · [SVG](../../renderizados/fase-5/DIA-NOT-060.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Publicación y lectura son procesos relacionados, no una única solicitud. Callback síncrono posterior al commit, sin broker ni garantía de entrega/reintento persistente demostrados.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [DomainEventPublisher.publish_after_commit (L57)](../../../../../apps/notificaciones/events.py).
- [NotificationService.listar_usuario (L77)](../../../../../apps/notificaciones/services.py).
- [NotificationService.marcar_leida (L58)](../../../../../apps/notificaciones/services.py).
- [NotificationService.procesar_evento (L83)](../../../../../apps/notificaciones/services.py).
- [NotificacionViewSet.get_queryset (L15)](../../../../../apps/notificaciones/views.py).
- [NotificacionViewSet.marcar_leida (L24)](../../../../../apps/notificaciones/views.py).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/notificaciones/tests_api.py](../../../../../apps/notificaciones/tests_api.py).
