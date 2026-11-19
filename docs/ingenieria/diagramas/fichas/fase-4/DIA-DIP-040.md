# DIA-DIP-040 — Graduación vía Diplomado

- Identificador: DIA-DIP-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-DIP-001, UC-DIP-002, UC-DIP-003.
- Elementos: ACT-USR-001, ACT-USR-002, ACT-USR-003; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-DIP-040.puml) · [SVG local](../../renderizados/fase-4/DIA-DIP-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-DIP-001 — Registrar el resultado de un módulo de Diplomado](../../../03-casos-de-uso/especificaciones/UC-DIP-001.md)
- [UC-DIP-002 — Concluir graduación vía Diplomado](../../../03-casos-de-uso/especificaciones/UC-DIP-002.md)
- [UC-DIP-003 — Consultar módulos y resultado de Diplomado](../../../03-casos-de-uso/especificaciones/UC-DIP-003.md)

## Evidencia de código

- [apps/modalidades/diplomado_api.py](../../../../../apps/modalidades/diplomado_api.py)
- [apps/modalidades/diplomado_service.py](../../../../../apps/modalidades/diplomado_service.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
