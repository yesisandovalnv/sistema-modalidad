# Validación de fase 3

## Estado de la entrega

Fase 3 completada el 2026-11-02 (America/La_Paz): 52 fuentes PlantUML comprobadas con el parser oficial y 52 SVG generados localmente. Se revisaron visualmente las vistas mediante hojas de contacto y ampliaciones de las vistas más densas. No se enviaron fuentes ni código a servicios externos.

## Herramientas comprobadas

Inicialmente no se localizaron java, plantuml o dot en PATH ni una distribución portable. Tras la autorización del usuario se prepararon herramientas locales únicamente bajo docs/ingenieria/diagramas/herramientas/, sin modificar PATH ni configuración permanente. No se inició Docker.

Herramientas fijadas: PlantUML 1.2026.9, Eclipse Temurin JRE 21.0.13+9 y Graphviz 2.44.1 incluido en PlantUML para Windows. No fue necesaria una instalación separada de Graphviz. Las descargas del JAR y del JRE se contrastaron con sus SHA-256 oficiales antes de ejecutarlas. [Procedencia y huellas](../diagramas/herramientas/procedencia.json), [instrucciones](../diagramas/herramientas/README.md).

El proceso usa un perfil PlantUML ALLOWLIST limitado al directorio documental, incluye solo estilos locales y dirige temporales y preferencias al área de herramientas. Los binarios y las previsualizaciones auxiliares quedan excluidos del versionado mediante archivos .gitignore locales a documentación.

## Controles reproducibles de solo lectura

- python docs/ingenieria/10-trazabilidad-y-validacion/verificar.py
- python docs/ingenieria/10-trazabilidad-y-validacion/validar_fase3.py
- python docs/ingenieria/diagramas/renderizar_local.py
- python docs/ingenieria/10-trazabilidad-y-validacion/revisar_renderizados.py
- git diff --check

El primer control revisa Markdown, enlaces, IDs, símbolos de trazabilidad y fotografía de fase 2. Se adaptó su límite para permitir diagramas con registro de fase 3, conservando las comprobaciones originales.

Las licencias Markdown originales del JRE descargado se excluyen de las convenciones editoriales del sistema: se conservan intactas y no son documentos de ingeniería propios. El README y la procedencia redactados para las herramientas sí forman parte de los controles.

El segundo comprueba registro/fuentes, metadatos, includes locales, delimitadores, llaves estructurales, cobertura de entidades, operaciones y herencias declaradas, relaciones y cardinalidades, campos/nulabilidad contra AST y huellas exteriores. También contrasta hashes de fuentes, estilo y SVG con el registro del renderizado.

El renderizador ejecuta comprobación oficial de sintaxis sobre las 52 fuentes y genera SVG. El control geométrico posterior revisa límites y posibles intersecciones de texto. [Resultado y comandos exactos](logs-renderizado/resultado.json), [geometría final](logs-renderizado/geometria-svg.json). Ambos controles se complementan con revisión humana, sin sustituirla.

## Resultados

Controles estáticos completados sin errores:

| Control | Resultado |
| --- | --- |
| Fuentes registradas | 52: 33 vistas de clases/diseño, 16 ER y una de despliegue más dos de componentes |
| Entidades propias | 40, cada una con vista principal de clases y ER |
| Relaciones contrastadas | 172 apariciones: 86 relaciones propias reflejadas en clases y ER |
| Operaciones de diseño | 221 operaciones seleccionadas existentes en las clases fuente |
| Herencias de diseño | 24 vínculos contrastados contra las bases declaradas |
| Markdown y enlaces | Comprobados sin errores; valores actuales informados por verificar.py |
| Identificadores de vistas | 57: 52 fuentes, cuatro reservas de comportamiento y la entrada del atlas |
| Archivos exteriores | 1.724 huellas SHA-256 conservadas |
| Estado Git exterior | Sin cambios respecto a la fotografía de fase 3 |
| git diff --check | Sin errores |
| Parser oficial PlantUML | 52 fuentes correctas, código de salida 0 |
| SVG | 52/52 generados, XML válido y hashes registrados |
| Geometría de texto | 0 textos fuera del viewBox y 0 avisos de superposición con el umbral documentado |
| Revisión visual | Nueve hojas de contacto y ampliaciones de vistas densas, aprobadas tras ajustes documentales |

Las relaciones heredadas de autenticación y la intermedia conceptual se documentan como complementos; no se mezclan con las 86 relaciones declaradas en modelos propios. Los números de enlaces y documentos cambian si se amplía la documentación; los scripts informan los valores actuales.

## Ajustes derivados de la revisión

La primera salida, aunque sintácticamente válida, presentó superposiciones entre etiquetas de aristas y contenido de clases. Se confirmó visualmente y se retiró el trazado ortogonal forzado del estilo común. Se conserva la [medición inicial](logs-renderizado/geometria-inicial.json) y la medición final, sin cambiar entidades ni cardinalidades.

El contraste adicional de herencias encontró que el generador no resolvía una base declarada en el mismo archivo: ProyectoGradoEvaluacionPolicy hereda de ProyectoGradoLegacyEvaluacionPolicy. Se corrigió la resolución documental y se agregó su control por AST. También se reemplazaron anotaciones parentéticas por estereotipos NULL/UQ en dos vistas complementarias para que PlantUML no interpretara atributos como operaciones. No se modificó código del sistema.

## Límites que permanecen

El control de cajas de texto es heurístico: no demuestra ausencia de cualquier cruce de líneas o problema tipográfico. Las vistas conservan tamaño natural y admiten ampliación SVG; los cruces de relaciones que permanecen no alteran su semántica. Las operaciones y atributos mostrados son selecciones documentadas, no inventarios completos de cada interfaz.

La [revisión visual registrada](logs-renderizado/revision-visual.json) identifica las vistas inspeccionadas. La [comprobación de la galería](logs-renderizado/galeria.json) confirma 52 imágenes, 208 rutas locales existentes, ausencia de recursos remotos y sintaxis JavaScript correcta. No se presenta esta revisión como una prueba automatizada de interfaz en navegador.

No se ejecutaron pruebas del producto ni se comprobaron tablas PostgreSQL, servicios activos, normativa o infraestructura productiva. El modelo lógico sigue separado del esquema físico instalado.

Fuentes, fichas y SVG están enlazados en el [registro](../diagramas/README.md) y la [galería local](../diagramas/renderizados/index.html). La fase 4 no se ha iniciado y requiere autorización independiente.
