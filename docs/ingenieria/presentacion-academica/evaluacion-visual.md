# Evaluación visual y recomendaciones de presentación

## Método y alcance

Se leyeron los 118 SVG y fuentes, se contrastaron sus huellas con los registros locales de renderizado y se revisaron las 25 figuras seleccionadas mediante previsualizaciones existentes. Se inspeccionaron 12 hojas de contacto y cuatro figuras individuales (DIA-SYS-006, DIA-POS-002, DIA-SYS-001 y DIA-DOC-070). Las hojas son auxiliares de orientación: el rótulo de tarjeta recortado en alguna hoja de contacto no implica un recorte del SVG. No se generaron nuevas imágenes ni se modificaron los originales.

La revisión aprecia distribución, cruces, espaciado, texto, densidad, paleta y claridad. Las métricas de 118 SVG complementan, pero no sustituyen, el juicio visual ni una prueba de impresión. No se atribuye inspección manual ampliada a todos los 118.

## Estimación de legibilidad en página

Para comparar se proponen áreas útiles de 160×225 mm (vertical) y 245×155 mm (horizontal), reservando espacio para pie; no son requisitos de la universidad. Se usa la moda de tamaños de texto mayores de 10 del SVG como aproximación del cuerpo, excluyendo el pie de 10 px. La estimación es tamaño_px × min(ancho_útil/ancho_SVG, alto_útil/alto_SVG) × 72/25.4. Supone escalado uniforme y no valida el comportamiento de Word. Se propone 9 pt como umbral editorial de revisión, pendiente de la plantilla; no equivale a aprobación de legibilidad.

| Figura / ID | SVG px | Cuerpo px | Complejidad visual orientativa | Texto estimado vertical / horizontal pt | Recomendación |
| --- | --- | --- | --- | --- | --- |
| 01 / DIA-SYS-001 | 625×994 | 13 | Media | 8.3 / 5.7 | No reducir a página única sin resolver maquetación; ver propuestas |
| 02 / DIA-POS-041 | 442×838 | 13 | Baja | 9.9 / 6.8 | Probar página dedicada y verificar texto a escala final |
| 03 / DIA-DOC-040 | 447×942 | 13 | Media | 8.8 / 6.1 | No reducir a página única sin resolver maquetación; ver propuestas |
| 04 / DIA-POS-043 | 455×932 | 13 | Media | 8.9 / 6.1 | No reducir a página única sin resolver maquetación; ver propuestas |
| 05 / DIA-SYS-006 | 1383×921 | 13 | Media | 4.3 / 6.2 | No reducir a página única sin resolver maquetación; ver propuestas |
| 06 / DIA-MOD-002 | 1012×597 | 13 | Media | 5.8 / 8.9 | No reducir a página única sin resolver maquetación; ver propuestas |
| 07 / DIA-SYS-007 | 1322×777 | 13 | Media | 4.5 / 6.8 | No reducir a página única sin resolver maquetación; ver propuestas |
| 08 / DIA-POS-001 | 1028×755 | 13 | Media | 5.7 / 7.6 | No reducir a página única sin resolver maquetación; ver propuestas |
| 09 / DIA-POS-002 | 594×448 | 13 | Baja | 9.9 / 12.7 | Probar página dedicada y verificar texto a escala final |
| 10 / DIA-DOC-101 | 1068×806 | 13 | Media | 5.5 / 7.1 | No reducir a página única sin resolver maquetación; ver propuestas |
| 11 / DIA-POS-105 | 1523×864 | 13 | Media | 3.9 / 5.9 | No reducir a página única sin resolver maquetación; ver propuestas |
| 12 / DIA-SYS-003 | 1480×1115 | 13 | Media | 4.0 / 5.1 | No reducir a página única sin resolver maquetación; ver propuestas |
| 13 / DIA-POS-061 | 724×964 | 13 | Media | 8.1 / 5.9 | No reducir a página única sin resolver maquetación; ver propuestas |
| 14 / DIA-DOC-070 | 2047×1278 | 13 | Alta | 2.9 / 4.4 | No reducir a página única sin resolver maquetación; ver propuestas |
| 15 / DIA-POS-073 | 1460×1297 | 13 | Alta | 4.0 / 4.4 | No reducir a página única sin resolver maquetación; ver propuestas |
| 16 / DIA-POS-074 | 1398×1042 | 13 | Alta | 4.2 / 5.5 | No reducir a página única sin resolver maquetación; ver propuestas |
| 17 / DIA-POS-081 | 1048×733 | 13 | Alta | 5.6 / 7.8 | No reducir a página única sin resolver maquetación; ver propuestas |
| 18 / DIA-DOC-080 | 624×556 | 13 | Media | 9.4 / 10.3 | Probar página dedicada y verificar texto a escala final |
| 19 / DIA-POS-082 | 834×737 | 13 | Media | 7.1 / 7.8 | No reducir a página única sin resolver maquetación; ver propuestas |
| 20 / DIA-PG-070 | 1265×1652 | 13 | Alta | 4.7 / 3.5 | No reducir a página única sin resolver maquetación; ver propuestas |
| 21 / DIA-TG-060 | 1867×1195 | 13 | Alta | 3.2 / 4.8 | No reducir a página única sin resolver maquetación; ver propuestas |
| 22 / DIA-TD-060 | 1955×1195 | 13 | Alta | 3.0 / 4.6 | No reducir a página única sin resolver maquetación; ver propuestas |
| 23 / DIA-EG-080 | 630×633 | 13 | Media | 9.4 / 9.0 | Probar página dedicada y verificar texto a escala final |
| 24 / DIA-EA-080 | 522×603 | 13 | Media | 11.3 / 9.5 | Probar página dedicada y verificar texto a escala final |
| 25 / DIA-DIP-080 | 490×609 | 13 | Media | 12.0 / 9.4 | Probar página dedicada y verificar texto a escala final |

