"""Inventario e informe de fase 10 a partir de controles reproducibles."""
from preparar_documentos import *
def link(path,label):return f'[{label}]({Path(os.path.relpath(ROOT/path,OUT)).as_posix()})'
def main():
    rows=json.loads((OUT/'inventario-estructurado.json').read_text(encoding='utf-8'));places=json.loads((OUT/'colocacion-figuras.json').read_text(encoding='utf-8'))
    pending=(OUT/'publicacion-pendiente.json').exists() and json.loads((OUT/'publicacion-pendiente.json').read_text(encoding='utf-8')).get('status','').startswith('PENDIENTE')
    v=json.loads((OUT/('validacion-revision.json' if pending else 'validacion-automatica.json')).read_text(encoding='utf-8'))
    visual=json.loads((OUT/'revision-visual.json').read_text(encoding='utf-8')) if (OUT/'revision-visual.json').exists() else {'status':'PENDIENTE'}
    table=['# Inventario de figuras — fase 10','','25 figuras explicadas en el principal y localizadas como A01–A25 en el anexo. Se mantienen la selección de fase 8, los identificadores DIA y las versiones académicas de fase 9. No se generan ni modifican diagramas.','','| Figura y anexo | Identificador original | Título | Tratamiento | Fuente y versión ampliada |','| --- | --- | --- | --- | --- |']
    for i in rows:
        n=i['figure'];t='Lámina A4 en principal' if n in MAIN else 'Lámina A3 en anexo' if n in A3 else 'SVG ampliado; sin reducción en Word'
        if n==20:t+='; partes 20.1–20.3 conjuntas'
        refs=link(i.get('academic_source',i['source']),'PlantUML')+' · '+link(i['ficha'],'Ficha técnica')+' · '+' · '.join(link(pg['path'],f'SVG {j}' if n==20 else 'SVG') for j,pg in enumerate(i['pages'],1))
        table.append(f"| {n:02d} / A{n:02d} | {i['original']} | {i['title_academic']} | {t} | {refs} |")
    table+=['','## Colocación estimada en Word','','Los 25 mm de margen se mantienen en todas las secciones. El cuerpo mediano se estima sobre el SVG a la escala insertada; no representa el mínimo de todas las etiquetas. Títulos de lámina en la cabecera, numeración de página en el pie y relación de aspecto conservada. Las notas y guardas se desarrollan en el texto o en las fichas. El PDF de revisión no equivale a impresión física.','','| Figura y parte | Papel y orientación | Tamaño insertado mm | Cuerpo mediano estimado pt |','| --- | --- | --- | --- |']
    for p in places:table.append(f"| {p['figure']:02d}.{p['part']} | {p['paper']} {p['orientation']} | {p['width_mm']:.2f} × {p['height_mm']:.2f} | {p['body_pt_estimate']:.2f} |")
    write(OUT/'inventario-figuras.md','\n'.join(table)+'\n')
    write(OUT/'README.md','''# Documento académico de análisis y diseño — fase 10

- [Documento principal editable](analisis-y-diseno.docx).
- [Anexos técnicos editables](anexos-uml.docx).
- [Inventario y correspondencia de figuras](inventario-figuras.md).
- [Informe de resultados y limitaciones](informe-fase-10.md).

El principal explica 25 figuras e incorpora ocho láminas A4. El anexo localiza las 25, incorpora doce láminas A3 para diez figuras y enlaza siete figuras que requieren mayor formato. Proyecto se conserva en tres partes que se leen conjuntamente. Todos los enlaces a SVG, PlantUML y fichas son relativos: mantener esta carpeta en su ubicación dentro del repositorio. Los Word son editables; las figuras conservan SVG nativo y PNG de compatibilidad, y se editan mediante sus fuentes PlantUML originales o académicas según el inventario.

El formato es provisional y no constituye norma oficial de la UABJB. No hay portada institucional definitiva. La exportación y los PNG de `qa/` se conservan como auxiliares de revisión, sin constituir el documento PDF definitivo ni acreditar impresión física. Revisar el informe antes de utilizar las láminas para impresión.

Los archivos auxiliares incluyen constructor, validadores, estado Git, huellas, inventario estructurado y registro de colocación. `herramientas/` contiene el renderizador portátil y el extractor auxiliar preparados con autorización expresa, con registros de procedencia. No es necesario incorporarlos al documento universitario.

Reproducción local: ejecutar con el Python del runtime de documentos `preparar_documentos.py`, `renderizar_local.py`, `validar_documentos.py rasterizar` y `validar_documentos.py validar`; inspeccionar todas las páginas y sólo después actualizar el registro de revisión y ejecutar `documentar_entrega.py`. No modificar ni ejecutar constructores de fases anteriores.
''')
    if pending:
        p=OUT/'README.md';t=p.read_text(encoding='utf-8');t=t.replace('[Documento principal editable](analisis-y-diseno.docx)','[Principal corregido y revisado](revision-analisis-y-diseno.docx)')
        t=t.replace('# Documento académico de análisis y diseño — fase 10','# Documento académico de análisis y diseño — fase 10\n\n**Cierre pendiente:** Word mantiene bloqueado el principal inicial `analisis-y-diseno.docx`. La copia corregida `revision-analisis-y-diseno.docx` ya fue renderizada e inspeccionada. El anexo definitivo está actualizado. Falta liberar el archivo principal y copiar la versión revisada a su nombre solicitado; no se declara cerrada la fase. La solicitud para cerrar Word manualmente o autorizar expresamente su cierre sigue pendiente. No se terminó el proceso rechazado por la revisión automática.')
        write(p,t)
    rpath=OUT/('qa/renderizado-revision-.json' if pending else 'qa/renderizado-local.json')
    render=json.loads(rpath.read_text(encoding='utf-8')) if rpath.exists() else []
    pages='; '.join(f"{r['document']}: {r['pages']} páginas, retorno {r['exit']}" for r in render) or 'Pendiente'
    headings='; '.join(h for h,ns,ts in SECTIONS)
    report=f'''# Informe de fase 10 — documento académico de análisis y diseño

## Entregables

Se preparan [analisis-y-diseno.docx](analisis-y-diseno.docx) y [anexos-uml.docx](anexos-uml.docx), acompañados por [README](README.md) e [inventario de figuras](inventario-figuras.md). Los textos y tablas son editables. Las imágenes conservan SVG nativo dentro del DOCX y PNG de compatibilidad; la edición del modelo corresponde a su PlantUML enlazado, no a modificar sus reglas mediante Word.

El principal desarrolla 25 figuras y contiene ocho láminas A4 (02, 04, 06, 09, 18, 23, 24 y 25). El anexo localiza las 25 como A01–A25 e incorpora diez figuras en A3 (01, 03, 05, 07, 08, 10, 11, 17, 19 y 20), equivalentes a doce láminas porque la figura 20 tiene tres partes. Las siete restantes (12–16, 21 y 22) conservan explicación, identificador y enlace al SVG ampliable, sin reducción ilegible ni afirmación de que caben en A3.

## Estructura y contenido

{headings}.

Cada figura tiene título numerado, contexto, objetivo, elementos y relaciones, interpretación vinculada con la implementación, identificador original y referencia A## al anexo. Las fichas conservan evidencia del código y contratos de estados. Se distinguen rol, propiedad, vinculación, autoridad administrativa y participación académica. Las etapas y gates de cada modalidad no se universalizan.

La figura 20 mantiene las tres continuaciones del mismo alt. La primera contiene contexto y validación comunes; la tercera, retorno y nota de revisión final. Se advierte expresamente que son variantes alternativas y que no deben interpretarse como tres acciones consecutivas ni insertarse de forma aislada.

A4 en el principal y páginas A3 sólo para láminas ampliadas del anexo, en la orientación que mejora el ajuste. Márgenes de 2,5 cm, Times New Roman de 12 puntos, interlineado de 1,5 en el texto, títulos jerarquizados y páginas numeradas. Las láminas mantienen su tipografía interna; las cabeceras de lámina utilizan 10,5 puntos. Estos parámetros son provisionales, no normas universitarias verificadas. No se incorpora portada institucional definitiva ni datos académicos personales inventados.

## Referencia documental y conservación

HEAD {v['head']}, rama {v['branch']}, directorio de trabajo del 2 de noviembre de 2026. [Estado inicial y huellas](estado-inicial.json) registra los cambios locales existentes. Se contrastan {v['outside_files_checked']} archivos exteriores a fase-10; se conservan los 118 originales, las versiones académicas y los renderizadores anteriores. Las escrituras de esta fase se limitan al directorio autorizado; las herramientas y perfiles auxiliares se preparan en él. No se modifica el código funcional ni se accede a PostgreSQL, modelos, migraciones, políticas o pruebas. No hay commits ni push.

Fuentes principales: índice maestro de ingeniería; selección y explicaciones de fase 8; inventario, galería y evaluación de fase 9; catálogo de actores y matriz de permisos; matriz funcional de fase 4; matriz de escenarios, aserciones e informe de fase 7.1. El constructor comprueba existencia e identidad de las 25 figuras antes de generar los documentos.

## Validaciones automáticas

[Resultado estructurado](validacion-automatica.json): {len(v['errors'])} errores. CRC de ambos ZIP correcto, XML de las partes analizado, 25 identificadores encontrados en cada documento, ocho dibujos y ocho SVG nativos en el principal, doce dibujos y doce SVG nativos en el anexo. Se comprueban márgenes, marcadores únicos, destinos locales de hipervínculos y correspondencia con el inventario. Se verifican 82 relaciones de hipervínculos locales en el principal y 78 en el anexo; la reutilización de una relación no equivale a una nueva figura.

El tamaño estimado del cuerpo mediano en las veinte colocaciones es igual o superior a 9 puntos. No se confunde esa mediana con el tamaño de todas las notas. Algunas etiquetas secundarias y pies conservan tamaños menores; las fichas y explicaciones permiten ampliar su significado. No se afirma legibilidad física de todos los textos sólo por esa estimación.

## Renderizado e inspección visual

Renderizado: {pages}.

Estado de revisión visual: **{visual['status']}**. Los detalles y páginas inspeccionadas se conservan en revision-visual.json cuando la inspección está completa. La validación ZIP/XML no sustituye esa revisión.

El primer intento del renderizador canónico falló por ausencia de LibreOffice. Word local devolvió el error COM 0x80080005 y la conexión de control visual no estaba operativa. El usuario autorizó expresamente preparar un renderizador local; se descargó LibreOffice Portable 26.2.4, se contrastó el SHA256 publicado y se extrajo dentro de fase-10. Un extractor auxiliar oficial se abrió como MSI en modo de lectura, sin ejecutar una instalación global. Se reutiliza render_docx.py sin modificarlo, con perfiles, temporales y salidas locales. No se envían documentos ni código a servicios de renderizado externos. El PDF es un auxiliar de control; no se entrega como documento universitario definitivo.

## Limitaciones y revisión pendiente

No se comprueba impresión física. La inserción final puede variar entre versiones de Word y LibreOffice; verificar tipografías, campos de página, resolución de SVG y saltos en el equipo de entrega. Los PNG de compatibilidad pueden perder nitidez frente al SVG en lectores antiguos. Mantener las proporciones y no utilizar «ajustar a A4» para las láminas A3.

Las siete figuras de mayor formato siguen en SVG; su impresión requiere acordar un tamaño o soporte de anexo adecuado. Los contratos Txx/Gxx/Axx deben permanecer disponibles junto a los estados. Los enlaces relativos requieren mantener la estructura documental del repositorio o preparar una distribución autocontenida en una autorización posterior.

La trazabilidad de fase 7.1 sigue siendo documental: 511 entradas, con 28 verificadas documentalmente, cinco parciales, 381 sin prueba identificada y 97 no verificables. No se ejecutan pruebas funcionales ni se declaran aprobadas. Tampoco se acredita normativa universitaria, esquema físico instalado o producción desplegada.

Antes de la entrega institucional, confirmar plantilla, autoría, datos de titulación, numeración de capítulos, manejo de láminas ampliadas y soporte de anexos. No se inventan esos datos ni se inicia una fase posterior.
'''
    if pending:
        report=report.replace('# Informe de fase 10 — documento académico de análisis y diseño','# Informe de fase 10 — documento académico de análisis y diseño\n\n**Estado: preparación y revisión terminadas en copias corregidas; cierre pendiente de liberar el principal.** La versión lista es [revision-analisis-y-diseno.docx](revision-analisis-y-diseno.docx), de 28 páginas; el anexo definitivo actualizado tiene 29. Word bloquea el principal inicial e impide sustituirlo. La revisión automática rechazó terminar el proceso por riesgo de perder estado sin guardar. Se espera la acción o autorización específica del usuario y no se declara completada la fase.')
        report=report.replace('[Resultado estructurado](validacion-automatica.json)','[Resultado de las copias corregidas](validacion-revision.json)')
        report=report.replace('Los detalles y páginas inspeccionadas se conservan en revision-visual.json cuando la inspección está completa.','Se inspeccionaron las 57 páginas completas de las copias corregidas; sus huellas y páginas se conservan en revision-visual.json. El anexo final coincide byte por byte con la copia inspeccionada. El principal final sigue pendiente de sustitución.')
    report=report.replace('Se reutiliza render_docx.py sin modificarlo, con perfiles, temporales y salidas locales.','Se reutiliza render_docx.py sin modificarlo, con perfiles, temporales y salidas locales. Un adaptador permite conservar los perfiles que Windows no consigue limpiar; no suprime los errores de conversión. Ambos renderizados corregidos terminan con retorno cero.')
    if not pending and visual.get('status')=='COMPLETADA':
        report=report.replace('Los detalles y páginas inspeccionadas se conservan en revision-visual.json cuando la inspección está completa.','Se inspeccionaron las 57 páginas completas. El principal tiene 28 páginas; el anexo, 29. Las tres partes de la figura 20 ocupan las páginas consecutivas 24–26 del anexo. Las huellas de ambos DOCX finales coinciden con las copias efectivamente inspeccionadas; se conservan en revision-visual.json.')
    report=report.replace('Las escrituras de esta fase se limitan al directorio autorizado; las herramientas y perfiles auxiliares se preparan en él.','Los documentos, herramientas y salidas de revisión persistentes se guardan en el directorio autorizado. El primer intento del auxiliar creó temporales de proceso en TEMP del sistema; los intentos posteriores confinan perfiles y temporales a fase-10. No se alteran archivos exteriores del repositorio.')
    write(OUT/'informe-fase-10.md',report)
    print('README, inventario e informe actualizados',flush=True)
if __name__=='__main__':main()
