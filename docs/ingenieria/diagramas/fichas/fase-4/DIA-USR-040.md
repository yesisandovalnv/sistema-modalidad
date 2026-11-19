# DIA-USR-040 — Autenticación y usuarios

- Identificador: DIA-USR-040.
- Objetivo: Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.
- Alcance: UC-USR-001, UC-USR-002, UC-USR-003, UC-USR-004, UC-USR-005, UC-USR-006, UC-USR-009.
- Elementos: ACT-SYS-001, ACT-SYS-002, ACT-USR-001; objetivos enumerados a continuación.
- Versión: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Limitaciones: Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.

[Fuente PlantUML](../../fuentes/fase-4/DIA-USR-040.puml) · [SVG local](../../renderizados/fase-4/DIA-USR-040.svg) · [Permisos detallados](../../../02-actores-permisos/matriz-fase-4.md)

## Objetivos

- [UC-USR-001 — Iniciar sesión con usuario y contraseña](../../../03-casos-de-uso/especificaciones/UC-USR-001.md)
- [UC-USR-002 — Administrar cuentas de usuario](../../../03-casos-de-uso/especificaciones/UC-USR-002.md)
- [UC-USR-003 — Renovar tokens JWT](../../../03-casos-de-uso/especificaciones/UC-USR-003.md)
- [UC-USR-004 — Cerrar sesión](../../../03-casos-de-uso/especificaciones/UC-USR-004.md)
- [UC-USR-005 — Consultar perfil y capacidades propias](../../../03-casos-de-uso/especificaciones/UC-USR-005.md)
- [UC-USR-006 — Administrar roles](../../../03-casos-de-uso/especificaciones/UC-USR-006.md)
- [UC-USR-009 — Iniciar sesión estudiantil con R.U. y C.I.](../../../03-casos-de-uso/especificaciones/UC-USR-009.md)

## Evidencia de código

- [apps/usuarios/serializers.py](../../../../../apps/usuarios/serializers.py)
- [apps/usuarios/services.py](../../../../../apps/usuarios/services.py)
- [apps/usuarios/student_auth.py](../../../../../apps/usuarios/student_auth.py)
- [apps/usuarios/views.py](../../../../../apps/usuarios/views.py)
- [core/settings/base.py](../../../../../core/settings/base.py)

## Notación y lectura

Asociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.
