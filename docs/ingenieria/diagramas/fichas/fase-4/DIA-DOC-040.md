# DIA-DOC-040 — Gestión documental

- Identificador: DIA-DOC-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-DOC-001, UC-DOC-002, UC-DOC-007, UC-DOC-008, UC-DOC-003, UC-DOC-004, UC-DOC-005, UC-DOC-006.
- Elementos: ACT-POS-001, ACT-POS-002, ACT-SYS-002, ACT-USR-001; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-DOC-040.puml) · [SVG local](../../renderizados/fase-4/DIA-DOC-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-DOC-001 — Cargar un documento o una nueva versión](../../../03-casos-de-uso/especificaciones/UC-DOC-001.md)
- [UC-DOC-002 — Revisar un documento presentado](../../../03-casos-de-uso/especificaciones/UC-DOC-002.md)
- [UC-DOC-007 — Consultar catálogos documentales y estados técnicos](../../../03-casos-de-uso/especificaciones/UC-DOC-007.md)
- [UC-DOC-008 — Administrar tipos y estados documentales](../../../03-casos-de-uso/especificaciones/UC-DOC-008.md)
- [UC-DOC-003 — Consultar documentos y descargar versiones](../../../03-casos-de-uso/especificaciones/UC-DOC-003.md)
- [UC-DOC-004 — Marcar observación documental como corregida](../../../03-casos-de-uso/especificaciones/UC-DOC-004.md)
- [UC-DOC-005 — Registrar confirmación técnica entre versiones](../../../03-casos-de-uso/especificaciones/UC-DOC-005.md)
- [UC-DOC-006 — Adjuntar evidencia a un registro histórico](../../../03-casos-de-uso/especificaciones/UC-DOC-006.md)

## Evidencia de código

- [apps/documentos/services.py](../../../../../apps/documentos/services.py)
- [apps/documentos/views.py](../../../../../apps/documentos/views.py)
- [apps/postulantes/views.py](../../../../../apps/postulantes/views.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
