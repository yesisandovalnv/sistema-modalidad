"""Construcción documental local de fase 10. No importa ni ejecuta el producto."""
from pathlib import Path
import hashlib,json,re,subprocess,os,sys,zipfile
sys.dont_write_bytecode=True
from docx import Document
from docx.shared import Mm,Pt,RGBColor
from docx.enum.section import WD_SECTION_START,WD_ORIENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.part import Part
from docx.opc.packuri import PackURI
from docx.opc.constants import RELATIONSHIP_TYPE as RT
OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[3]
ENG=ROOT/'docs/ingenieria'
ACA=ENG/'presentacion-academica'
F9=ACA/'fase-9'
MAIN={2,4,6,9,18,23,24,25}
A3={1,3,5,7,8,10,11,17,19,20}
BIG={12,13,14,15,16,21,22}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,t):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(t,encoding='utf-8')
def git(*a):return subprocess.check_output(['git',*a],cwd=ROOT).decode('utf-8').strip()
def snapshot():
    names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
    files={n:sha(ROOT/n) for n in sorted(set(names)) if n and not n.startswith('docs/ingenieria/presentacion-academica/fase-10/') and (ROOT/n).is_file()}
    for p in (ENG/'diagramas').rglob('*'):
        if p.is_file() and p.suffix in ('.puml','.svg','.inc','.py','.jar','.exe'):files[p.relative_to(ROOT).as_posix()]=sha(p)
    return {'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'status':git('status','--porcelain=v1','--untracked-files=all'),'files':files}
def plain(t):
    t=re.sub(r'\[([^\]]+)\]\([^)]+\)',r'\1',t)
    return t.replace('**','').replace('`','').strip()
def load():
    evidence=json.loads((F9/'validacion.json').read_text(encoding='utf-8'))['figures']
    manifest=json.loads((F9/'inventario.json').read_text(encoding='utf-8'))
    blocks=re.split(r'(?m)^## Figura (\d+)\. (.+)\n',(ACA/'explicacion-diagramas.md').read_text(encoding='utf-8'))
    explain={int(blocks[i]):(blocks[i+1],blocks[i+2]) for i in range(1,len(blocks),3)}
    entries=[]
    for n in (3,4,5):entries+=json.loads((ENG/f'diagramas/registro-fase-{n}.json').read_text(encoding='utf-8'))
    reg={e['id']:e for e in entries};rows=[]
    for i in manifest:
        n=i['figure'];ev=next(r for r in evidence if r['figure']==n);title,body=explain[n]
        if i['original'] not in body:raise ValueError('Contradicción de identificador '+str(n))
        fields={}
        for key,val in re.findall(r'\*\*([^*]+)\.\*\*\s*(.*?)(?=\n\n|\Z)',body,re.S):fields[key]=plain(val)
        for k in ('Objetivo','Elementos y relaciones principales','Interpretación técnica y relación con la implementación'):
            if not fields.get(k):raise ValueError(f'Falta explicación {n}: {k}')
        paths=[i['source'],i['svg_original'],i.get('academic_source',i['source'])]+[p['path'] for p in ev['pages']]
        for p in paths:
            if not (ROOT/p).is_file():raise FileNotFoundError(p)
        if sha(ROOT/i['source'])!=i['source_sha256'] or sha(ROOT/i['svg_original'])!=i['svg_sha256']:raise ValueError('Original cambiado '+i['original'])
        record=reg[i['original']]
        rows.append({**i,'title_academic':title,'fields':fields,'pages':ev['pages'],'ficha':(ENG/record['description']).relative_to(ROOT).as_posix(),'rules':record.get('rules',[]),'cases':record.get('cases',[]),'sources':record.get('sources',[]),'destination':'principal' if n in MAIN else 'anexo A3' if n in A3 else 'SVG ampliado'})
    if len(rows)!=25 or len(explain)!=25:raise ValueError('Selección incompleta')
    return rows
def field(p,name):
    r=p.add_run();e=OxmlElement('w:fldSimple');e.set(qn('w:instr'),name);r._r.addnext(e)
def bookmark(p,name):
    e=OxmlElement('w:bookmarkStart');e.set(qn('w:id'),str(bookmark.count));e.set(qn('w:name'),name);p._p.insert(0,e)
    z=OxmlElement('w:bookmarkEnd');z.set(qn('w:id'),str(bookmark.count));p._p.append(z);bookmark.count+=1
bookmark.count=1
def hyperlink(p,label,path,anchor=None):
    h=OxmlElement('w:hyperlink')
    if anchor:h.set(qn('w:anchor'),anchor)
    else:
        relpath=Path(os.path.relpath(ROOT/path,OUT)).as_posix()
        h.set(qn('r:id'),p.part.relate_to(relpath,RT.HYPERLINK,is_external=True))
    r=OxmlElement('w:r');pr=OxmlElement('w:rPr');color=OxmlElement('w:color');color.set(qn('w:val'),'164E63');pr.append(color);r.append(pr);t=OxmlElement('w:t');t.text=label;r.append(t);h.append(r);p._p.append(h)
def setup_section(s,kind='a4',land=False):
    w,h=((297,420) if kind=='a3' else (210,297))
    if land:w,h=h,w
    s.orientation=WD_ORIENT.LANDSCAPE if land else WD_ORIENT.PORTRAIT
    s.page_width=Mm(w);s.page_height=Mm(h)
    s.top_margin=s.bottom_margin=s.left_margin=s.right_margin=Mm(25)
    s.header_distance=s.footer_distance=Mm(10)
def newdoc(title):
    d=Document();setup_section(d.sections[0]);d.core_properties.title=title;d.core_properties.author='';d.core_properties.subject='Sistema de Modalidades de Graduación'
    for name in ('Normal','Body Text','Title','Subtitle','Heading 1','Heading 2','Heading 3','Caption'):
        st=d.styles[name];st.font.name='Times New Roman';st.font.color.rgb=RGBColor(0,0,0)
        for fonts in st.element.xpath('.//w:rFonts'):
            for key in list(fonts.attrib):
                if key.endswith('Theme'):del fonts.attrib[key]
        for border in st.element.xpath('.//w:pBdr'):border.getparent().remove(border)
        st.font.size=Pt(12 if name in ('Normal','Body Text') else 22 if name=='Title' else 16 if name=='Heading 1' else 13 if name=='Heading 2' else 11)
        st.paragraph_format.line_spacing=1.5;st.paragraph_format.space_after=Pt(6)
    for name in ('Heading 1','Heading 2','Heading 3'):d.styles[name].paragraph_format.keep_with_next=True
    d.styles['Normal'].paragraph_format.widow_control=True
    # La plantilla de python-docx puede contener una regla de título o temas heredados.
    for border in d.styles.element.xpath('.//w:pBdr'):border.getparent().remove(border)
    footer=d.sections[0].footer.paragraphs[0];footer.alignment=WD_ALIGN_PARAGRAPH.CENTER
    footer.paragraph_format.line_spacing=1;footer.add_run('Página ').font.size=Pt(10);field(footer,'PAGE')
    d.add_paragraph(title,'Title')
    return d
def para(d,t,lead=None):
    p=d.add_paragraph()
    if lead:p.add_run(lead+' ').bold=True
    p.add_run(t);return p
def table(d,heads,rows,widths):
    tab=d.add_table(rows=1,cols=len(heads));tab.autofit=False
    for c,w,h in zip(tab.columns,widths,heads):c.width=Mm(w)
    for c,h in zip(tab.rows[0].cells,heads):c.text=h
    hdr=OxmlElement('w:tblHeader');tab.rows[0]._tr.get_or_add_trPr().append(hdr)
    for r in rows:
        for c,t in zip(tab.add_row().cells,r):c.text=str(t)
    borders=OxmlElement('w:tblBorders')
    for edge in ('top','left','bottom','right','insideH','insideV'):
        e=OxmlElement('w:'+edge);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'D9D9D9');borders.append(e)
    tab._tbl.tblPr.append(borders)
    for n,row in enumerate(tab.rows):
        for c,w in zip(row.cells,widths):
            c.width=Mm(w);pr=c._tc.get_or_add_tcPr();m=OxmlElement('w:tcMar')
            for side in ('top','left','bottom','right'):
                e=OxmlElement('w:'+side);e.set(qn('w:w'),'90');e.set(qn('w:type'),'dxa');m.append(e)
            pr.append(m)
            if n==0:
                sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'E7EDF2');pr.append(sh)
            for p in c.paragraphs:
                p.paragraph_format.line_spacing=1.15;p.paragraph_format.space_after=Pt(3)
                for r in p.runs:r.font.size=Pt(10.5);r.bold=n==0
        no=OxmlElement('w:cantSplit');row._tr.get_or_add_trPr().append(no)
    d.add_paragraph().paragraph_format.space_after=Pt(0)
    return tab
