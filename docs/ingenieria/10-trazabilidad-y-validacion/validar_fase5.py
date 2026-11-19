"""Validación estática/documental. Sin Django, pruebas funcionales ni PostgreSQL."""
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

sys.dont_write_bytecode=True
BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]
sys.path.insert(0,str(BASE/'05-procesos-y-estados'))
from construir_fase5 import validate_sources, location, VIEWS, PROCESSES, CASES


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    errors=[]
    validate_sources() # AST, símbolos, pruebas existentes y fragmentos de 79 escritores
    registry=json.loads((BASE/'diagramas/registro-fase-5.json').read_text(encoding='utf-8'))
    snapshot=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-5.json').read_text(encoding='utf-8'))
    if len(registry)!=49 or len(PROCESSES)!=21:errors.append('Conteo inesperado')
    ids=[v['id'] for v in registry]
    if len(set(ids))!=len(ids):errors.append('IDs repetidos')
    kinds=Counter(v['type'] for v in registry)
    if kinds!={'Actividades':24,'Secuencia':11,'Estados':14}:errors.append('Familias divergentes')
    curated={v['id']:v for v in VIEWS}
    transitions=[]
    for v in registry:
        current=curated[v['id']]
        for field in ('title','type','process','body','references','evidence','cases','context_cases','coverage','coverage_limit','rules','entities','tests','components','limitations','version','transitions'):
            if v[field]!=current[field]:errors.append('Registro divergente: '+v['id']+'/'+field)
        source=BASE/v['source'];text=source.read_text(encoding='utf-8')
        if v['body'] not in text:errors.append('Fuente divergente del modelo curado: '+v['id'])
        if not text.startswith('@startuml\n') or not text.endswith('@enduml\n'):errors.append('Delimitación UML: '+v['id'])
        fiche=(BASE/v['description']).read_text(encoding='utf-8')
        for field in ('Objetivo:','Alcance:','Tipo UML:','Casos relacionados:','Reglas observadas:','Componentes:','Entidades relacionadas:','Versión documentada:','## Evidencia verificable','## Pruebas relacionadas','## Interpretación y limitaciones'):
            if field not in fiche:errors.append('Ficha incompleta: '+v['id']+'/'+field)
        for r in v['evidence']:
            if sha(ROOT/r['path'])!=r['sha256']:errors.append('Fuente productiva divergente: '+r['path'])
        for t in v['transitions']:
            transitions.append(t['id'])
            if any(not t.get(f) for f in ('origin','event','guard','action','target','reference','proof')):errors.append('Transición incompleta: '+t['id'])
            if t['id'].split('/')[-1] not in fiche:errors.append('Transición sin contrato: '+t['id'])
        if v.get('stage_codes'):
            tree=ast.parse((ROOT/v['policy_source']).read_text(encoding='utf-8-sig'))
            stages=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='STAGE_DATA' for t in n.targets))
            if [s[0] for s in stages]!=v['stage_codes']:errors.append('Etapas inventadas o desordenadas: '+v['id'])
    if len(transitions)!=79 or len(set(transitions))!=79:errors.append('Transiciones no únicas o conteo divergente')
    matrix=(BASE/'10-trazabilidad-y-validacion/matriz-fase-5.md').read_text(encoding='utf-8')
    rows=re.findall(r'^\| \[(UC-[A-Z]+-\d{3})\]',matrix,re.M)
    if Counter(rows)!=Counter(c['id'] for c in CASES):errors.append('Cobertura de los 75 UC divergente')
    for c in CASES:
        row=next((s for s in matrix.splitlines() if s.startswith('| ['+c['id']+']')), '')
        if c['rule_id'] not in row or not all(e in row for e in c['entity_ids']):errors.append('Trazabilidad incompleta: '+c['id'])
        if c['test'] not in row:errors.append('Prueba relacionada ausente: '+c['id'])
    all_registry=[]
    for phase in (3,4,5):all_registry+=json.loads((BASE/f'diagramas/registro-fase-{phase}.json').read_text(encoding='utf-8'))
    if len({v['id'] for v in all_registry})!=len(all_registry):errors.append('Colisión de fases')
    all_sources={p.relative_to(BASE).as_posix() for p in (BASE/'diagramas/fuentes').rglob('*.puml')}
    if all_sources!={v['source'] for v in all_registry}:errors.append('Fuentes huérfanas o faltantes')
    for key,root in [('sha256_fuera_documentacion',ROOT),('diagramas_previos',BASE)]:
        for path,digest in snapshot[key].items():
            p=root/path
            if not historical_matches(p,digest):errors.append('Integridad: '+path)
    status=subprocess.check_output(['git','-c','core.quotePath=false','status','--short','--untracked-files=all'],cwd=ROOT).decode('utf-8').splitlines()
    outside=lambda rows:{s for s in rows if not s[3:].startswith('docs/ingenieria/')}
    git_same=outside(status)==outside(snapshot['status'])
    if not git_same:errors.append('Estado Git exterior alterado')
    for args,key in [(['rev-parse','HEAD'],'head'),(['branch','--show-current'],'rama')]:
        if subprocess.check_output(['git']+args,cwd=ROOT,text=True).strip()!=snapshot[key]:errors.append('Referencia Git cambió: '+key)
    logs=BASE/'10-trazabilidad-y-validacion/logs-renderizado-fase-5'
    render=json.loads((logs/'resultado.json').read_text(encoding='utf-8'))
    if render['sintaxis_retorno']!=0 or render.get('renderizado_retorno')!=0:errors.append('PlantUML/renderizado falló')
    if render['style_sha256']!=sha(BASE/'diagramas/estilos/base.puml.inc'):errors.append('Estilo alterado')
    svg_byid={v['id']:v for v in render['archivos']}
    if set(svg_byid)!=set(ids):errors.append('Cobertura SVG divergente')
    for v in registry:
        r=svg_byid.get(v['id'],{})
        p=BASE/v['svg']
        if not p.is_file() or sha(p)!=r.get('sha256'):errors.append('SVG divergente: '+v['id']);continue
        if sha(BASE/v['source'])!=r.get('source_sha256'):errors.append('Fuente posterior al render: '+v['id'])
        if not ET.parse(p).getroot().tag.endswith('svg') or r.get('error'):errors.append('SVG inválido: '+v['id'])
    geometry=json.loads((logs/'geometria-svg.json').read_text(encoding='utf-8'))
    outside_count=sum(len(g['textos_fuera_viewbox']) for g in geometry)
    overlap_count=sum(len(g['posibles_solapamientos']) for g in geometry)
    if outside_count or overlap_count:errors.append('Avisos geométricos pendientes de revisión')
    gallery=(BASE/'diagramas/renderizados/index.html').read_text(encoding='utf-8')
    targets=re.findall(r'(?:href|src)="([^"]+)"',gallery)
    if gallery.count('<article>')!=len(all_registry):errors.append('Galería incompleta')
    for t in targets:
        p=(BASE/'diagramas/renderizados'/t).resolve()
        if not p.is_relative_to(BASE) or not p.is_file():errors.append('Galería: '+t)
    result=dict(procesos=len(PROCESSES),casos_inventariados=len(rows),casos_con_recorrido_directo_selectivo=len({u for v in registry for u in v["cases"]}),nivel_cobertura='Familias y recorridos selectivos; no todos los payloads/variantes',diagramas=len(registry),tipos=kinds,transiciones=len(transitions),modalidades_con_etapas_contrastadas=sum(bool(v.get('stage_codes')) for v in registry),fuentes_totales=len(all_sources),artefactos_previos_controlados=len(snapshot['diagramas_previos']),artefactos_previos_sin_cambio=sum(sha(BASE/p)==h for p,h in snapshot['diagramas_previos'].items()),correcciones_documentales_autorizadas=sum(sha(BASE/p)!=h for p,h in snapshot['diagramas_previos'].items()),huellas_exteriores=len(snapshot['sha256_fuera_documentacion']),git_exterior_conservado=git_same,sintaxis_plantuml=render['sintaxis_retorno'],svg_renderizado=render['renderizado_retorno'],avisos_geometricos=outside_count+overlap_count,enlaces_galeria=len(targets),pruebas_funcionales_ejecutadas=0,errores=errors)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return bool(errors)


if __name__=='__main__':raise SystemExit(main())
