# DIA-POS-040 — Postulaciones

- Identificador: DIA-POS-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-POS-001, UC-POS-002, UC-POS-008, UC-POS-028, UC-POS-010, UC-POS-011, UC-POS-024, UC-POS-025.
- Elementos: ACT-POS-001, ACT-POS-002, ACT-USR-001, ACT-USR-002, ACT-USR-003; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-POS-040.puml) · [SVG local](../../renderizados/fase-4/DIA-POS-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-POS-001 — Registrar una postulación con seguimiento](../../../03-casos-de-uso/especificaciones/UC-POS-001.md)
- [UC-POS-002 — Consultar postulaciones y expediente](../../../03-casos-de-uso/especificaciones/UC-POS-002.md)
- [UC-POS-008 — Concluir académicamente por el motor común](../../../03-casos-de-uso/especificaciones/UC-POS-008.md)
- [UC-POS-028 — Administrar estados técnicos de postulación](../../../03-casos-de-uso/especificaciones/UC-POS-028.md)
- [UC-POS-010 — Consultar historial y observaciones](../../../03-casos-de-uso/especificaciones/UC-POS-010.md)
- [UC-POS-011 — Registrar una postulación histórica](../../../03-casos-de-uso/especificaciones/UC-POS-011.md)
- [UC-POS-024 — Cambiar estado general administrativamente](../../../03-casos-de-uso/especificaciones/UC-POS-024.md)
- [UC-POS-025 — Registrar observación de postulación](../../../03-casos-de-uso/especificaciones/UC-POS-025.md)

## Evidencia de código

- [apps/postulantes/permissions.py](../../../../../apps/postulantes/permissions.py)
- [apps/postulantes/serializers.py](../../../../../apps/postulantes/serializers.py)
- [apps/postulantes/services.py](../../../../../apps/postulantes/services.py)
- [apps/postulantes/views.py](../../../../../apps/postulantes/views.py)
- [apps/postulantes/workflow.py](../../../../../apps/postulantes/workflow.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
