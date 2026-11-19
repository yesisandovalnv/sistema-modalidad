# DIA-POS-041 — Seguimiento de etapas

- Identificador: DIA-POS-041.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-POS-003, UC-POS-005, UC-POS-009, UC-POS-012, UC-POS-013, UC-POS-014, UC-POS-015.
- Elementos: ACT-POS-001, ACT-POS-002, ACT-USR-001; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-POS-041.puml) · [SVG local](../../renderizados/fase-4/DIA-POS-041.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-POS-003 — Ejecutar una transición de etapa](../../../03-casos-de-uso/especificaciones/UC-POS-003.md)
- [UC-POS-005 — Registrar una decisión académica de etapa](../../../03-casos-de-uso/especificaciones/UC-POS-005.md)
- [UC-POS-009 — Consultar seguimiento de etapas](../../../03-casos-de-uso/especificaciones/UC-POS-009.md)
- [UC-POS-012 — Inicializar el flujo](../../../03-casos-de-uso/especificaciones/UC-POS-012.md)
- [UC-POS-013 — Crear un nuevo intento de etapa](../../../03-casos-de-uso/especificaciones/UC-POS-013.md)
- [UC-POS-014 — Registrar dictamen documental](../../../03-casos-de-uso/especificaciones/UC-POS-014.md)
- [UC-POS-015 — Registrar evidencia de revisión previa](../../../03-casos-de-uso/especificaciones/UC-POS-015.md)

## Evidencia de código

- [apps/postulantes/decisiones_academicas.py](../../../../../apps/postulantes/decisiones_academicas.py)
- [apps/postulantes/dictamenes_revision.py](../../../../../apps/postulantes/dictamenes_revision.py)
- [apps/postulantes/revision_tribunal.py](../../../../../apps/postulantes/revision_tribunal.py)
- [apps/postulantes/serializers.py](../../../../../apps/postulantes/serializers.py)
- [apps/postulantes/views.py](../../../../../apps/postulantes/views.py)
- [apps/postulantes/workflow.py](../../../../../apps/postulantes/workflow.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