Complejidad es una ayuda editorial: Alta si un lado supera 1800 px o hay más de 100 nodos de texto; Media si un lado supera 900 px o hay más de 40; Baja en los demás. No mide complejidad de negocio ni calidad UML. Los colores de responsabilidades, referencias y notas son coherentes con las convenciones originales; ninguna interpretación depende solo del color. Debe probarse también impresión en escala de grises.

## Observaciones de revisión visual

- Las vistas de casos de uso son verticales, con buen espacio entre objetivos; algunas asociaciones largas/cruzadas requieren acompañamiento verbal y página dedicada. La generalización del actor se debe distinguir de una asociación a un objetivo.
- Componentes y despliegue separan responsabilidades, nodos y almacenamiento; los cruces en DIA-SYS-006 y el ancho de DIA-SYS-007 desaconsejan usar una miniatura como figura final.
- El modelo de seguimiento es compacto. El dominio del expediente y el ER de defensas tienen relaciones transversales numerosas; conviene lectura vectorial ampliada y explicar primero las entidades propias y luego las referencias externas.
- DIA-DOC-070 presenta diez líneas de vida y muchos mensajes; DIA-PG-070 tiene fragmentos alternativos anidados y gran altura. Son técnicamente informativos pero no se consideran listos para una página A4 reducida.
- Las actividades nominales de Tesis y Trabajo Dirigido tienen tres carriles y notas de etapas: hay espacio horizontal significativo. Sus notas preservan diferencias importantes, por lo que no deben eliminarse para ganar espacio.
- Las máquinas de estados son más compactas; las de seguimiento/defensa concentran varias transiciones. Los alias Gxx/Axx necesitan su tabla de contratos, no una leyenda genérica aislada.

## Propuestas visuales registradas, no ejecutadas

| Propuesta | Figuras afectadas | Cambio a evaluar con autorización adicional | Justificación y conservación semántica |
| --- | --- | --- | --- |
| VIS-01 | 01–04 | Reordenar actores y objetivos o ajustar orientación, manteniendo todas las asociaciones/generalizaciones y notas. | Disminuir cruces sin modificar permisos ni inventar include/extend. |
| VIS-02 | 05–07 | Revisar distribución y quiebres de etiquetas; priorizar una página amplia con leyenda intacta. | Reducir anchura y cruces sin eliminar dependencias, volúmenes, puertos o límites de producción. |
| VIS-03 | 08, 10–11 | Ajustar ubicación de referencias y rutas de relaciones, conservando cardinalidades y restricciones. | Mejorar lectura de datos sin transformar FK opcionales ni UQ condicionales. |
| VIS-04 | 14–16, 20 | Evaluar maquetación por fragmentos consecutivos o una vista académica derivada si la plantilla no admite el tamaño; conservar el original y una correspondencia de mensajes. | No ocultar participantes, orden, retornos, atomic, rollback, policy ni compensación limitada del storage. No se crean figuras derivadas en esta fase. |
| VIS-05 | 21–22 | Evaluar disposición de carriles, notas y líneas sin alterar etapas ni guardas propias. | Evitar comprimir textos de modalidad y mantener la distinción entre coordinación y método automático. |
| VIS-06 | 17–19, 23–25 | Ajustar rutas de flechas/etiquetas si la prueba de maquetación lo exige y acompañar los contratos Txx completos. | Conservar transiciones internas, reintentos, guardas, acciones y excepciones específicas. |

Todas las propuestas requieren aprobación adicional para editar fuentes o producir variantes; no se aplicaron. Ningún problema de tamaño justifica cambiar la semántica ni eliminar notas críticas.

## Word y PDF: compatibilidad pendiente de prueba real

Mantener SVG como fuente vectorial para una eventual inserción, conservar proporción y evitar capturas de la galería. Verificar fuentes, caracteres, flechas, líneas discontinuas, notas, márgenes y numeración en la versión concreta de Word y en su PDF exportado. No se garantiza importación/conversión fiel sin esa prueba. Si el flujo aprobado exige rasterizar, acordar antes tamaño físico y resolución; no se rasteriza ahora. No hay Word/PDF generado ni certificación de impresión.

[Selección](seleccion-diagramas.md) · [Explicaciones](explicacion-diagramas.md).
