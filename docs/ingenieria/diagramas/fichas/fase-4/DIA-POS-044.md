# DIA-POS-044 — Condiciones y entrega física

- Identificador: DIA-POS-044.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-POS-023, UC-POS-026, UC-POS-027.
- Elementos: ACT-POS-001, ACT-POS-002, ACT-USR-001; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-POS-044.puml) · [SVG local](../../renderizados/fase-4/DIA-POS-044.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-POS-023 — Verificar condiciones complementarias](../../../03-casos-de-uso/especificaciones/UC-POS-023.md)
- [UC-POS-026 — Recepcionar entrega física](../../../03-casos-de-uso/especificaciones/UC-POS-026.md)
- [UC-POS-027 — Consultar condiciones y entregas](../../../03-casos-de-uso/especificaciones/UC-POS-027.md)

## Evidencia de código

- [apps/postulantes/complementarios.py](../../../../../apps/postulantes/complementarios.py)
- [apps/postulantes/complementarios_api.py](../../../../../apps/postulantes/complementarios_api.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
