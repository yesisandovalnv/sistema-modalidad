# DIA-NOT-040 — Notificaciones

- Identificador: DIA-NOT-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-NOT-001, UC-NOT-002.
- Elementos: ACT-SYS-002; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-NOT-040.puml) · [SVG local](../../renderizados/fase-4/DIA-NOT-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-NOT-001 — Consultar notificaciones propias](../../../03-casos-de-uso/especificaciones/UC-NOT-001.md)
- [UC-NOT-002 — Actualizar lectura de notificaciones propias](../../../03-casos-de-uso/especificaciones/UC-NOT-002.md)

## Evidencia de código

- [apps/notificaciones/services.py](../../../../../apps/notificaciones/services.py)
- [apps/notificaciones/views.py](../../../../../apps/notificaciones/views.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
