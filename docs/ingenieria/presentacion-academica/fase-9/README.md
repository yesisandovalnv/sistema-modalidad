# Versiones académicas — fase 9

- [Inventario y correspondencia de las 25 figuras](inventario-adaptaciones.md).
- [Galería de SVG](galeria.html).
- [Criterios visuales](criterios-visuales.md).
- [Evaluación por figura y parte](evaluacion-legibilidad.md).
- [Informe de fase 9](informe-fase-9.md).
- [Inventario estructurado](inventario.json), [validación](validacion.json) y [estado inicial Git y huellas](estado-inicial.json).

19 fuentes PlantUML en `fuentes/`, 21 SVG en `svg/` (Proyecto tiene tres páginas). Las otras seis figuras enlazan los originales; no se duplican innecesariamente. PNG y hojas de contacto son auxiliares de revisión y no sustituyen SVG. Los siete Markdown de fase 8 conservan su contenido histórico; el índice académico remite a esta actualización.

Reproducción desde la raíz, sin instalar dependencias: `python -B docs/ingenieria/presentacion-academica/fase-9/optimizar.py actualizar`, luego `renderizar`, después `python -B docs/ingenieria/presentacion-academica/fase-9/verificar.py` y `documentar.py`. `originales` genera únicamente PNG auxiliares de los seis originales. `preparar` es inicial y rechaza sobrescribir la línea base. Los temporales Java/Graphviz y registros se escriben aquí. No ejecutar los renderizadores originales para esta entrega.