def figure_links(d,i,main=False):
    p=para(d,f"Identificador original {i['original']}. ")
    if main:p.paragraph_format.keep_with_next=True
    hyperlink(p,'Fuente PlantUML',i.get('academic_source',i['source']));p.add_run(' · ');hyperlink(p,'Ficha técnica y contratos',i['ficha'])
    for j,page in enumerate(i['pages'],1):
        p.add_run(' · ');hyperlink(p,f'SVG {j}/{len(i["pages"])}' if len(i['pages'])>1 else 'SVG ampliable',page['path'])
    if main:
        p=para(d,f"Anexo técnico A{i['figure']:02d} en anexos-uml.docx. ")
        hyperlink(p,'Abrir documento complementario',(OUT/'anexos-uml.docx').relative_to(ROOT).as_posix())
    return p
def insert_picture(d,i,page_index=0,kind='a4',return_after=True):
    page=i['pages'][page_index];w,h=page['width'],page['height']
    # 3 mm de reserva para la línea del párrafo; el título va en la cabecera de esta sección.
    dims=[('portrait',160,244),('landscape',247,157)] if kind=='a4' else [('portrait',247,367),('landscape',370,244)]
    orientation,aw,ah=max(dims,key=lambda x:min((x[1]-2)/w,x[2]/h))
    s=d.add_section(WD_SECTION_START.NEW_PAGE);setup_section(s,kind,orientation=='landscape')
    s.header.is_linked_to_previous=False;p=s.header.paragraphs[0]
    p.paragraph_format.line_spacing=1;p.paragraph_format.space_after=Pt(0)
    label=f"Figura {i['figure']:02d}"+(f" parte {page_index+1} de 3" if i['figure']==20 else '')
    p.add_run(label+'  '+i['title_academic']).font.size=Pt(10.5)
    if i['figure']==20:p.add_run('  Leer las tres partes conjuntamente').font.size=Pt(10)
    scale=min((aw-2)/w,ah/h);width=w*scale;height=h*scale
    svg=ROOT/page['path']
    png=F9/'png'/(svg.stem+'.png') if i.get('academic_source') else next((F9/'originales-revisados').glob(Path(i['source']).stem+'.png'))
    p=d.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.line_spacing=1;p.paragraph_format.space_after=Pt(0);p.paragraph_format.space_before=Pt(0)
    run=p.add_run();run.font.size=Pt(1);inline=run.add_picture(str(png),width=Mm(width),height=Mm(height))
    inline._inline.docPr.set('descr',label+' '+i['original']+' '+i['title_academic'])
    # SVG nativo con PNG de compatibilidad para lectores sin soporte SVG.
    part=Part(PackURI(f'/word/media/figura-{i["figure"]:02d}-{page_index+1}.svg'),'image/svg+xml',svg.read_bytes(),d.part.package)
    rid=d.part.relate_to(part,RT.IMAGE)
    blip=inline._inline.xpath('.//a:blip')[0];exts=OxmlElement('a:extLst');ext=OxmlElement('a:ext');ext.set('uri','{96DAC541-7B7A-43D3-8B79-37D633B846F1}')
    from lxml import etree
    e=etree.Element('{http://schemas.microsoft.com/office/drawing/2016/SVG/main}svgBlip',nsmap={'asvg':'http://schemas.microsoft.com/office/drawing/2016/SVG/main'});e.set(qn('r:embed'),rid);ext.append(e);exts.append(ext);blip.append(exts)
    placement={'figure':i['figure'],'part':page_index+1,'paper':kind.upper(),'orientation':orientation,'width_mm':round(width,2),'height_mm':round(height,2),'body_pt_estimate':round(page['median_font']*scale*72/25.4,2),'svg':page['path'],'png_fallback':png.relative_to(ROOT).as_posix()}
    PLACEMENTS.append(placement)
    if return_after:
        after=d.add_section(WD_SECTION_START.NEW_PAGE);setup_section(after);after.header.is_linked_to_previous=False
    return placement
