# DIA-POS-042 — Asignaciones académicas

- Identificador: DIA-POS-042.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-POS-004, UC-USR-007, UC-USR-008, UC-POS-016, UC-POS-017.
- Elementos: ACT-POS-001, ACT-POS-002, ACT-USR-001; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-POS-042.puml) · [SVG local](../../renderizados/fase-4/DIA-POS-042.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-POS-004 — Asignar un actor académico](../../../03-casos-de-uso/especificaciones/UC-POS-004.md)
- [UC-USR-007 — Consultar estudiantes para postulación](../../../03-casos-de-uso/especificaciones/UC-USR-007.md)
- [UC-USR-008 — Consultar candidatos a asignación](../../../03-casos-de-uso/especificaciones/UC-USR-008.md)
- [UC-POS-016 — Consultar asignaciones e historial de cargos](../../../03-casos-de-uso/especificaciones/UC-POS-016.md)
- [UC-POS-017 — Finalizar o reemplazar asignación](../../../03-casos-de-uso/especificaciones/UC-POS-017.md)

## Evidencia de código

- [apps/postulantes/asignaciones.py](../../../../../apps/postulantes/asignaciones.py)
- [apps/postulantes/views.py](../../../../../apps/postulantes/views.py)
- [apps/usuarios/views.py](../../../../../apps/usuarios/views.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
