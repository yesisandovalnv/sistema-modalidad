"""Informe y controles finales de la entrega académica, sin importar el backend."""
from optimizar import *
from urllib.parse import unquote
from html.parser import HTMLParser
import xml.etree.ElementTree as ET
def anchors(p):
    text=p.read_text(encoding='utf-8');result=set(re.findall(r'<a\s+id=[\"\']([^\"\']+)',text));counts={}
    for line in text.splitlines():
        m=re.match(r'^#{1,6}\s+(.+)',line)
        if m:
            a=re.sub(r'[^\w\- ]','',m[1].strip().lower()).replace(' ','-');n=counts.get(a,0);counts[a]=n+1;result.add(a+(f'-{n}' if n else ''))
    return result
def main():
    d=json.loads((OUT/'validacion.json').read_text(encoding='utf-8'));initial=json.loads((OUT/'estado-inicial.json').read_text(encoding='utf-8'));errors=list(d['errors'])
    before=initial['phase8'];changed=[n for n,h in before.items() if sha(ACA/n)!=h]
    if changed and changed!=['README.md']:errors.append('Cambios de fase 8 no previstos: '+str(changed))
    rootread=ACA/'README.md';t=rootread.read_text(encoding='utf-8')
    marker='## Actualización académica — fase 9'
    if marker not in t:write(rootread,t+'\n\n'+marker+'\n\nLa adaptación visual autorizada se entrega por separado: [índice de fase 9](fase-9/README.md), [galería académica](fase-9/galeria.html) e [informe](fase-9/informe-fase-9.md). La fase 8 se conserva como antecedente; sus propuestas visuales se evalúan ahora mediante copias. Los 118 originales no se sustituyen.\n')
    figures=d['figures'];fit4=[];fit3=[];large=[]
    for i in figures:
        if all(max(p['a4_portrait'],p['a4_landscape'])>=9 for p in i['pages']):fit4.append(i['figure'])
        elif all(p['a3_landscape']>=9 for p in i['pages']):fit3.append(i['figure'])
        else:large.append(i['figure'])
    report=f'''# Informe de fase 9 — optimización visual académica

Se completó la preparación visual de las 25 figuras seleccionadas, con limitaciones de formato explícitas. Se revisaron los siete documentos de fase 8 y las 25 fuentes/SVG seleccionadas. Se conservan seis figuras sin cambios (02, 09, 18, 23, 24 y 25); se adaptan 19. La figura 20, incluida entre las 19, se pagina en tres partes complementarias del mismo fragmento alternativo. Resultado final: **19 PlantUML y 21 SVG académicos**, además de las seis referencias originales; no son nuevos comportamientos del sistema.

## Entrega y mejoras

- [Inventario y correspondencia](inventario-adaptaciones.md): original, copia, fuente, SVG y ficha técnica de cada figura.
- [Galería académica](galeria.html), sin modificar la galería original.
- [Criterios uniformes](criterios-visuales.md): tipografía, contraste, fondos, espaciado y conservación de notación.
- [Evaluación de legibilidad](evaluacion-legibilidad.md): dimensiones, ajuste A4/A3 y ancho mínimo orientativo de cada parte.
- Fuentes independientes en `fuentes/`, estilo propio y SVG finales en `svg/`.
- [Estado inicial](estado-inicial.json), [inventario estructurado](inventario.json), [validación](validacion.json), registros del renderizador en `logs/` y previsualizaciones en `previsualizaciones/`.

Se incorporan títulos numerados, saltos de línea en etiquetas/acciones/carriles y separación entre elementos. Las secuencias mantienen los mensajes en su orden y evitan repetir participantes al pie. Se rechazó una primera distribución con mensajes excesivamente partidos porque aumentaba la altura. La paginación de Proyecto conserva contexto, alternativas, validaciones, retornos y nota de revisión final. No se elimina información para lograr un ajuste artificial. Las primeras seis salidas con nombres técnicos anteriores al ajuste de nombres se conservan como auxiliares en `revisiones-iniciales/`; no pertenecen al conjunto final de 21 SVG.

## Referencia y conservación

HEAD **{initial['head']}**, rama **{initial['branch']}**, directorio de trabajo sobre ese commit. El estado inicial registra todas las modificaciones/no rastreados existentes y sus huellas. Se conserva, entre otros, el cambio local de `apps/modalidades/proyecto_grado.py`; no se interpreta como modificación causada por esta fase. No se descarta ni confirma ningún cambio local.

La línea base incluye {len(initial['outside'])} archivos fuera del directorio académico: inventario Git de archivos existentes y control adicional de fuentes, estilos, SVG, scripts, JAR y ejecutables bajo diagramas. Los 118 originales (fuentes y SVG) y los renderizadores originales conservan sus huellas. El alcance de esta afirmación es ese universo explícito, no todos los archivos ignorados del equipo. De los siete Markdown de fase 8 sólo se añade al README un acceso a fase 9; los otros seis permanecen idénticos.

## Validaciones ejecutadas

| Control | Resultado |
| --- | --- |
| PlantUML local | Comprobación de sintaxis: código 0 para las 19 fuentes. |
| Renderizado | SVG y PNG: código 0; 21 SVG finales XML válidos. |
| Correspondencia | 19 fuentes con igualdad del contenido ordenado tras normalizar presentación; revisión de las relaciones y de la paginación. |
| Identificadores | 25 ACA y 25 DIA distintos; 19 fuentes adaptadas trazables; sin sustitución de DIA. |
| Contenido | Mismos atributos, cardinalidades, participantes, mensajes, guardas, alternativas y restricciones; no se añaden relaciones de negocio. |
| Revisión visual | Cinco hojas de contacto de copias, una de los seis originales y las continuaciones de Proyecto a resolución completa. |
| Texto dentro del lienzo | Sin recortes detectados por la aproximación geométrica sobre los textos con coordenadas. |
| Conservación | {len(initial['outside'])} huellas exteriores contrastadas; sin cambios detectados. |
| Enlaces y artefactos | Véase el resultado reproducible en validacion-final.json. |

El control de contenido normaliza comentarios, include, skinparam, títulos/pies, nombres de salida, newpage, hide footbox, comillas y espacios/saltos de etiqueta. No es un demostrador formal de equivalencia UML; se complementa con la revisión visual. No detecta exhaustivamente todas las colisiones de aristas. Los carriles y particularidades de Tesis/Trabajo Dirigido permanecen separados; no se modifican políticas, reglas o funcionalidad protegida de Proyecto.

## Legibilidad y riesgos residuales

Estimación del cuerpo a 9 pt, pendiente de comprobar notas y pie en maqueta: **{len(fit4)} figuras** admiten al menos una orientación A4 ({', '.join(f'{n:02d}' for n in fit4)}); **{len(fit3)} adicionales** requieren A3 horizontal ({', '.join(f'{n:02d}' for n in fit3)}); **{len(large)}** no alcanzan el umbral en esos tamaños ({', '.join(f'{n:02d}' for n in large)}). Las tres partes de una figura deben satisfacer el criterio para clasificar el conjunto. No se afirma una mejora del tamaño físico en todas las copias: la tabla conserva también los casos que empeoran al ajustarlos a una misma página.

Las secuencias completas 14–16 y ciertas actividades requieren inserción ampliada o un anexo vectorial de mayor formato. No se dividen transacciones anidadas sólo para ocupar menos espacio. Las partes 20.1–20.3 se leen juntas: inicio/validación común en la primera, retorno/nota comunes en la tercera. Las máquinas de estados necesitan sus contratos Txx/Gxx/Axx enlazados. Permanecen cruces de aristas; no se acredita ausencia absoluta de superposiciones. El SVG es vectorial y local, pero su validez no certifica legibilidad física.

No se verificó inserción efectiva en Word, exportación PDF, sustitución de tipografías en otro equipo, impresión en papel ni escala de grises física. No se generó el documento definitivo. Las áreas de página y el umbral son criterios editoriales propuestos; deben contrastarse con la plantilla universitaria. No se ejecutaron pruebas del producto ni se declaró que pasan.

## Herramientas y siguiente decisión

Se reutilizó PlantUML 1.2026.9 y el JRE 21.0.13+9 local previamente disponible; Graphviz se obtiene del recurso ya incluido en esa herramienta y escribe sus temporales dentro de esta entrega. No se instalaron dependencias ni se enviaron fuentes a servicios externos. Los scripts originales permanecen intactos. No hubo acceso a PostgreSQL, migraciones, cambios funcionales, commits ni push.

Antes de preparar el documento universitario definitivo, acordar plantilla, formato ampliado/anexos y numeración, insertar los SVG con proporción bloqueada y revisar todas las notas a tamaño real. Las figuras que no alcanzan el umbral no deben forzarse a A4. Confirmar la lectura conjunta de Proyecto y la presencia de contratos de estados. Esta fase termina aquí; no se inicia una fase posterior.
'''
    write(OUT/'informe-fase-9.md',report)
    links=0
    for p in ACA.rglob('*.md'):
        text=p.read_text(encoding='utf-8')
        for raw in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)',text):
            raw=unquote(raw.strip().strip('<>'))
            if re.match(r'\w+://',raw):continue
            dest,sep,frag=raw.partition('#');target=(p.parent/dest).resolve() if dest else p
            links+=1
            if not target.exists():errors.append(f'Enlace inexistente: {p.name}: {raw}')
            elif frag and target.suffix=='.md' and frag not in anchors(target):errors.append(f'Ancla inexistente: {p.name}: {raw}')
    class Links(HTMLParser):
        def handle_starttag(self,tag,attrs):
            nonlocal links
            for k,v in attrs:
                if k in ('src','href'):
                    links+=1
                    if not (OUT/unquote(v)).exists():errors.append('Enlace HTML: '+v)
    Links().feed((OUT/'galeria.html').read_text(encoding='utf-8'))
    finalsvg=list((OUT/'svg').glob('*.svg'))
    if len(finalsvg)!=21:errors.append('No hay 21 SVG finales')
    for p in finalsvg:
        root=ET.parse(p).getroot()
        for e in root.iter():
            if e.tag.rsplit('}',1)[-1] in ('script','foreignObject','image'):errors.append('Recurso inesperado SVG: '+p.name)
    fresh=baseline()
    for p,h in initial['outside'].items():
        if fresh['outside'].get(p)!=h:errors.append('Conservación: '+p)
    extra=set(fresh['outside'])-set(initial['outside'])
    if extra:errors.append('Nuevos archivos exteriores: '+str(sorted(extra)))
    result={'errors':errors,'local_links_checked':links,'figures':25,'adapted_sources':19,'final_svg':len(finalsvg),'original_sources_and_svg_unchanged':118,'outside_files_checked':len(initial['outside']),'head':fresh['head'],'branch':fresh['branch'],'fit_body_estimate':{'a4':fit4,'a3_additional':fit3,'larger':large},'functional_tests_executed':False,'word_pdf_tested':False}
    write(OUT/'validacion-final.json',json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False))
    if errors:raise SystemExit(1)
if __name__=='__main__':main()