PLACEMENTS=[]
SECTIONS=[
('Introducción',[],['El sistema organiza expedientes de graduación y sus evidencias académicas mediante una aplicación web y servicios de dominio. Este análisis explica la arquitectura implementada, los actores autorizados, las entidades persistentes y los recorridos representados en la documentación UML. La separación entre infraestructura común y políticas de modalidad permite describir la reutilización sin convertir reglas particulares en requisitos universales.']),
('Alcance del análisis y diseño',[],['La referencia comprende 118 diagramas técnicos originales y una selección de 25 figuras académicas. Los modelos describen código y configuración declarada; no acreditan el esquema físico instalado ni una infraestructura de producción observada. El modelo entidad relación se presenta como complemento lógico de UML.','El formato de este documento es provisional: A4, márgenes de 2,5 cm, texto de 12 puntos e interlineado de 1,5. Estos parámetros no se presentan como normas oficiales de la UABJB. Las láminas A3 se localizan en el documento complementario; las figuras que exceden ese formato conservan su SVG ampliable.']),
('Identificación de actores',[],['Se distinguen roles persistidos, autoridad administrativa, relación contextual con el expediente y participación académica. La administración funcional corresponde a is_superuser o al rol ADMINISTRADOR según la guarda del backend. ADMINISTRACION e is_staff no equivalen por sí solos a esa autoridad. Un tutor, tribunal o supervisor registrado no obtiene automáticamente permiso para operar la API.']),
('Requisitos funcionales representados',[],['El catálogo existente identifica 75 casos de uso. La selección explica objetivos implementados: acceso y sesión, consulta de expedientes, transiciones de etapas, evidencias documentales, asignaciones y defensas, evaluaciones, notificaciones, reportes y administración académica. No sustituye las especificaciones completas ni convierte una capacidad visible en autorización.','La exigencia de documentos, actores, contexto, intentos y resultados se resuelve según la policy y la operación concreta. Las notificaciones representadas pertenecen a la publicación interna documentada; no se presupone un servicio externo de mensajería.']),
('Modelo de casos de uso',[1,2,3,4],['Las asociaciones expresan interacción con un objetivo bajo las guardas del backend. Las generalizaciones de actores hacia usuario autenticado no transfieren alcance entre expedientes. No se incorporan include o extend para reducir líneas.']),
('Arquitectura del sistema',[5,6,7],['El frontend React consume la API de Django REST Framework mediante HTTP, JSON y multipart, con autenticación JWT donde corresponde. Servicios, policies y ORM conviven en el backend; las dependencias del diagrama de componentes no representan microservicios desplegados por separado. PostgreSQL y los archivos gestionados por FileField cumplen responsabilidades distintas.','La configuración Docker documentada corresponde al desarrollo local. Sus redes, puertos y volúmenes se interpretan como declaraciones, sin afirmar que la topología productiva se encuentre instalada.']),
('Modelo de clases',[8,9],['Las clases de dominio muestran atributos, operaciones y relaciones respaldados por los modelos. Las referencias abreviadas conectan conceptos de otros módulos sin duplicar su definición completa. La opcionalidad de las claves no se sustituye por una obligación funcional que no esté demostrada.']),
('Modelo de datos',[10,11],['Las figuras entidad relación se derivan de los modelos Django. Expresan claves y restricciones seleccionadas, incluida la unicidad condicional cuando está declarada. No constituyen una inspección del catálogo instalado de PostgreSQL. Las restricciones y campos restantes se consultan en el diccionario técnico.']),
('Diagramas de actividades',[12,13],['Estas vistas explican decisiones y operaciones del proceso común. Las rutas históricas se separan del seguimiento operativo; iniciar, observar, aprobar, rechazar u omitir son variantes sujetas a validación, no una lista de operaciones siempre consecutivas.']),
('Diagramas de secuencia',[14,15,16],['Las secuencias delimitan mensajes, decisiones y efectos transaccionales. atomic no convierte el almacenamiento de archivos en una transacción PostgreSQL; la compensación representada tiene el alcance concreto del manejo de excepciones documentado. Los callbacks on_commit se distinguen de efectos ejecutados antes del commit.']),
('Diagramas de estados',[17,18,19],['El estado del seguimiento, la revisión documental y el evento de defensa pertenecen a dimensiones diferentes. Las etiquetas Txx identifican contratos documentales, Gxx sus guardas y Axx sus acciones. Las fichas enlazadas contienen su desarrollo y deben acompañar la interpretación de cada máquina.']),
('Particularidades de las modalidades',[20,21,22,23,24,25],['Las seis modalidades reutilizan infraestructura común, pero conservan etapas, actores académicos, evaluaciones y criterios de conclusión propios. La conclusión general y un cierre documental específico no son sinónimos. Los recorridos nominales de Tesis y Trabajo Dirigido coordinan varias solicitudes; no se ejecutan como un único método automático.']),
('Consideraciones de trazabilidad',[],['La documentación enlaza caso de uso, escenario, regla de negocio, implementación, entidad y prueba cuando existe evidencia pertinente. La fase 7.1 revisó 75 especificaciones y 511 entradas: 28 verificadas documentalmente, cinco parciales, 381 sin prueba identificada y 97 no verificables. Estas categorías no equivalen a resultados de ejecución.','Las relaciones positivas remiten a 71 aserciones distintas en 30 métodos; una prueba de servicio no acredita por sí sola autenticación del endpoint. El cierre de AUD 06 009 es documental. Los vacíos de cobertura continúan explícitos, sin afirmar que las pruebas pasan.']),
('Conclusiones del diseño',[],['La arquitectura observada concentra el comportamiento académico en servicios y políticas que colaboran con una API común y una interfaz de expediente. Los modelos permiten distinguir postulación, seguimiento, documento, defensa y resultado, evitando atribuir a un único estado efectos que pertenecen a entidades distintas.','La documentación modular facilita mantener vistas legibles y preservar las particularidades de cada modalidad. La trazabilidad al código acota las afirmaciones del análisis; su actualización requiere conservar identificadores, versión y límites de evidencia. La revisión de impresión y el ajuste a una plantilla universitaria deben completarse antes de una entrega institucional definitiva.']),
('Referencias a los anexos técnicos',[],['El documento anexos-uml.docx organiza las figuras como A01 a A25, conserva los identificadores DIA y relaciona cada lámina con su apartado de este documento. La figura 20 consta de tres páginas complementarias del mismo alt; se consulta como conjunto. Las siete figuras que requieren un formato mayor remiten a los SVG sin reducir etiquetas hasta volverlas ilegibles.'])]
def explain(d,i,brief=False):
    n=i['figure'];p=d.add_paragraph(f"Figura {n:02d}  {i['title_academic']}",'Heading 2');bookmark(p,f'figura{n:02d}')
    para(d,i['fields']['Objetivo'])
    para(d,i['fields']['Elementos y relaciones principales'], 'Elementos principales.')
    p=para(d,i['fields']['Interpretación técnica y relación con la implementación'],'Interpretación.');p.paragraph_format.keep_with_next=True
    if n==20:
        p=para(d,'Las partes 20.1, 20.2 y 20.3 representan alternativas, no tres acciones sucesivas de una petición. La primera mantiene la selección y validación comunes; la tercera, el retorno y la nota de revisión final. Deben leerse conjuntamente.');p.paragraph_format.keep_with_next=True
    figure_links(d,i,main=True)
