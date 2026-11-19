# DIA-ACA-040 — Gestión académica

- Identificador: DIA-ACA-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-ACA-001, UC-ACA-002, UC-ACA-007, UC-ACA-003, UC-ACA-004, UC-ACA-005, UC-ACA-006.
- Elementos: ACT-SYS-002, ACT-USR-001; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-ACA-040.puml) · [SVG local](../../renderizados/fase-4/DIA-ACA-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-ACA-001 — Actualizar una modalidad existente](../../../03-casos-de-uso/especificaciones/UC-ACA-001.md)
- [UC-ACA-002 — Publicar o sustituir un documento oficial de modalidad](../../../03-casos-de-uso/especificaciones/UC-ACA-002.md)
- [UC-ACA-007 — Consultar periodos y requisitos](../../../03-casos-de-uso/especificaciones/UC-ACA-007.md)
- [UC-ACA-003 — Administrar periodos](../../../03-casos-de-uso/especificaciones/UC-ACA-003.md)
- [UC-ACA-004 — Administrar requisitos y relaciones de modalidad](../../../03-casos-de-uso/especificaciones/UC-ACA-004.md)
- [UC-ACA-005 — Consultar modalidades y capacidades](../../../03-casos-de-uso/especificaciones/UC-ACA-005.md)
- [UC-ACA-006 — Consultar o descargar documentos oficiales](../../../03-casos-de-uso/especificaciones/UC-ACA-006.md)

## Evidencia de código

- [apps/academico/serializers.py](../../../../../apps/academico/serializers.py)
- [apps/academico/views.py](../../../../../apps/academico/views.py)
- [apps/modalidades/policies.py](../../../../../apps/modalidades/policies.py)
- [core/permissions.py](../../../../../core/permissions.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
