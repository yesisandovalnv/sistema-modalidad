# DIA-SYS-008 — Atlas de persistencia lógica

## Objetivo y alcance

Documentar las 40 entidades propias mediante vistas ER modulares, sin construir un diagrama gigante. DIA-SYS-008 conserva el identificador reservado de la fase anterior como entrada del atlas; los diagramas individuales tienen IDs propios en el [registro](../diagramas/README.md).

La fuente principal es el directorio de trabajo, descrito en la [referencia](../00-alcance-y-evidencia/referencia-fase-3.md). El [diccionario](diccionario-fase-3.md) conserva campos, opciones, restricciones e índices; la [extracción AST](modelo-logico-fase-3.json) permite contrastar el inventario sin importar Django.

La [matriz de entidades y vistas](trazabilidad-vistas-fase-3.md) permite localizar la vista principal de clases y ER de cada entidad.

## Vistas y convenciones

| Área | Contenido |
| --- | --- |
| Usuarios | Rol, usuario, auditoría y control de intentos de acceso |
| Académico | Periodos, modalidades, requisitos, etapas y documentos oficiales |
| Postulaciones | Postulación, estado general, historial y observaciones |
| Etapas | Ejecución de etapa y referencias de contexto |
| Asignaciones y decisiones | Participaciones, decisiones y memorandos |
| Condiciones y entregas | Controles complementarios |
| Defensas | Evento, participantes y evaluación |
| Dictámenes | Revisiones vinculadas a versiones |
| Documentos | Tipos, estados, documento y versiones |
| Correcciones | Observaciones y confirmaciones |
| Notificaciones | Destinatario, actor y contexto de postulación |
| Modalidades | Examen, Excelencia, Diplomado y Trabajo Dirigido por separado |

La notación ER usa extremos de ingeniería de información: cero o muchos, cero o uno y exactamente uno. El máximo inverso de ForeignKey es muchos; OneToOne o unique de campo lo limita a uno. La nulabilidad define el mínimo del extremo referenciado. Unicidad condicional o compuesta no equivale a unicidad global de una FK.

Las restricciones Meta seleccionadas se muestran en notas; la lista completa está en el diccionario. Las reglas de clean o servicios pueden imponer condiciones adicionales sobre registros activos o contextos académicos; no se convierten en cardinalidades físicas permanentes.

## Claves e intermediarias

PK id BigAutoField derivada de la configuración y corroborada por migraciones, sin consultar el catálogo PostgreSQL. Los campos FK llevan sufijo _id en las vistas ER como convención del ORM, no como comprobación de columnas instaladas. No se han encontrado db_column o claves primarias propias que requieran excepción en este inventario.

La relación M2M de memorando/asignaciones se muestra tanto directamente como mediante una intermedia conceptual derivada. No se inventa un nombre físico de tabla. Los M2M de autenticación heredados se corroboran en la migración inicial de usuarios y aparecen en una vista complementaria.

## Modelo lógico frente a esquema físico

IMPLEMENTADO: declaraciones de modelos y migraciones versionadas. INFERENCIA: materialización convencional de PK y tabla intermedia a partir del ORM. PENDIENTE: migraciones efectivamente aplicadas, tablas, columnas, índices y restricciones instalados, datos, cardinalidades observadas y esquema completo del framework.

No se ha conectado a PostgreSQL ni ejecutado migraciones. Un diagrama lógico correcto no acredita el esquema físico ni la ausencia de divergencias. La eventual introspección física necesita autorización independiente.
