# DIA-NOT-080 — Lectura de notificación propia

- Identificador: DIA-NOT-080.
- Tipo UML: Estados.
- Objetivo: Documentar el comportamiento implementado de lectura de notificación propia, con decisiones, guardas y límites de evidencia.
- Alcance: Notificación interna y lectura; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-NOT-001.
- Casos relacionados: UC-NOT-001, UC-NOT-002 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-NOT-002.
- Reglas observadas: RN-NOT-101, RN-NOT-102.
- Componentes: CMP-CORE-001, CMP-NOT-001.
- Entidades relacionadas: ENT-NOT-001, ENT-USR-003.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/estados/DIA-NOT-080.puml) · [SVG](../../renderizados/fase-5/DIA-NOT-080.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Booleano persistido con actualización idempotente. No se permite eliminar notificaciones por el servicio; no se modela un estado Entregada por correo.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [NotificationService.crear_notificacion (L35)](../../../../../apps/notificaciones/services.py).
- [NotificationService.listar_usuario (L77)](../../../../../apps/notificaciones/services.py).
- [NotificationService.marcar_leida (L58)](../../../../../apps/notificaciones/services.py).
- [NotificationService.marcar_no_leida (L66)](../../../../../apps/notificaciones/services.py).
- [NotificacionViewSet.get_queryset (L15)](../../../../../apps/notificaciones/views.py).
- [NotificacionViewSet.marcar_leida (L24)](../../../../../apps/notificaciones/views.py).

## Contrato de transiciones

Origen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.

| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | [*] | crear_notificacion | Destinatario activo; clave aún no existente | get_or_create con default no leído | No leída: leida=False | No ejecutar si falla la guarda; [NotificationService.crear_notificacion (L35)](../../../../../apps/notificaciones/services.py) |
| T02 | No leída: leida=False | marcar_leida / todas | Propietario de notificación; lote solo propias | Guardar fecha_lectura; auditar si cambia | Leída: leida=True | No ejecutar si falla la guarda; [NotificationService.marcar_leida (L58)](../../../../../apps/notificaciones/services.py) |
| T03 | Leída: leida=True | marcar_no_leida | Propietario | leida=False; fecha_lectura=None | No leída: leida=False | No ejecutar si falla la guarda; [NotificationService.marcar_no_leida (L66)](../../../../../apps/notificaciones/services.py) |
| T04 | Leída: leida=True | marcar_leida | Propietario | Retornar sin modificar ni auditar de nuevo | Leída: leida=True | No ejecutar si falla la guarda; [NotificationService.marcar_leida (L58)](../../../../../apps/notificaciones/services.py) |

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/notificaciones/tests_api.py](../../../../../apps/notificaciones/tests_api.py).
