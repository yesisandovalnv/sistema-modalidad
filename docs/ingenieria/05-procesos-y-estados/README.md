# Procesos y estados: límites

Estado: IMPLEMENTADO para dimensiones; diagramas PENDIENTES.

Separar estado general, vigencia, tipo de registro, régimen de workflow, etapa, defensa y documento. Fuentes: [modelos](../../../apps/postulantes/models.py), [workflow](../../../apps/postulantes/workflow.py), [documentos](../../../apps/documentos/models.py).

SeguimientoEtapa.EstadoChoices: PENDIENTE, EN_PROCESO, OBSERVADA, APROBADA, RECHAZADA y OMITIDA. EventoDefensa.Estado: PROGRAMADA, EN_CURSO, FINALIZADA, SUSPENDIDA y CANCELADA.

Una opción de estado no prueba una transición. Extraer transiciones de servicios, permisos y políticas. Distinguir acción manual, autoapertura, consolidación, reintento y conclusión. Una nota calculada o etapa aprobada no equivale automáticamente a conclusión.

Proyecto distingue PG_LEGACY y PG_HITOS_V1; no aplicar esos regímenes a otras modalidades. Véanse [paquetes](../09-modalidades/README.md).

## Entrega de fase 5

El modelado dinámico está disponible en el [índice de fase 5](README-fase-5.md), con inventario, modelos, contratos de transiciones, trazabilidad y validación. Las propuestas iniciales se conservan como antecedente.
