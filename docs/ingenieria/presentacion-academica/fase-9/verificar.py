"""Control documental y previsualizaciones; no ejecuta pruebas del producto."""
from optimizar import *
import xml.etree.ElementTree as ET
from PIL import Image,ImageDraw,ImageFont
def canon(text):
    lines=[l for l in text.splitlines() if not l.lstrip().startswith(("'",'!include','skinparam','title ','footer ','@startuml','hide footbox','newpage '))]
    return re.sub(r'\s+','', '\n'.join(lines).replace(r'\n','').replace('"',''))
def metrics(path):
    root=ET.parse(path).getroot();v=root.get('viewBox').split();w,h=map(float,v[2:]);fonts=[];outside=[]
    for e in root.iter():
        if e.tag.endswith('}text') and ''.join(e.itertext()).strip():
            f=float(e.get('font-size','0'));fonts.append(f)
            if all(e.get(a) for a in ('x','y','textLength')):
                x,y,tw=[float(e.get(a)) for a in ('x','y','textLength')]
                if x < -1 or y-f*.82 < -1 or x+tw > w+1 or y+f*.18 > h+1: outside.append(''.join(e.itertext()))
    body=sorted(fonts)[len(fonts)//2]
    def pt(a,b):return round(body*min(a/w,b/h)*72/25.4,1)
    return dict(width=w,height=h,median_font=body,a4_portrait=pt(160,225),a4_landscape=pt(245,155),a3_landscape=pt(380,245),outside=outside)
def main():
    inv=json.loads((OUT/'inventario.json').read_text(encoding='utf-8'));b=json.loads((OUT/'estado-inicial.json').read_text(encoding='utf-8'));errors=[];results=[]
    for p,d in b['outside'].items():
        if not (ROOT/p).is_file() or sha(ROOT/p)!=d:errors.append('Archivo externo alterado: '+p)
    if git('rev-parse','HEAD')!=b['head'] or git('branch','--show-current')!=b['branch']:errors.append('Referencia Git cambió')
    for item in inv:
        orig=ROOT/item['source'];svgo=ROOT/item['svg_original'];new=ROOT/item.get('academic_svg',item['svg_original'])
        if sha(orig)!=item['source_sha256'] or sha(svgo)!=item['svg_sha256']:errors.append('Original alterado: '+item['original'])
        same=not item.get('academic_source') or canon(orig.read_text(encoding='utf-8'))==canon((ROOT/item['academic_source']).read_text(encoding='utf-8'))
        if not same:errors.append('Diferencia de contenido: '+item['academic_id'])
        pages=sorted(new.parent.glob(new.stem+'*.svg')) if item.get('academic_source') else [new]
        if len(pages)!=(3 if item['figure']==20 else 1):errors.append('Cantidad de páginas incorrecta: '+item['academic_id'])
        results.append({**item,'split':len(pages)>1,'pages':[{'path':p.relative_to(ROOT).as_posix(),**metrics(p)} for p in pages],'before':metrics(svgo),'after':metrics(new),'content_equivalent':same})
    ids=[i['academic_id'] for i in inv]
    if len(ids)!=len(set(ids)):errors.append('IDs duplicados')
    write(OUT/'validacion.json',json.dumps({'outside_files_checked':len(b['outside']),'errors':errors,'figures':results},ensure_ascii=False,indent=2))
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
    images=[]
    # Contactos para inspección de las 19 copias; los seis originales se revisan aparte.
    for item in inv:
        if not item.get('academic_source'):continue
        p=OUT/'png'/ (Path(item['academic_source']).stem+'.png');im=Image.open(p).convert('RGB');im.thumbnail((700,850))
        cell=Image.new('RGB',(740,900),'#e5e7eb');cell.paste(im,((740-im.width)//2,40));ImageDraw.Draw(cell).text((12,10),item['academic_id']+' / '+item['original'],fill='black',font=font);images.append(cell)
    for start in range(0,len(images),4):
        sheet=Image.new('RGB',(1480,1800),'white')
        for j,im in enumerate(images[start:start+4]):sheet.paste(im,((j%2)*740,(j//2)*900))
        p=OUT/f'previsualizaciones/contacto-{start//4+1:02d}.png';p.parent.mkdir(exist_ok=True);sheet.save(p)
    print(json.dumps({'figures':len(inv),'adapted':len(images),'errors':errors,'external_checked':len(b['outside'])},ensure_ascii=False))
    if errors:raise SystemExit(1)
if __name__=='__main__': main()
