"""Índice, correspondencia y evaluación editorial de las salidas académicas."""
from optimizar import *
from html import escape
from urllib.parse import quote
def relative(p,base=OUT):return Path(os.path.relpath(ROOT/p,base)).as_posix()
def link(p,label):return f'[{label}]({quote(relative(p),safe="/.-_")})'
def main():
    d=json.loads((OUT/'validacion.json').read_text(encoding='utf-8'));rows=d['figures']; inv=json.loads((OUT/'inventario.json').read_text(encoding='utf-8'))
    for i in inv:
        if i['figure']==20:i['split']=True;i['pages']=[r['path'] for r in next(r for r in rows if r['figure']==20)['pages']]
    write(OUT/'inventario.json',json.dumps(inv,ensure_ascii=False,indent=2))
    entries=[]
    for n in (3,4,5):entries+=json.loads((ENG/f'diagramas/registro-fase-{n}.json').read_text(encoding='utf-8'))
    byid={e['id']:e for e in entries}
    table=['# Inventario y correspondencia — fase 9','','25 figuras revisadas: seis referencias conservadas y 19 copias académicas. Una figura adaptada se pagina en tres partes: no son tres escenarios sucesivos. Los 118 originales siguen siendo la referencia técnica.','','| Figura / copia | Original y ficha | Decisión / motivo | PlantUML de entrega | SVG de entrega |','| --- | --- | --- | --- | --- |']
    evaluation=['# Evaluación de legibilidad — fase 9','','Estimación editorial, no certificación de impresión. Áreas útiles A4: 160 × 225 mm vertical y 245 × 155 mm horizontal; A3 horizontal: 380 × 245 mm. No son normas institucionales. Se usa la mediana de los tamaños SVG como aproximación al cuerpo (excluye por frecuencia el pie, pero no garantiza el tamaño de cada nota). Fórmula: tamaño SVG × min(ancho útil/ancho SVG, alto útil/alto SVG) × 72/25,4. Umbral orientativo: 9 pt. La columna «ancho mínimo» conserva la proporción y dimensiona ese cuerpo a 9 pt; las notas pueden exigir mayor tamaño.','','Las hojas de contacto permiten revisar distribución, no leer todo el texto a escala física. Se inspeccionaron además las tres partes de Proyecto a resolución completa. No se han verificado Word, exportación PDF ni impresión. Los cambios pueden mejorar jerarquía o separación sin mejorar el ajuste A4: los valores inferiores al original se conservan explícitamente.','','| Figura / parte | Original: mejor A4 pt | Copia/referencia: mejor A4 pt | A3 horizontal pt | Dimensiones SVG px | Ancho mínimo del cuerpo a 9 pt (mm) | Dictamen editorial |','| --- | --- | --- | --- | --- | --- | --- |']
    cards=[]
    for i in rows:
        e=byid[i['original']];ficha=(ENG/e['description']).relative_to(ROOT).as_posix()
        if i['status']=='SIN CAMBIOS':reason='Sin cambios: tamaño estimado suficiente en al menos una orientación A4; conservar referencia.'
        elif i['figure']==20:reason='Adaptada y paginada 1–3: variantes independientes del mismo alt; contexto y retorno comunes se leen en conjunto.'
        elif i['figure'] in (12,13,21,22):reason='Adaptada: acciones y encabezados distribuidos en líneas; carriles y decisiones intactos.'
        elif i['figure'] in (14,15,16):reason='Adaptada: participantes en líneas y supresión de repetición inferior; mantener transacción completa.'
        else:reason='Adaptada: tipografía, contraste, espaciado y etiquetas; mismo contenido y relaciones.'
        sources=link(i.get('academic_source',i['source']),'Fuente académica' if i.get('academic_source') else 'Fuente original')
        svgs=' · '.join(link(p['path'],f'Parte {j}' if len(i['pages'])>1 else 'SVG') for j,p in enumerate(i['pages'],1))
        table.append(f"| {i['figure']:02d} / {i['academic_id']} | {link(i['source'],i['original'])} · {link(ficha,'Ficha y contratos')} | {reason} | {sources} | {svgs} |")
        for j,p in enumerate(i['pages'],1):
            a4=max(p['a4_portrait'],p['a4_landscape']);a3=p['a3_landscape'];width=round(p['width']*9*25.4/(p['median_font']*72))
            verdict='A4 orientativo; revisar notas y pie en maqueta.' if a4>=9 else 'A3 orientativo; A4 insuficiente.' if a3>=9 else 'Formato mayor / inserción ampliada: A4 y A3 insuficientes al umbral.'
            evaluation.append(f"| {i['figure']:02d}"+(f'.{j}' if len(i['pages'])>1 else '')+f" | {max(i['before']['a4_portrait'],i['before']['a4_landscape']):.1f} | {a4:.1f} | {a3:.1f} | {p['width']:.0f} × {p['height']:.0f} | {width} | {verdict} |")
        imgs=''.join(f'<a href="{escape(relative(p["path"]))}"><img loading="lazy" src="{escape(relative(p["path"]))}" alt="Figura {i["figure"]}, parte {j}"></a>' for j,p in enumerate(i['pages'],1))
        cards.append(f'<section><h2>Figura {i["figure"]:02d} · {escape(i["original"])}</h2><p>{escape(i["title"])} — {escape(i["status"])}</p><p>{escape(reason)}</p>{imgs}</section>')
    write(OUT/'inventario-adaptaciones.md','\n'.join(table)+'\n')
    evaluation+=['','## Observaciones y límites','','No se detectó recorte de texto fuera del lienzo en el control geométrico. La revisión visual no detectó solapamientos evidentes que impidan seguir los flujos; existen cruces de aristas y aproximaciones a etiquetas en arquitectura, clases y estados. No se acredita ausencia exhaustiva de colisiones entre curvas y textos. No se utilizó una división automática para eliminarlos.','','Las figuras 14–16 se mantienen completas: dividir guardas, atomic o compensación podría producir lecturas incompletas. Necesitan formato ampliado o consulta vectorial; no deben comprimirse a una página A4. Las figuras 21–22 conservan carriles y etapas propios de cada modalidad; la coordinación entre solicitudes no se interpreta como una transacción única. Los contratos Txx/Gxx/Axx deben acompañar los estados mediante sus fichas enlazadas.','','La figura 20 consta de tres páginas de continuación generadas con newpage dentro del mismo alt. La parte 1 contiene selección y validación común; la parte 3 contiene retorno y nota comunes. No insertar una parte aislada. Se conserva la variante aprobar-revision-final como nota, sin convertirla en paso obligatorio.']
    write(OUT/'evaluacion-legibilidad.md','\n'.join(evaluation)+'\n')
    write(OUT/'galeria.html','<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Figuras académicas — fase 9</title><style>body{font:16px Arial,sans-serif;color:#172033;background:#f1f5f9;max-width:1400px;margin:auto;padding:24px}section{background:white;padding:24px;margin:24px 0;border:1px solid #cbd5e1}img{display:block;max-width:100%;height:auto;margin:24px auto}a{color:#164e63}@media print{body{background:white;padding:0}section{break-before:page;border:0}img{max-height:none}}</style><h1>Figuras académicas — fase 9</h1><p>25 figuras; 19 adaptadas y seis originales referenciadas. Pulse cada SVG para ampliarlo. La vista ajustada del navegador no acredita legibilidad de impresión. Figura 20: leer las tres partes.</p>'+''.join(cards)+'</html>')
    write(OUT/'criterios-visuales.md','''# Criterios visuales y notación

Se conserva el lenguaje UML o ER del original, sin convertir ER en UML. Los identificadores DIA permanecen intactos; ACA-01 a ACA-25 localizan las figuras editoriales y no sustituyen los identificadores técnicos. Las copias mantienen referencias, alcance, versión y limitaciones en sus comentarios. Las fichas originales siguen ampliando el significado de contratos y restricciones.

Tipografía SansSerif de 16 px para el cuerpo; título 18 px, flechas y notas 14 px, leyenda 12 px y pie de referencia 10 px. Los seis originales conservan su tipografía. Fondo blanco, texto oscuro, bordes gris azulado y rellenos suaves; sin sombras. Los colores no codifican una regla académica. Las notas amarillas originales se conservan como notas, no como estados nuevos. No se incorpora ningún recurso de red ni fuente externa.

Se permiten saltos de línea en etiquetas, encabezados de carril y acciones; no se suprimen atributos, mensajes, participantes, cardinalidades, guardas o excepciones. No se añaden include/extend, asociaciones ni jerarquías. Los saltos dentro de nombres de clases son de presentación, no cambios de nombre técnico. Se elimina la repetición inferior de participantes en secuencias; las cabeceras permanecen.

Se prioriza la vista íntegra frente a particiones que aíslen un rollback o una guarda. Sólo Proyecto se pagina, tras comprobar que las tres variantes están declaradas como alternativas independientes. La fuente sigue conteniendo el mismo alt y todos sus mensajes en el mismo orden. Se repiten participantes mediante el paginador local y se rotulan las continuaciones.

Usar SVG vectorial e insertar con proporción bloqueada; no usar capturas de pantalla. Elegir orientación con la tabla de legibilidad y revisar las notas a tamaño final. El umbral de 9 puntos es una propuesta editorial mínima, no una garantía ni una norma universitaria. No ocultar limitaciones para hacer caber una figura. Para figuras que requieren mayor formato, acordar un desplegable o anexo vectorial antes del documento definitivo.
''')
    write(OUT/'README.md','''# Versiones académicas — fase 9

- [Inventario y correspondencia de las 25 figuras](inventario-adaptaciones.md).
- [Galería de SVG](galeria.html).
- [Criterios visuales](criterios-visuales.md).
- [Evaluación por figura y parte](evaluacion-legibilidad.md).
- [Informe de fase 9](informe-fase-9.md).
- [Inventario estructurado](inventario.json), [validación](validacion.json) y [estado inicial Git y huellas](estado-inicial.json).

19 fuentes PlantUML en `fuentes/`, 21 SVG en `svg/` (Proyecto tiene tres páginas). Las otras seis figuras enlazan los originales; no se duplican innecesariamente. PNG y hojas de contacto son auxiliares de revisión y no sustituyen SVG. Los siete Markdown de fase 8 conservan su contenido histórico; el índice académico remite a esta actualización.

Reproducción desde la raíz, sin instalar dependencias: `python -B docs/ingenieria/presentacion-academica/fase-9/optimizar.py actualizar`, luego `renderizar`, después `python -B docs/ingenieria/presentacion-academica/fase-9/verificar.py` y `documentar.py`. `originales` genera únicamente PNG auxiliares de los seis originales. `preparar` es inicial y rechaza sobrescribir la línea base. Los temporales Java/Graphviz y registros se escriben aquí. No ejecutar los renderizadores originales para esta entrega.
''')
    print('Inventario, evaluación, criterios y galería generados.')
if __name__=='__main__':main()
