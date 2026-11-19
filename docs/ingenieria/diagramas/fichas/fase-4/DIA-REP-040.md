# DIA-REP-040 — Reportes

- Identificador: DIA-REP-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-REP-001, UC-REP-002, UC-REP-003, UC-REP-004.
- Elementos: ACT-USR-001, ACT-USR-003; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-REP-040.puml) · [SVG local](../../renderizados/fase-4/DIA-REP-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-REP-001 — Consultar resultados académicos institucionales](../../../03-casos-de-uso/especificaciones/UC-REP-001.md)
- [UC-REP-002 — Consultar dashboard institucional](../../../03-casos-de-uso/especificaciones/UC-REP-002.md)
- [UC-REP-003 — Consultar reporte de postulaciones](../../../03-casos-de-uso/especificaciones/UC-REP-003.md)
- [UC-REP-004 — Exportar un reporte institucional](../../../03-casos-de-uso/especificaciones/UC-REP-004.md)

## Evidencia de código

- [apps/reportes/permissions.py](../../../../../apps/reportes/permissions.py)
- [apps/reportes/resultados.py](../../../../../apps/reportes/resultados.py)
- [apps/reportes/services.py](../../../../../apps/reportes/services.py)
- [apps/reportes/views.py](../../../../../apps/reportes/views.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