def main():
    prefix='revision-' if '--revision' in sys.argv else ''
    if not (OUT/'estado-inicial.json').exists():write(OUT/'estado-inicial.json',json.dumps(snapshot(),ensure_ascii=False,indent=2))
    rows=load();by={i['figure']:i for i in rows}
    title='ANÁLISIS Y DISEÑO DEL SISTEMA DE MODALIDADES DE GRADUACIÓN'
    d=newdoc(title);para(d,'Análisis de la implementación y sus modelos técnicos, con referencias a las figuras académicas y a la evidencia documental del repositorio.')
    para(d,f"Referencia Git {git('rev-parse','HEAD')[:12]}, rama {git('branch','--show-current')}. Fecha documental 2 de noviembre de 2026. Se considera el directorio de trabajo, incluidos los cambios locales registrados.")
    d.add_paragraph('Contenido','Heading 1')
    for k,(heading,nums,texts) in enumerate(SECTIONS,1):
        p=d.add_paragraph();hyperlink(p,f'{k}  {heading}',None,anchor=f'seccion{k}')
    for k,(heading,nums,texts) in enumerate(SECTIONS,1):
        h=d.add_paragraph(f'{k}  {heading}','Heading 1');bookmark(h,f'seccion{k}')
        for t in texts:para(d,t)
        if k==3:
            actors=[('ACT-SYS-001','Solicitante de acceso','Solicita sesión o presenta refresh según la operación.'),('ACT-SYS-002','Usuario autenticado','Sesión admitida; guardas adicionales por endpoint.'),('ACT-USR-001','Administración funcional','Autoridad administrativa comprobada por el backend.'),('ACT-USR-002','Estudiante','Consulta propia según filtro; rol distinto de propiedad.'),('ACT-USR-003','Docente','Lectura por asignación cuando la ruta lo permite.'),('ACT-POS-001','Propietario','Relación usuario y estudiante de la postulación.'),('ACT-POS-002','Vinculado al expediente','Asignación o participación según el queryset concreto.')]
            table(d,['Actor','Denominación','Alcance resumido'],actors,[29,46,85])
            p=para(d,'Referencia de actores y permisos: ');hyperlink(p,'Catálogo y condiciones de acceso','docs/ingenieria/02-actores-permisos/actores-fase-4.md')
        for n in nums:
            i=by[n];explain(d,i)
            if n in MAIN:
                para(d,'La figura se incorpora a continuación. Las notas y contratos se amplían en la ficha técnica del anexo; la imagen conserva su contenido original.')
                insert_picture(d,i)
        if k==13:
            for label,path in [('Matriz funcional y entidades','10-trazabilidad-y-validacion/matriz-fase-4.md'),('Matriz de escenarios y aserciones','10-trazabilidad-y-validacion/matriz-escenarios-fase-7-1.md'),('Informe de cobertura documental','10-trazabilidad-y-validacion/informe-fase-7-1.md')]:
                p=d.add_paragraph();hyperlink(p,label,'docs/ingenieria/'+path)
    d.save(OUT/(prefix+'analisis-y-diseno.docx'))
    a=newdoc('ANEXOS TÉCNICOS DE ANÁLISIS Y DISEÑO')
    para(a,'Este documento complementa el análisis y diseño del Sistema de Modalidades de Graduación. Localiza las 25 figuras seleccionadas, sus identificadores y fuentes PlantUML, e incorpora las versiones ampliadas que admiten A3. Los SVG se conservan para consulta vectorial cuando una figura requiere mayor formato.')
    para(a,'Los márgenes de 2,5 cm y la tipografía de 12 puntos son provisionales. No representan una norma oficial de la UABJB. Las láminas amplias utilizan A3 en la orientación que mejor conserva el tamaño del cuerpo; su idoneidad física debe confirmarse al imprimir. Las notas se desarrollan en texto y en las fichas técnicas.')
    p=para(a,'Documento principal: ');hyperlink(p,'Análisis y diseño',(OUT/'analisis-y-diseno.docx').relative_to(ROOT).as_posix())
    a.add_paragraph('Índice de figuras','Heading 1')
    index=table(a,['Anexo','Identificador original','Título','Ubicación'],[(f'A{i["figure"]:02d}',i['original'],i['title_academic'],i['destination']) for i in rows],[16,32,78,34])
    for row,item in zip(index.rows[1:],rows):
        p=row.cells[0].paragraphs[0];p.clear();hyperlink(p,f'A{item["figure"]:02d}',None,anchor=f'anexo{item["figure"]:02d}')
    for i in rows:
        start=len(a.paragraphs)
        n=i['figure'];p=a.add_paragraph(f'A{n:02d}  {i["title_academic"]}','Heading 1');bookmark(p,f'anexo{n:02d}')
        para(a,f"Correspondencia: figura {n:02d} del documento principal, apartado "+next(h for h,ns,ts in SECTIONS if n in ns)+'.')
        para(a,i['fields']['Objetivo']+' '+i['fields']['Interpretación técnica y relación con la implementación'])
        figure_links(a,i)
        # Repetir las notas de las imágenes en texto editable legible, sin alterar el SVG.
        import xml.etree.ElementTree as ET
        svgtext=[]
        for pg in i['pages']:
            svgtext += [''.join(e.itertext()) for e in ET.parse(ROOT/pg['path']).getroot().iter() if e.tag.endswith('}text') and float(e.get('font-size','99'))<=12 and ''.join(e.itertext()).strip()]
        svgtext=list(dict.fromkeys(t for t in svgtext if '689eeb' not in t and not t.startswith('Referencia técnica:')))
        if svgtext:para(a,' '.join(svgtext),'Notas y convenciones de lectura.')
        if n in MAIN:para(a,'La lámina A4 se encuentra incorporada en el documento principal. Este registro conserva la correspondencia y el enlace al SVG para ampliación, sin duplicar la imagen.')
        elif n in BIG:para(a,'Esta figura excede el umbral de legibilidad estimado para A3. Se conserva el SVG ampliable enlazado y su fuente; no se inserta una reducción ilegible ni se afirma que cabe legiblemente en A3.')
        else:
            if n==20:para(a,'Las tres láminas siguientes son páginas de continuación del mismo fragmento alt. Consultarlas juntas: la primera conserva contexto y validación comunes; la última contiene el retorno y la nota comunes. No interpretarlas como operaciones consecutivas.')
            # Mantener el texto del registro junto, y las tres continuaciones consecutivas.
            for p in a.paragraphs[start:-1]:p.paragraph_format.keep_with_next=True
            for j in range(len(i['pages'])):insert_picture(a,i,j,'a3',return_after=j==len(i['pages'])-1)
        if n not in A3:
            for p in a.paragraphs[start:-1]:p.paragraph_format.keep_with_next=True
    a.save(OUT/(prefix+'anexos-uml.docx'))
    write(OUT/'inventario-estructurado.json',json.dumps(rows,ensure_ascii=False,indent=2))
    write(OUT/'colocacion-figuras.json',json.dumps(PLACEMENTS,ensure_ascii=False,indent=2))
    print(json.dumps({'figures':len(rows),'main_images':sum(p['paper']=='A4' for p in PLACEMENTS),'annex_images':sum(p['paper']=='A3' for p in PLACEMENTS),'outputs':[prefix+'analisis-y-diseno.docx',prefix+'anexos-uml.docx']},ensure_ascii=False))
if __name__=='__main__':main()
