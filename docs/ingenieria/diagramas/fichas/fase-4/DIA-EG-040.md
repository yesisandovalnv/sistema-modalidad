# DIA-EG-040 — Examen de Grado

- Identificador: DIA-EG-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-EG-001, UC-EG-002, UC-EG-003.
- Elementos: ACT-USR-001, ACT-USR-002, ACT-USR-003; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-EG-040.puml) · [SVG local](../../renderizados/fase-4/DIA-EG-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-EG-001 — Registrar evaluación de un área de Examen](../../../03-casos-de-uso/especificaciones/UC-EG-001.md)
- [UC-EG-002 — Concluir Examen de Grado](../../../03-casos-de-uso/especificaciones/UC-EG-002.md)
- [UC-EG-003 — Consultar evaluación por áreas de Examen](../../../03-casos-de-uso/especificaciones/UC-EG-003.md)

## Evidencia de código

- [apps/modalidades/examen_grado_api.py](../../../../../apps/modalidades/examen_grado_api.py)
- [apps/modalidades/examen_grado_service.py](../../../../../apps/modalidades/examen_grado_service.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
