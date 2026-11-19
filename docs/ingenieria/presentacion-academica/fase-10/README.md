# Documento académico de análisis y diseño — fase 10

- [Documento principal editable](analisis-y-diseno.docx).
- [Anexos técnicos editables](anexos-uml.docx).
- [Inventario y correspondencia de figuras](inventario-figuras.md).
- [Informe de resultados y limitaciones](informe-fase-10.md).

El principal explica 25 figuras e incorpora ocho láminas A4. El anexo localiza las 25, incorpora doce láminas A3 para diez figuras y enlaza siete figuras que requieren mayor formato. Proyecto se conserva en tres partes que se leen conjuntamente. Todos los enlaces a SVG, PlantUML y fichas son relativos: mantener esta carpeta en su ubicación dentro del repositorio. Los Word son editables; las figuras conservan SVG nativo y PNG de compatibilidad, y se editan mediante sus fuentes PlantUML originales o académicas según el inventario.

El formato es provisional y no constituye norma oficial de la UABJB. No hay portada institucional definitiva. La exportación y los PNG de `qa/` se conservan como auxiliares de revisión, sin constituir el documento PDF definitivo ni acreditar impresión física. Revisar el informe antes de utilizar las láminas para impresión.

Los archivos auxiliares incluyen constructor, validadores, estado Git, huellas, inventario estructurado y registro de colocación. `herramientas/` contiene el renderizador portátil y el extractor auxiliar preparados con autorización expresa, con registros de procedencia. No es necesario incorporarlos al documento universitario.

Reproducción local: ejecutar con el Python del runtime de documentos `preparar_documentos.py`, `renderizar_local.py`, `validar_documentos.py rasterizar` y `validar_documentos.py validar`; inspeccionar todas las páginas y sólo después actualizar el registro de revisión y ejecutar `documentar_entrega.py`. No modificar ni ejecutar constructores de fases anteriores.
