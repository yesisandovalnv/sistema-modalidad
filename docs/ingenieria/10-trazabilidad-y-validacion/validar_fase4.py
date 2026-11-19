"""Validación documental sin importar Django, ejecutar pruebas ni acceder a BD."""
import ast
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from integridad_fase7 import historical_matches

sys.dont_write_bytecode = True
BASE = Path(__file__).resolve().parents[1]
ROOT = BASE.parents[1]
sys.path.insert(0, str(BASE/'03-casos-de-uso'))
from construir_fase4 import validate_data, CASES, ACTORS


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    errors=[]
    validate_data()  # símbolos mediante AST, rutas de pruebas y entidades
    cases=json.loads((BASE/'03-casos-de-uso/registro-fase-4.json').read_text(encoding='utf-8'))
    diagrams=json.loads((BASE/'diagramas/registro-fase-4.json').read_text(encoding='utf-8'))
    previous=json.loads((BASE/'diagramas/registro-fase-3.json').read_text(encoding='utf-8'))
    snapshot=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-4.json').read_text(encoding='utf-8'))
    if cases!=CASES: errors.append('Datos curados y registro divergentes')
    if len(cases)!=75 or len(diagrams)!=17: errors.append('Conteos inesperados')
    permission_text=(BASE/'02-actores-permisos/matriz-fase-4.md').read_text(encoding='utf-8')
    permission_rows=re.findall(r'^\| (UC-[A-Z]+-\d{3}):',permission_text,re.M)
    if len(permission_rows)!=77: errors.append('Número de variantes de permiso divergente')
    actual_specs={p.relative_to(BASE).as_posix() for p in (BASE/'03-casos-de-uso/especificaciones').glob('UC-*.md')}
    if actual_specs!={c['specification'] for c in cases}: errors.append('Fichas huérfanas o faltantes')
    ids={c['id'] for c in cases}
    for field in ('id','rule_id','specification'):
        if len({c[field] for c in cases})!=len(cases): errors.append('Duplicado: '+field)
    required=['## Identidad y estado','## Descripción y disparador','## Precondiciones','## Flujo principal','## Flujos alternativos','## Excepciones','## Postcondiciones','## Reglas de negocio y permisos','## Evidencia y trazabilidad']
    for c in cases:
        text=(BASE/c['specification']).read_text(encoding='utf-8')
        if any(s not in text for s in required): errors.append('Ficha incompleta: '+c['id'])
        if not all(a in ACTORS for a in c['actors']): errors.append('Actor desconocido: '+c['id'])
        for table in ('10-trazabilidad-y-validacion/matriz-fase-4.md','02-actores-permisos/matriz-fase-4.md'):
            if c['id'] not in (BASE/table).read_text(encoding='utf-8'): errors.append('Caso sin matriz: '+c['id'])
        rows=(BASE/'10-trazabilidad-y-validacion/reglas-fase-4.md').read_text(encoding='utf-8')
        if rows.count('| '+c['rule_id']+' |')!=1: errors.append('Regla no única: '+c['id'])
    covered=set()
    for d in diagrams:
        text=(BASE/d['source']).read_text(encoding='utf-8')
        for field in ('id','title','goal','scope','sources','version','limitations','description','actors','cases'):
            if not d.get(field): errors.append('Metadato ausente: '+d['id']+'/'+field)
        if 'include>>' in text or 'extend>>' in text: errors.append('Relación no justificada: '+d['id'])
        for c in cases:
            if c['id'] not in d['cases']: continue
            covered.add(c['id'])
            for a in c['actors']:
                if a.replace('-','_')+' -- '+c['id'].replace('-','_') not in text:
                    errors.append('Asociación divergente: '+d['id']+'/'+c['id'])
        if not set(d['cases'])<=ids: errors.append('Caso de diagrama sin ficha: '+d['id'])
        for source in d['sources']:
            if not (ROOT/source).is_file(): errors.append('Referencia inexistente: '+source)
    if covered!=ids: errors.append('Cobertura funcional incompleta')
    all_sources={p.relative_to(BASE).as_posix() for p in (BASE/'diagramas/fuentes').rglob('*.puml')}
    later_path=BASE/'diagramas/registro-fase-5.json'
    later=json.loads(later_path.read_text(encoding='utf-8')) if later_path.is_file() else []
    if all_sources!={d['source'] for d in previous+diagrams+later}: errors.append('Fuentes huérfanas o faltantes')
    for field in ('fase3_protegida','sha256_fuera_documentacion'):
        for name,value in snapshot[field].items():
            # El snapshot usa rutas relativas a raíz para exteriores y a docs para F3.
            path=ROOT/name if field=='sha256_fuera_documentacion' else BASE/name
            if not historical_matches(path,value): errors.append('Integridad: '+name)
    git=subprocess.check_output(['git','-c','core.quotePath=false','status','--short','--untracked-files=all'],cwd=ROOT).decode('utf-8').splitlines()
    outside=lambda lines:{s for s in lines if not s[3:].startswith('docs/ingenieria/')}
    same_status=outside(git)==outside(snapshot['status'])
    if not same_status: errors.append('Git exterior cambió')
    head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    branch=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()
    if head!=snapshot['head'] or branch!=snapshot['rama']: errors.append('HEAD/rama cambió')
    logs=BASE/'10-trazabilidad-y-validacion/logs-renderizado-fase-4'
    render=json.loads((logs/'resultado.json').read_text(encoding='utf-8'))
    if render['sintaxis_retorno']!=0 or render.get('renderizado_retorno')!=0: errors.append('PlantUML/renderizado falló')
    if render['style_sha256']!=digest(BASE/'diagramas/estilos/base.puml.inc'): errors.append('Estilo divergente')
    by_id={r['id']:r for r in render['archivos']}
    if set(by_id)!={d['id'] for d in diagrams}: errors.append('Cobertura SVG divergente')
    for d in diagrams:
        r=by_id.get(d['id'],{})
        svg=BASE/d['svg']
        if not svg.is_file(): errors.append('SVG ausente: '+d['id']); continue
        if digest(svg)!=r.get('sha256') or digest(BASE/d['source'])!=r.get('source_sha256'): errors.append('Huellas de render divergentes: '+d['id'])
        root=ET.parse(svg).getroot()
        if not root.tag.endswith('svg') or r.get('error'): errors.append('SVG inválido: '+d['id'])
    geometry=json.loads((logs/'geometria-svg.json').read_text(encoding='utf-8'))
    for g in geometry:
        if g['textos_fuera_viewbox'] or g['posibles_solapamientos']: errors.append('Revisar geometría: '+g['id'])
    gallery=(BASE/'diagramas/renderizados/index.html').read_text(encoding='utf-8')
    targets=re.findall(r'(?:href|src)="([^"]+)"',gallery)
    for target in targets:
        if not (BASE/'diagramas/renderizados'/target).resolve().is_file(): errors.append('Galería, enlace inválido: '+target)
    if gallery.count('<article>')!=len(previous+diagrams+later): errors.append('Galería incompleta')
    result=dict(casos=len(cases),actores=len(ACTORS),reglas_nuevas=len({c['rule_id'] for c in cases}),diagramas_nuevos=len(diagrams),fuentes_totales=len(all_sources),especificaciones=len(cases),resumenes_matriz_permisos=len(cases)+2,variantes_http_detalladas=sum(line.startswith("| GET |") or line.startswith("| POST |") for line in permission_text.splitlines()),simbolos_referenciados=len(cases)*2,archivos_pruebas_relacionados=len({c['test'] for c in cases}),pruebas_producto_ejecutadas=0,huellas_fase3=len(snapshot['fase3_protegida']),huellas_exteriores=len(snapshot['sha256_fuera_documentacion']),git_exterior_conservado=same_status,galeria_enlaces=len(targets),sintaxis_plantuml=render['sintaxis_retorno'],svg_renderizado=render['renderizado_retorno'],errores=errors)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return bool(errors)


if __name__=='__main__': raise SystemExit(main())
