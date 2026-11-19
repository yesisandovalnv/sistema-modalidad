# DIA-SYS-001 — Vista general del sistema

- Identificador: DIA-SYS-001.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-USR-001, UC-POS-002, UC-POS-003, UC-DOC-001, UC-POS-006, UC-NOT-001, UC-REP-001, UC-ACA-005.
- Elementos: ACT-POS-001, ACT-POS-002, ACT-SYS-001, ACT-SYS-002, ACT-USR-001, ACT-USR-002, ACT-USR-003; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-SYS-001.puml) · [SVG local](../../renderizados/fase-4/DIA-SYS-001.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-USR-001 — Iniciar sesión con usuario y contraseña](../../../03-casos-de-uso/especificaciones/UC-USR-001.md)
- [UC-POS-002 — Consultar postulaciones y expediente](../../../03-casos-de-uso/especificaciones/UC-POS-002.md)
- [UC-POS-003 — Ejecutar una transición de etapa](../../../03-casos-de-uso/especificaciones/UC-POS-003.md)
- [UC-DOC-001 — Cargar un documento o una nueva versión](../../../03-casos-de-uso/especificaciones/UC-DOC-001.md)
- [UC-POS-006 — Administrar el ciclo de una defensa](../../../03-casos-de-uso/especificaciones/UC-POS-006.md)
- [UC-NOT-001 — Consultar notificaciones propias](../../../03-casos-de-uso/especificaciones/UC-NOT-001.md)
- [UC-REP-001 — Consultar resultados académicos institucionales](../../../03-casos-de-uso/especificaciones/UC-REP-001.md)
- [UC-ACA-005 — Consultar modalidades y capacidades](../../../03-casos-de-uso/especificaciones/UC-ACA-005.md)

## Evidencia de código

- [apps/academico/views.py](../../../../../apps/academico/views.py)
- [apps/documentos/services.py](../../../../../apps/documentos/services.py)
- [apps/documentos/views.py](../../../../../apps/documentos/views.py)
- [apps/modalidades/policies.py](../../../../../apps/modalidades/policies.py)
- [apps/notificaciones/services.py](../../../../../apps/notificaciones/services.py)
- [apps/notificaciones/views.py](../../../../../apps/notificaciones/views.py)
- [apps/postulantes/defensas.py](../../../../../apps/postulantes/defensas.py)
- [apps/postulantes/defensas_api.py](../../../../../apps/postulantes/defensas_api.py)
- [apps/postulantes/permissions.py](../../../../../apps/postulantes/permissions.py)
- [apps/postulantes/views.py](../../../../../apps/postulantes/views.py)
- [apps/postulantes/workflow.py](../../../../../apps/postulantes/workflow.py)
- [apps/reportes/resultados.py](../../../../../apps/reportes/resultados.py)
- [apps/reportes/views.py](../../../../../apps/reportes/views.py)
- [apps/usuarios/serializers.py](../../../../../apps/usuarios/serializers.py)
- [apps/usuarios/views.py](../../../../../apps/usuarios/views.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
