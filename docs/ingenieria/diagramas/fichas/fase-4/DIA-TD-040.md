# DIA-TD-040 — Trabajo Dirigido

- Identificador: DIA-TD-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-TD-001, UC-TD-002, UC-TD-003, UC-TD-004.
- Elementos: ACT-USR-001, ACT-USR-002, ACT-USR-003; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-TD-040.puml) · [SVG local](../../renderizados/fase-4/DIA-TD-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-TD-001 — Configurar institución de Trabajo Dirigido](../../../03-casos-de-uso/especificaciones/UC-TD-001.md)
- [UC-TD-002 — Registrar informe institucional de Trabajo Dirigido](../../../03-casos-de-uso/especificaciones/UC-TD-002.md)
- [UC-TD-003 — Concluir Trabajo Dirigido](../../../03-casos-de-uso/especificaciones/UC-TD-003.md)
- [UC-TD-004 — Consultar expediente específico de Trabajo Dirigido](../../../03-casos-de-uso/especificaciones/UC-TD-004.md)

## Evidencia de código

- [apps/modalidades/trabajo_dirigido_api.py](../../../../../apps/modalidades/trabajo_dirigido_api.py)
- [apps/modalidades/trabajo_dirigido_service.py](../../../../../apps/modalidades/trabajo_dirigido_service.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
