# DIA-USR-061 — Mantenimiento de usuarios y roles

- Identificador: DIA-USR-061.
- Tipo UML: Actividades.
- Objetivo: Documentar el comportamiento implementado de mantenimiento de usuarios y roles, con decisiones, guardas y límites de evidencia.
- Alcance: Administración de cuentas y roles; Compartido; las políticas conservan el alcance académico de cada modalidad.
- Proceso: PROC-USR-001.
- Casos relacionados: UC-USR-002, UC-USR-006 (contexto de familia; no acredita cobertura directa).
- Recorridos directos: UC-USR-002, UC-USR-006.
- Reglas observadas: RN-USR-102, RN-USR-106.
- Componentes: CMP-CORE-001, CMP-USR-001.
- Entidades relacionadas: ENT-USR-001, ENT-USR-002.
- Versión documentada: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19 / desarrollo / directorio de trabajo 2026-11-02.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

[Fuente PlantUML](../../fuentes/fase-5/actividades/DIA-USR-061.puml) · [SVG](../../renderizados/fase-5/DIA-USR-061.svg) · [Trazabilidad](../../../10-trazabilidad-y-validacion/matriz-fase-5.md).

## Interpretación y limitaciones

Las acciones de un catálogo o ciclo son variantes por solicitud; no ejecución obligatoria de todo CRUD. Guardas académicas delegadas a la política citada.

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. DIRECTA acredita un recorrido selectivo del objetivo, no todas sus variantes ni ejecución. Contexto de familia y pruebas por afinidad se conservan separados.

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

- [RoleAdminSerializer (L178)](../../../../../apps/usuarios/serializers.py).
- [UserAdminSerializer (L190)](../../../../../apps/usuarios/serializers.py).
- [RoleAdminViewSet (L146)](../../../../../apps/usuarios/views.py).
- [UserAdminViewSet (L126)](../../../../../apps/usuarios/views.py).

## Pruebas relacionadas

Referencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.

- [apps/usuarios/tests_admin_api.py](../../../../../apps/usuarios/tests_admin_api.py).
