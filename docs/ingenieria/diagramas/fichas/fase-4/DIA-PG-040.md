# DIA-PG-040 — Proyecto de Grado

- Identificador: DIA-PG-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-PG-001, UC-PG-002.
- Elementos: ACT-USR-001; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-PG-040.puml) · [SVG local](../../renderizados/fase-4/DIA-PG-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-PG-001 — Publicar memorando de designación de Proyecto](../../../03-casos-de-uso/especificaciones/UC-PG-001.md)
- [UC-PG-002 — Operar el cierre técnico de Proyecto](../../../03-casos-de-uso/especificaciones/UC-PG-002.md)

## Evidencia de código

- [apps/postulantes/cierre.py](../../../../../apps/postulantes/cierre.py)
- [apps/postulantes/cierre_api.py](../../../../../apps/postulantes/cierre_api.py)
- [apps/postulantes/memorandums.py](../../../../../apps/postulantes/memorandums.py)
- [apps/postulantes/views.py](../../../../../apps/postulantes/views.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
