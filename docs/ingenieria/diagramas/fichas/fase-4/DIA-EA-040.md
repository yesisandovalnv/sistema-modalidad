# DIA-EA-040 — Excelencia Académica

- Identificador: DIA-EA-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-EA-001, UC-EA-002, UC-EA-003, UC-EA-004.
- Elementos: ACT-USR-001, ACT-USR-002, ACT-USR-003; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-EA-040.puml) · [SVG local](../../renderizados/fase-4/DIA-EA-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-EA-001 — Registrar evaluación de Excelencia](../../../03-casos-de-uso/especificaciones/UC-EA-001.md)
- [UC-EA-002 — Configurar criterio de Excelencia](../../../03-casos-de-uso/especificaciones/UC-EA-002.md)
- [UC-EA-003 — Concluir Excelencia Académica](../../../03-casos-de-uso/especificaciones/UC-EA-003.md)
- [UC-EA-004 — Consultar expediente de Excelencia](../../../03-casos-de-uso/especificaciones/UC-EA-004.md)

## Evidencia de código

- [apps/modalidades/excelencia_academica_api.py](../../../../../apps/modalidades/excelencia_academica_api.py)
- [apps/modalidades/excelencia_academica_service.py](../../../../../apps/modalidades/excelencia_academica_service.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
