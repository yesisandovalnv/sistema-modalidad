# DIA-TG-040 — Tesis de Grado

- Identificador: DIA-TG-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-TG-001.
- Elementos: ACT-USR-001; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-TG-040.puml) · [SVG local](../../renderizados/fase-4/DIA-TG-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-TG-001 — Concluir Tesis con acta y defensa válidas](../../../03-casos-de-uso/especificaciones/UC-TG-001.md)

## Evidencia de código

- [apps/modalidades/tesis_grado.py](../../../../../apps/modalidades/tesis_grado.py)
- [apps/postulantes/views.py](../../../../../apps/postulantes/views.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.

Tesis especializa la conclusión común UC-POS-008 mediante generalización; el padre es una referencia, no un caso nuevo. Las guardas de ACTA_DEFENSA y etapas propias permanecen en la política de Tesis.
