# Arquitectura

El backend separa modelos, serializers, permisos, servicios de dominio y vistas REST. Las operaciones críticas usan `transaction.atomic`; los eventos de dominio programan notificaciones persistentes después del commit. El frontend usa un cliente Axios central, `AuthProvider`, capacidades explícitas, rutas protegidas y `NotificationProvider` solo para el contador.

Proyecto de Grado se resuelve mediante `ProyectoGradoPolicy`. `TRABAJO_DIRIGIDO`, `TESIS_GRADO`, `VIA_DIPLOMADO`, `EXCELENCIA_ACADEMICA` y `EXAMEN_GRADO` no tienen normativa implementada y no deben reutilizar reglas de Proyecto de Grado.

Los reportes respetan alcance por usuario, paginación y límite CSV. Las notificaciones pertenecen exclusivamente a su destinatario. Los archivos se validan por tipo configurado y tamaño, y las pruebas usan almacenamiento temporal.
