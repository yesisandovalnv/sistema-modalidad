# DIA-POS-043 — Defensas y evaluaciones

- Identificador: DIA-POS-043.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-POS-006, UC-POS-007, UC-POS-018, UC-POS-019, UC-POS-020, UC-POS-021, UC-POS-022.
- Elementos: ACT-POS-001, ACT-POS-002, ACT-USR-001, ACT-USR-002, ACT-USR-003; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-POS-043.puml) · [SVG local](../../renderizados/fase-4/DIA-POS-043.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-POS-006 — Administrar el ciclo de una defensa](../../../03-casos-de-uso/especificaciones/UC-POS-006.md)
- [UC-POS-007 — Consolidar la evaluación de una defensa](../../../03-casos-de-uso/especificaciones/UC-POS-007.md)
- [UC-POS-018 — Consultar defensas y quórum](../../../03-casos-de-uso/especificaciones/UC-POS-018.md)
- [UC-POS-019 — Administrar participantes de defensa](../../../03-casos-de-uso/especificaciones/UC-POS-019.md)
- [UC-POS-020 — Registrar asistencia de defensa](../../../03-casos-de-uso/especificaciones/UC-POS-020.md)
- [UC-POS-021 — Registrar evaluación de defensa](../../../03-casos-de-uso/especificaciones/UC-POS-021.md)
- [UC-POS-022 — Consultar o recalcular resultado final](../../../03-casos-de-uso/especificaciones/UC-POS-022.md)

## Evidencia de código

- [apps/postulantes/defensas.py](../../../../../apps/postulantes/defensas.py)
- [apps/postulantes/defensas_api.py](../../../../../apps/postulantes/defensas_api.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
