# Actores y permisos: clasificación inicial

Estado: IMPLEMENTADO para puntos de decisión; matriz exhaustiva por operación PENDIENTE.

- [core/permissions.py](../../../core/permissions.py) reconoce ADMINISTRADOR, ADMINISTRACION, DOCENTE y ESTUDIANTE. Reconocer un código no concede autoridad.
- is_staff_user concede autoridad interna a superusuario o ADMINISTRADOR; is_staff se reserva a Django Admin.
- [UserCapabilitiesService.resolve](../../../apps/usuarios/services.py) entrega indicadores de interfaz; no sustituye permisos API.
- [postulaciones_in_scope](../../../apps/postulantes/permissions.py) limita estudiantes a propias y docentes a asignadas; el filtro común no exige asignación activa.
- [AppRoutes.jsx](../../../src/routes/AppRoutes.jsx) contiene ProtectedRoute.

## Actores UML

Separar usuario autenticado, rol de acceso, cargo académico y participante registrado. Tutor, tribunal, presidente o secretario solo se vincularán a interacción directa si el permiso lo demuestra. Una evaluación atribuida a alguien no prueba que esa persona pueda registrarla desde su sesión.

La [matriz anterior](../../PERMISSION_MATRIX.md) es antecedente; consultar [discrepancias](../00-alcance-y-evidencia/discrepancias.md) antes de generalizarla.

## Actualización de fase 4

La clasificación inicial se conserva como antecedente. Consultar el [catálogo confirmado de fase 4](actores-fase-4.md) y la [matriz por operación](matriz-fase-4.md).
