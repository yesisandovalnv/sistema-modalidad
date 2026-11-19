# API y comunicaciones: bases

Estado: IMPLEMENTADO para puntos de entrada; inventario detallado y secuencias PENDIENTES.

Fuentes: [rutas](../../../core/urls.py), [Axios](../../../src/services/api.js), [eventos](../../../apps/notificaciones/events.py), [OpenAPI guardado](../../../schema.yml).

No se presupone que schema.yml esté sincronizado. Contrastar rutas, acciones y serializers. Por operación documentar método/ruta, actor, alcance, entrada, salida, errores, servicio, política y efectos. Heredar ModelViewSet no garantiza CRUD completo.

Seguir cliente, vista, permiso/serializer, servicio, política y ORM. Representar transacción y postcommit cuando corresponda. DomainEventPublisher usa transaction.on_commit con robust=True y despacho en el proceso; no agregar broker, reintentos persistentes o entrega garantizada sin evidencia.
