# Selección justificada para el documento principal

**Propuesta pendiente de aprobación:** 25 figuras existentes: 19 transversales y seis específicas. La cantidad deriva de las preguntas técnicas que hay que explicar, no de una cuota. Los 118 diagramas permanecen disponibles en el anexo; los 93 no seleccionados no se descartan ni se consideran funciones menos importantes.

## Criterios de decisión

1. Explicar actores y operaciones centrales sin convertir cargos académicos en permisos.
2. Mostrar arquitectura lógica y despliegue declarado por separado.
3. Cubrir estructura de dominio, integridad de datos, decisiones, interacciones y ciclos de estado sin repetir la misma vista como clase y ER.
4. Contrastar las seis modalidades con un ejemplo propio de cada una, conservando guardas específicas.
5. Elegir recorridos cuyo valor técnico justifique el espacio; la complejidad visual queda registrada y puede requerir una propuesta adicional de maquetación.

Se incluyen 23 diagramas UML y dos modelos ER lógicos complementarios. ER no se presenta como un diagrama UML estándar. Los números de figura son editoriales y provisionales; no sustituyen los identificadores DIA.

| Figura | ID | Título académico | Tipo | Justificación |
| --- | --- | --- | --- | --- |
| 01 | DIA-SYS-001 | [ Actores y objetivos principales del sistema ](explicacion-diagramas.md#figura-01) | Casos de uso | Delimita el sistema y diferencia actores de cargos académicos antes de explicar tecnología. |
| 02 | DIA-POS-041 | [ Casos de uso del seguimiento académico ](explicacion-diagramas.md#figura-02) | Casos de uso | Expone la responsabilidad operativa central y separa consulta, transición, decisión y nuevo intento. |
| 03 | DIA-DOC-040 | [ Casos de uso de la gestión de evidencias documentales ](explicacion-diagramas.md#figura-03) | Casos de uso | Permite explicar carga, versiones, revisión y corrección sin mezclar sus responsabilidades. |
| 04 | DIA-POS-043 | [ Casos de uso de defensas y evaluación ](explicacion-diagramas.md#figura-04) | Casos de uso | Explica quién consulta y quién registra los actos académicos; evita confundir evaluador registrado con operador. |
| 05 | DIA-SYS-006 | [ Arquitectura de componentes del sistema ](explicacion-diagramas.md#figura-05) | Componentes | Relaciona React, backend, políticas, persistencia, archivos y notificaciones en una sola vista arquitectónica. |
| 06 | DIA-MOD-002 | [ Motor común y especialización por modalidad ](explicacion-diagramas.md#figura-06) | Componentes | Justifica reutilización técnica sin generalizar reglas académicas. |
| 07 | DIA-SYS-007 | [ Despliegue local declarado mediante Docker Compose ](explicacion-diagramas.md#figura-07) | Despliegue | Separa arquitectura lógica de infraestructura comprobable y delimita desarrollo frente a producción. |
| 08 | DIA-POS-001 | [ Modelo de dominio del expediente y su historial ](explicacion-diagramas.md#figura-08) | Clases | Presenta el agregado conceptual de postulación y separa estado, historial y observación. |
| 09 | DIA-POS-002 | [ Modelo de dominio del seguimiento por etapa e intento ](explicacion-diagramas.md#figura-09) | Clases | Explica por qué cada ejecución de una etapa necesita un registro de seguimiento propio. |
| 10 | DIA-DOC-101 | [ Modelo entidad–relación lógico de documentos y versiones ](explicacion-diagramas.md#figura-10) | ER lógico | Introduce persistencia de evidencias sin repetir como ER el modelo de clases del expediente. |
| 11 | DIA-POS-105 | [ Modelo entidad–relación lógico de defensas, participantes y evaluaciones ](explicacion-diagramas.md#figura-11) | ER lógico | Explica integridad entre evento, participación y resultado, donde las restricciones son relevantes para auditoría. |
| 12 | DIA-SYS-003 | [ Registro operativo y registro histórico de postulaciones ](explicacion-diagramas.md#figura-12) | Actividades | Evita que el tribunal interprete un registro histórico como ejecución académica completa. |
| 13 | DIA-POS-061 | [ Validaciones y ejecución de operaciones sobre etapas ](explicacion-diagramas.md#figura-13) | Actividades | Explica el orden de autoridad, bloqueo, estado y política antes de mutar seguimiento. |
| 14 | DIA-DOC-070 | [ Interacción para carga y versionado de documentos ](explicacion-diagramas.md#figura-14) | Secuencia | Expone una frontera de consistencia importante: transacción SQL frente a almacenamiento de archivos. |
| 15 | DIA-POS-073 | [ Interacción para consolidación de evaluación y efectos académicos ](explicacion-diagramas.md#figura-15) | Secuencia | Relaciona consolidación, policy y workflow, incluyendo reintento y rollback. |
| 16 | DIA-POS-074 | [ Interacción de conclusión académica mediante el motor común ](explicacion-diagramas.md#figura-16) | Secuencia | Separa concluir de actualizar administrativamente un estado o de aprobar una sola etapa. |
| 17 | DIA-POS-081 | [ Estados técnicos del seguimiento académico ](explicacion-diagramas.md#figura-17) | Estados | Permite diferenciar intento pendiente, operación en curso, observación y resultados de etapa. |
| 18 | DIA-DOC-080 | [ Estados de revisión y observaciones del documento ](explicacion-diagramas.md#figura-18) | Estados | Separa revisión documental, nueva versión y necesidad de corrección. |
| 19 | DIA-POS-082 | [ Estados del evento de defensa ](explicacion-diagramas.md#figura-19) | Estados | Permite explicar programación, ejecución, suspensión, cancelación y reprogramación sin equipararlas al estado de etapa. |
| 20 | DIA-PG-070 | [ Proyecto de Grado: cierre documental, conclusión y reapertura ](explicacion-diagramas.md#figura-20) | Secuencia | Justifica la particularidad de Proyecto frente a la conclusión común y conserva la corrección de idempotencia. |
| 21 | DIA-TG-060 | [ Tesis de Grado: recorrido nominal y conclusión específica ](explicacion-diagramas.md#figura-21) | Actividades | Explica temática, perfil, revisiones y cierre académico propios sin adoptar el cierre documental de Proyecto. |
| 22 | DIA-TD-060 | [ Trabajo Dirigido: recorrido institucional y conclusión ](explicacion-diagramas.md#figura-22) | Actividades | Permite relacionar ejecución institucional, informes y conclusión sin ocultar dependencias del motor común. |
| 23 | DIA-EG-080 | [ Examen de Grado: estados del área evaluada ](explicacion-diagramas.md#figura-23) | Estados | Contrasta la evaluación por áreas e intentos con las defensas de Proyecto/Tesis. |
| 24 | DIA-EA-080 | [ Excelencia Académica: resultado de la evaluación según criterio ](explicacion-diagramas.md#figura-24) | Estados | Representa una modalidad que no debe explicarse mediante una defensa numérica universal. |
| 25 | DIA-DIP-080 | [ Vía Diplomado: estados del resultado de un módulo ](explicacion-diagramas.md#figura-25) | Estados | Separa la calificación del módulo de la aprobación de SeguimientoEtapa, corregida en UC-DIP-001. |

## Equilibrio de cobertura

| Familia | Figuras seleccionadas |
| --- | --- |
| Casos de uso | 4 |
| Componentes | 2 |
| Despliegue | 1 |
| Clases | 2 |
| ER lógico | 2 |
| Actividades | 4 |
| Secuencia | 4 |
| Estados | 6 |

La vista general resume ocho objetivos y no pretende representar todos los UC. Los detalles de autenticación, catálogos, reportes, notificaciones y asignaciones se localizan en el anexo, las fichas y la matriz de permisos; no se omiten del inventario funcional. Para explicar eventos internos, la Figura 5 se complementa con DIA-NOT-070 en anexo cuando el tribunal requiera más detalle.

## Cobertura específica de modalidades

| Modalidad | Figura principal | Aporte que no se generaliza |
| --- | --- | --- |
| Proyecto de Grado | Figura 20: DIA-PG-070 | Cierre documental, retorno idempotente y reapertura |
| Tesis de Grado | Figura 21: DIA-TG-060 | Temática/perfil y gate de ACTA_DEFENSA |
| Trabajo Dirigido | Figura 22: DIA-TD-060 | Contexto institucional, cierre y acta propios |
| Examen de Grado | Figura 23: DIA-EG-080 | Resultado por área e intentos |
| Excelencia Académica | Figura 24: DIA-EA-080 | Criterio y resultado cualitativo |
| Graduación vía Diplomado | Figura 25: DIA-DIP-080 | Resultado del módulo separado del seguimiento |

## Evitar repeticiones

Las clases seleccionadas explican expediente/seguimiento; los ER seleccionados se concentran en documentos/defensas. Las vistas ER equivalentes del expediente quedan en anexo. La actividad de alta sustituye en la exposición a su secuencia detallada DIA-SYS-004; la actividad de operaciones de etapa se complementa con estados, sin repetir DIA-POS-070 como otra figura principal. Para Examen, Excelencia y Diplomado se prefieren sus estados específicos frente a repetir tres bucles nominales de coordinación de estructura similar. Proyecto usa una secuencia de cierre propia; Tesis y Trabajo Dirigido conservan sus recorridos nominales porque exponen etapas y condiciones diferentes.

La selección responde al documento escrito. Para exposición oral se recomienda recorrer primero Figuras 01, 05, 06, 08, 13, 16 y 17 y usar las demás al desarrollar procesos o responder preguntas; esto es una propuesta editorial, no otra selección oficial ni un límite de diapositivas. Ninguna figura se declara lista para una página reducida hasta aprobar su evaluación visual.

[Índice](README.md) · [Evaluación visual](evaluacion-visual.md) · [Inventario completo](inventario-anexos.md).
