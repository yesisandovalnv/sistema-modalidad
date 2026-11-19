"""Validación estática DOCX, conservación y revisión auxiliar de páginas."""
from preparar_documentos import *
import xml.etree.ElementTree as ET
import pypdfium2 as pdfium
from PIL import Image,ImageDraw,ImageFont
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/package/2006/relationships'}
def validate():
    prefix='revision-' if '--revision' in sys.argv else ''
    errors=[];results={};rows=load();placements=json.loads((OUT/'colocacion-figuras.json').read_text(encoding='utf-8'));base=json.loads((OUT/'estado-inicial.json').read_text(encoding='utf-8'))
    for file in ('analisis-y-diseno.docx','anexos-uml.docx'):
        actual=prefix+file
        with zipfile.ZipFile(OUT/actual) as z:
            if z.testzip():errors.append('CRC ZIP '+file)
            for n in z.namelist():
                if n.endswith(('.xml','.rels')):ET.fromstring(z.read(n))
            document=ET.fromstring(z.read('word/document.xml'));text=' '.join(document.itertext());ids=[i['original'] for i in rows]
            if [text.find(id) for id in ids]!=sorted(text.find(id) for id in ids):errors.append(file+': orden de figuras')
            styles=ET.fromstring(z.read('word/styles.xml'))
            if styles.findall('.//w:pBdr',NS) or document.findall('.//w:pBdr',NS):errors.append(file+': borde de párrafo no previsto')
            for id in ids:
                if id not in text:errors.append(file+': falta '+id)
            expected=8 if file.startswith('analisis') else 12
            images=document.findall('.//w:drawing',NS)
            if len(images)!=expected:errors.append(file+': cantidad de imágenes')
            svgs=[n for n in z.namelist() if n.endswith('.svg')]
            if len(svgs)!=expected:errors.append(file+': SVG nativos faltantes')
            relation=ET.fromstring(z.read('word/_rels/document.xml.rels'));links=0
            for r in relation:
                if r.get('TargetMode')=='External' and r.get('Type','').endswith('/hyperlink'):
                    links+=1;target=r.get('Target');path=(OUT/target).resolve()
                    if not path.exists():errors.append(file+': enlace inexistente '+target)
            bookmarks=[e.get('{'+NS['w']+'}name') for e in document.findall('.//w:bookmarkStart',NS)]
            for h in document.findall('.//w:hyperlink',NS):
                anchor=h.get('{'+NS['w']+'}anchor')
                if anchor and anchor not in bookmarks:errors.append(file+': ancla '+anchor)
            if len(bookmarks)!=len(set(bookmarks)):errors.append(file+': marcadores duplicados')
            # Márgenes y medidas declaradas: todo el contenido mantiene 25 mm.
            for s in document.findall('.//w:sectPr',NS):
                m=s.find('w:pgMar',NS)
                for side in ('top','bottom','left','right'):
                    if abs(int(m.get('{'+NS['w']+'}'+side))-1417)>1:errors.append(file+': margen '+side)
            results[actual]={'zip_crc':'OK','xml':'OK','images':len(images),'native_svg':len(svgs),'figure_ids':len(ids),'external_local_links':links,'bookmarks':len(bookmarks),'sha256':sha(OUT/actual)}
    for p in placements:
        if p['body_pt_estimate']<9:errors.append('Cuerpo estimado menor de 9 pt: '+str(p['figure']))
    for path,h in base['files'].items():
        p=ROOT/path
        if not p.is_file() or sha(p)!=h:errors.append('Exterior alterado: '+path)
    if git('rev-parse','HEAD')!=base['head'] or git('branch','--show-current')!=base['branch']:errors.append('Referencia Git modificada')
    result={'errors':errors,'documents':results,'figures':25,'main_images':8,'annex_figures':10,'annex_images':12,'svg_only_figures':7,'outside_files_checked':len(base['files']),'head':base['head'],'branch':base['branch'],'product_tests_executed':False,'physical_print_checked':False}
    write(OUT/('validacion-revision.json' if prefix else 'validacion-automatica.json'),json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
    if errors:raise SystemExit(1)
def raster():
    for name in ('analisis-y-diseno','anexos-uml'):
        target=OUT/'qa'/name;target.mkdir(exist_ok=True)
        path=target/f'{name}.pdf'
        if not path.exists():path=OUT/'qa'/f'{name}.pdf'
        pdf=pdfium.PdfDocument(str(path));records=[];thumbs=[]
        font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
        for n in range(len(pdf)):
            page=pdf[n];png=target/f'page-{n+1}.png'
            if png.exists():im=Image.open(png).convert('RGB')
            else:im=page.render(scale=1.5).to_pil().convert('RGB');im.save(png)
            text=page.get_textpage().get_text_range();records.append({'page':n+1,'width_pt':page.get_width(),'height_pt':page.get_height(),'text':text})
            im.thumbnail((460,610));cell=Image.new('RGB',(500,660),'#e5e7eb');cell.paste(im,((500-im.width)//2,32));ImageDraw.Draw(cell).text((12,8),f'{name} / {n+1}',fill='black',font=font);thumbs.append(cell)
        for start in range(0,len(thumbs),6):
            contact=Image.new('RGB',(1500,1320),'white')
            for j,im in enumerate(thumbs[start:start+6]):contact.paste(im,((j%3)*500,(j//3)*660))
            contact.save(target/f'contacto-{start//6+1:02d}.png')
        write(target/'paginas.json',json.dumps(records,ensure_ascii=False,indent=2));print(name,len(pdf),'páginas',flush=True)
if __name__=='__main__':{'validar':validate,'rasterizar':raster}[sys.argv[1]]()
