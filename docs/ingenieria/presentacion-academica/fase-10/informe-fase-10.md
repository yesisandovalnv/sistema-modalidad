# Informe de fase 10 — documento académico de análisis y diseño

## Entregables

Se preparan [analisis-y-diseno.docx](analisis-y-diseno.docx) y [anexos-uml.docx](anexos-uml.docx), acompañados por [README](README.md) e [inventario de figuras](inventario-figuras.md). Los textos y tablas son editables. Las imágenes conservan SVG nativo dentro del DOCX y PNG de compatibilidad; la edición del modelo corresponde a su PlantUML enlazado, no a modificar sus reglas mediante Word.

El principal desarrolla 25 figuras y contiene ocho láminas A4 (02, 04, 06, 09, 18, 23, 24 y 25). El anexo localiza las 25 como A01–A25 e incorpora diez figuras en A3 (01, 03, 05, 07, 08, 10, 11, 17, 19 y 20), equivalentes a doce láminas porque la figura 20 tiene tres partes. Las siete restantes (12–16, 21 y 22) conservan explicación, identificador y enlace al SVG ampliable, sin reducción ilegible ni afirmación de que caben en A3.

## Estructura y contenido

Introducción; Alcance del análisis y diseño; Identificación de actores; Requisitos funcionales representados; Modelo de casos de uso; Arquitectura del sistema; Modelo de clases; Modelo de datos; Diagramas de actividades; Diagramas de secuencia; Diagramas de estados; Particularidades de las modalidades; Consideraciones de trazabilidad; Conclusiones del diseño; Referencias a los anexos técnicos.

Cada figura tiene título numerado, contexto, objetivo, elementos y relaciones, interpretación vinculada con la implementación, identificador original y referencia A## al anexo. Las fichas conservan evidencia del código y contratos de estados. Se distinguen rol, propiedad, vinculación, autoridad administrativa y participación académica. Las etapas y gates de cada modalidad no se universalizan.

La figura 20 mantiene las tres continuaciones del mismo alt. La primera contiene contexto y validación comunes; la tercera, retorno y nota de revisión final. Se advierte expresamente que son variantes alternativas y que no deben interpretarse como tres acciones consecutivas ni insertarse de forma aislada.

A4 en el principal y páginas A3 sólo para láminas ampliadas del anexo, en la orientación que mejora el ajuste. Márgenes de 2,5 cm, Times New Roman de 12 puntos, interlineado de 1,5 en el texto, títulos jerarquizados y páginas numeradas. Las láminas mantienen su tipografía interna; las cabeceras de lámina utilizan 10,5 puntos. Estos parámetros son provisionales, no normas universitarias verificadas. No se incorpora portada institucional definitiva ni datos académicos personales inventados.

## Referencia documental y conservación

HEAD 689eeb56ac6ff26b6e6487b3fd7100b9c484ea19, rama desarrollo, directorio de trabajo del 2 de noviembre de 2026. [Estado inicial y huellas](estado-inicial.json) registra los cambios locales existentes. Se contrastan 2518 archivos exteriores a fase-10; se conservan los 118 originales, las versiones académicas y los renderizadores anteriores. Los documentos, herramientas y salidas de revisión persistentes se guardan en el directorio autorizado. El primer intento del auxiliar creó temporales de proceso en TEMP del sistema; los intentos posteriores confinan perfiles y temporales a fase-10. No se alteran archivos exteriores del repositorio. No se modifica el código funcional ni se accede a PostgreSQL, modelos, migraciones, políticas o pruebas. No hay commits ni push.

Fuentes principales: índice maestro de ingeniería; selección y explicaciones de fase 8; inventario, galería y evaluación de fase 9; catálogo de actores y matriz de permisos; matriz funcional de fase 4; matriz de escenarios, aserciones e informe de fase 7.1. El constructor comprueba existencia e identidad de las 25 figuras antes de generar los documentos.

## Validaciones automáticas

[Resultado estructurado](validacion-automatica.json): 0 errores. CRC de ambos ZIP correcto, XML de las partes analizado, 25 identificadores encontrados en cada documento, ocho dibujos y ocho SVG nativos en el principal, doce dibujos y doce SVG nativos en el anexo. Se comprueban márgenes, marcadores únicos, destinos locales de hipervínculos y correspondencia con el inventario. Se verifican 82 relaciones de hipervínculos locales en el principal y 78 en el anexo; la reutilización de una relación no equivale a una nueva figura.

El tamaño estimado del cuerpo mediano en las veinte colocaciones es igual o superior a 9 puntos. No se confunde esa mediana con el tamaño de todas las notas. Algunas etiquetas secundarias y pies conservan tamaños menores; las fichas y explicaciones permiten ampliar su significado. No se afirma legibilidad física de todos los textos sólo por esa estimación.

## Renderizado e inspección visual

Renderizado: analisis-y-diseno: 28 páginas, retorno 0; anexos-uml: 29 páginas, retorno 0.

Estado de revisión visual: **COMPLETADA**. Se inspeccionaron las 57 páginas completas. El principal tiene 28 páginas; el anexo, 29. Las tres partes de la figura 20 ocupan las páginas consecutivas 24–26 del anexo. Las huellas de ambos DOCX finales coinciden con las copias efectivamente inspeccionadas; se conservan en revision-visual.json. La validación ZIP/XML no sustituye esa revisión.

El primer intento del renderizador canónico falló por ausencia de LibreOffice. Word local devolvió el error COM 0x80080005 y la conexión de control visual no estaba operativa. El usuario autorizó expresamente preparar un renderizador local; se descargó LibreOffice Portable 26.2.4, se contrastó el SHA256 publicado y se extrajo dentro de fase-10. Un extractor auxiliar oficial se abrió como MSI en modo de lectura, sin ejecutar una instalación global. Se reutiliza render_docx.py sin modificarlo, con perfiles, temporales y salidas locales. Un adaptador permite conservar los perfiles que Windows no consigue limpiar; no suprime los errores de conversión. Ambos renderizados corregidos terminan con retorno cero. No se envían documentos ni código a servicios de renderizado externos. El PDF es un auxiliar de control; no se entrega como documento universitario definitivo.

## Limitaciones y revisión pendiente

No se comprueba impresión física. La inserción final puede variar entre versiones de Word y LibreOffice; verificar tipografías, campos de página, resolución de SVG y saltos en el equipo de entrega. Los PNG de compatibilidad pueden perder nitidez frente al SVG en lectores antiguos. Mantener las proporciones y no utilizar «ajustar a A4» para las láminas A3.

Las siete figuras de mayor formato siguen en SVG; su impresión requiere acordar un tamaño o soporte de anexo adecuado. Los contratos Txx/Gxx/Axx deben permanecer disponibles junto a los estados. Los enlaces relativos requieren mantener la estructura documental del repositorio o preparar una distribución autocontenida en una autorización posterior.

La trazabilidad de fase 7.1 sigue siendo documental: 511 entradas, con 28 verificadas documentalmente, cinco parciales, 381 sin prueba identificada y 97 no verificables. No se ejecutan pruebas funcionales ni se declaran aprobadas. Tampoco se acredita normativa universitaria, esquema físico instalado o producción desplegada.

Antes de la entrega institucional, confirmar plantilla, autoría, datos de titulación, numeración de capítulos, manejo de láminas ampliadas y soporte de anexos. No se inventan esos datos ni se inicia una fase posterior.
