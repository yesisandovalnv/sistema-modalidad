# Referencia y control de cambios — fase 7

Corrección documental autorizada de AUD-06-001 a AUD-06-010. Fuente de verdad: directorio de trabajo; sin cambios funcionales, ejecución de pruebas del producto, instalación ni acceso a PostgreSQL.

HEAD: `689eeb56ac6ff26b6e6487b3fd7100b9c484ea19`; rama: `desarrollo`. El [estado previo](estado-fase-7.json) conserva estado Git y 2415 huellas de archivos documentales y fuentes previamente inventariadas. La modificación local de `apps/modalidades/proyecto_grado.py` y los archivos ajenos a esta fase se conservan. La referencia de fases anteriores sigue siendo histórica; esta fase autoriza cambios documentales puntuales que invalidan sus comprobaciones de inmutabilidad para los artefactos corregidos.

## Fuentes editables y derivados afectados

| Hallazgo | Fuente editable / constructor | Derivados necesarios |
| --- | --- | --- |
| AUD-06-001 | `05-procesos-y-estados/datos_fase5.py` | DIA-POS-067: PlantUML, ficha, SVG; registro fase 5 |
| AUD-06-002 | `05-procesos-y-estados/modalidades_fase5.py` | DIA-PG-070: PlantUML, ficha, SVG; registro fase 5 |
| AUD-06-003 | `05-procesos-y-estados/secuencias_fase5.py` | DIA-POS-074: PlantUML, ficha, SVG; registro fase 5 |
| AUD-06-004 | `diagramas/construir_fase3.py` | DIA-POS-021: PlantUML, ficha, SVG; inventario AST y registro fase 3 |
| AUD-06-005 | `03-casos-de-uso/datos_fase4.py` | UC-DIP-001 y registro fase 4 |
| AUD-06-006 | constructor fase 4 y ampliación documental de permisos | Matriz de permisos por método y ruta |
| AUD-06-007 | `03-casos-de-uso/construir_fase4.py` | Catálogo de reglas: evidencia del handler y colaborador |
| AUD-06-008 | constructor y clasificación de cobertura fase 5 | Registro, fichas, cabeceras y matriz dinámica |
| AUD-06-009 | datos de excepciones y constructor fase 4 | 75 especificaciones; registro de pruebas por escenario y limitaciones |
| AUD-06-010 | README de seis modalidades | Aclaración de planificación histórica y entregables actuales |

Los constructores se invocan por funciones o selección; no se ejecuta una reconstrucción global de fases anteriores. Solo se renderizan diagramas cuyo contenido gráfico cambia. Cambios de metadatos PlantUML también deben quedar sincronizados con el registro de renderizado. Las verificaciones históricas no se reinterpretan como pruebas actuales.
