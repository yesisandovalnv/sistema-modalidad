# Informe de fase 8 — preparación académica

## Resumen ejecutivo

Se preparó una propuesta de análisis y diseño con 25 figuras existentes: 19 transversales y seis específicas. La selección responde a cobertura narrativa de actores, funcionalidad, arquitectura, dominio, datos, procesos, interacciones, estados y diferencias académicas. No se impone una cuota ni se pretende insertar los 118 diagramas en el cuerpo principal.

Se revisaron fuentes, fichas y SVG de los 118 registros; se realizó inspección visual de la selección mediante 12 hojas de contacto y cuatro imágenes individuales existentes. Las siete salidas de esta fase son Markdown; no se crearon nuevos diagramas, SVG, Word, PDF ni archivos de herramientas. La selección y el diseño de página siguen pendientes de aprobación.

## Versión y conservación

HEAD: 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19; rama: desarrollo. Directorio de trabajo, no solo HEAD. Se conserva la modificación local de apps/modalidades/proyecto_grado.py, los temporales .tmp_group3, respaldos, CSS de PostulantesPage y la imagen universitaria ya presentes. No hubo commits, push, instalación, pruebas del producto, migraciones ni acceso a PostgreSQL.

Antes de escribir se comprobó que presentacion-academica no existía. Universo de conservación: 2383 archivos enumerados por Git (seguimiento y no rastreados no ignorados), excluyendo únicamente este nuevo directorio. Para cada ruta ordenada se concatenó UTF-8(ruta), byte nulo y SHA-256 binario de su contenido; el SHA-256 agregado antes y después es:

6221b60ca6d7d88ba977f6eb0c0d5463f3f7e01a34199a83875913055c45e241

El control adicional de renderizado contrasta 118 fuentes y 118 SVG con sus huellas de los registros previos. Este control es de conservación, no una nueva ejecución del parser PlantUML. Los cachés y herramientas ignorados no forman parte del universo Git; esta fase no los utiliza ni escribe en ellos.

## Resultados editoriales

- 118 registros localizables en el anexo: 102 UML y 16 ER lógicos complementarios.
- 25 figuras propuestas: 23 UML y dos ER; numeración provisional 01–25 y DIA intactos.
- Explicación de cada figura con objetivo, elementos, relaciones, funcionalidad, interpretación, evidencia y vínculos al original.
- Las seis modalidades tienen una figura específica; las políticas registradas también aparecen en el motor común.
- El orden propuesto sigue contexto/actores, requisitos observados, casos de uso, arquitectura, dominio/datos, procesos, interacciones, estados y particularidades.
- Se evitan pares de figuras equivalentes en el cuerpo: dominio del expediente/seguimiento frente a ER de documentos/defensas; las vistas alternativas quedan en anexo.
- Se registran VIS-01 a VIS-06 como propuestas pendientes, sin editar originales.

## Evaluación de presentación

Los SVG permiten ampliación vectorial, pero varias vistas anchas y secuencias extensas perderían legibilidad al encajarlas en una página A4. 19 de las 25 figuras quedan por debajo del umbral editorial propuesto de 9 pt al encajarlas completas en las dos áreas de página evaluadas. Esta es una estimación, no una prueba física. Los tamaños por figura se conservan en evaluacion-visual.md. La lectura en pantalla ampliada no acredita impresión ni proyección. No se declara lista una figura para Word/PDF sin la prueba de maquetación; las propuestas mantienen todos los participantes, relaciones, restricciones y guardas.

## Validación ejecutada

| Control | Resultado |
| --- | --- |
| Inventario | 118 IDs únicos, 118 fuentes, 118 fichas y 118 SVG localizados; sin duplicación de archivos. |
| Selección y explicaciones | 25 IDs coincidentes, 25 figuras numeradas y seis modalidades con vista específica. |
| Modelo de datos | 16 ER en inventario y dos seleccionados, rotulados como complementarios a UML. |
| Referencias al código | 308 referencias distintas comprobadas por existencia; símbolos Python resueltos por AST cuando se declaran, sin importar el producto. |
| Correspondencia de renderizado | 118 pares fuente/SVG con huellas iguales a los registros previos; sin renderizado nuevo. |
| Enlaces locales de los siete Markdown | 1092 destinos comprobados, incluidas anclas explícitas; cero errores. |
| Archivos creados | Exactamente los siete Markdown autorizados; sin otros artefactos nuevos en el directorio. |
| Conservación exterior | 2383 archivos del universo Git conservan rutas y contenido según digest agregado antes/después. |
| Pruebas del producto / Word / PDF | No ejecutadas / no generados / no generados. |

Se comprobaron referencias por existencia y, cuando contienen símbolo Python, resolución AST sin importar el backend; para evidencia con huellas se verificó el contenido actual. La revisión semántica de la selección contrastó los elementos y relaciones de la fuente con su explicación. No se atribuye certificación exhaustiva de cada recorrido del sistema a esa revisión. La separación de reglas académicas se apoya en las policies y fichas específicas; no se valida normativa universitaria externa.

## Archivos creados

- [README.md](README.md).
- [seleccion-diagramas.md](seleccion-diagramas.md).
- [estructura-documento.md](estructura-documento.md).
- [explicacion-diagramas.md](explicacion-diagramas.md).
- [evaluacion-visual.md](evaluacion-visual.md).
- [inventario-anexos.md](inventario-anexos.md).
- [informe-fase-8.md](informe-fase-8.md).

## Pendientes de aprobación y límites

Aprobar las 25 figuras y la estructura; acordar plantilla universitaria, numeración final y formato de página; determinar si se autorizan cambios visuales o variantes académicas propuestas sin sustituir los originales. Los contratos Txx completos deberán estar accesibles en el documento definitivo para que los alias de guardas no queden aislados.

No se acredita esquema físico instalado, producción desplegada, normativa vigente ni pruebas del producto aprobadas. El cierre de AUD-06-009 es documental: las ausencias e incertidumbres de cobertura permanecen explícitas en fase 7.1. La preparación resulta adecuada como propuesta técnica para revisión del tribunal, condicionada a resolver la legibilidad final y a aprobar el alcance editorial. No se inicia el documento universitario definitivo ni una fase posterior.
