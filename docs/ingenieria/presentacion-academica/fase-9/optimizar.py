"""Adaptación editorial reproducible. Escrituras limitadas al directorio académico."""
from pathlib import Path
import hashlib, json, re, subprocess, sys, textwrap, os
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[4]
ACA = ROOT / 'docs/ingenieria/presentacion-academica'
OUT = ACA / 'fase-9'
ENG = ROOT / 'docs/ingenieria'
IDS = 'SYS-001 POS-041 DOC-040 POS-043 SYS-006 MOD-002 SYS-007 POS-001 POS-002 DOC-101 POS-105 SYS-003 POS-061 DOC-070 POS-073 POS-074 POS-081 DOC-080 POS-082 PG-070 TG-060 TD-060 EG-080 EA-080 DIP-080'.split()
KEEP = {'POS-041','POS-002','DOC-080','EG-080','EA-080','DIP-080'}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT).decode('utf-8').strip()
def write(p,t):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(t,encoding='utf-8')
def baseline():
    paths = subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode('utf-8').split('\0')
    files={p:sha(ROOT/p) for p in sorted(set(paths)) if p and not p.startswith('docs/ingenieria/presentacion-academica/') and (ROOT/p).is_file()}
    # Incluye herramientas ignoradas y originales, además del inventario Git.
    for p in (ENG/'diagramas').rglob('*'):
        if p.is_file() and p.suffix in ('.puml','.inc','.svg','.py','.jar','.exe'):
            files[p.relative_to(ROOT).as_posix()]=sha(p)
    return {'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'status':git('status','--porcelain=v1','--untracked-files=all'),'outside':files,'phase8':{p.name:sha(p) for p in ACA.glob('*.md')}}
def wrap(s,n=36):
    return r'\n'.join(textwrap.wrap(s,n,break_long_words=False,break_on_hyphens=False))
def adapt(src,number):
    sequence='Tipo UML: Secuencia' in src
    # Reajustar exclusivamente textos de acciones: las líneas y palabras se conservan.
    if 'Tipo UML: Actividades' in src or number==12:
        src=re.sub(r'(?m)^:([^;]+);',lambda m:':'+ '\n'.join('\n'.join(textwrap.wrap(s,46,break_long_words=False,break_on_hyphens=False)) for s in m[1].splitlines())+';',src)
    lines=src.splitlines(); result=[]; block=None
    for line in lines:
        if line.startswith('@startuml'):
            result.append(f'@startuml ACA-{number:02d}--DIA-{IDS[number-1]}'); continue
        if number==20 and line in ('else concluir','else reabrir'):
            part=2 if line=='else concluir' else 3
            result.append(f'newpage Figura 20 ({part}/3) — Continuación del mismo alt; leer las tres partes')
        if line.startswith('!include '):
            result.append('!include ../estilo-academico.puml.inc'); continue
        if line.startswith('skinparam maxMessageSize'):
            result.append('skinparam maxMessageSize 300'); result.append('hide footbox');continue
        if line.startswith('title '):
            suffix=' (1/3; leer el conjunto)' if number==20 else ''
            result.append(f'title Figura {number:02d}{suffix} — '+line[6:]); continue
        if line.startswith('footer '):
            result.append('footer Referencia técnica: '+line[7:]); continue
        if line.startswith("'") or line.startswith('@'):
            result.append(line); continue
        # Únicamente saltos de línea dentro de textos, sin cambiar alias ni relaciones.
        if re.match(r'\s*(actor|participant|collections|database|component|folder|package|rectangle|node)\s+"',line):
            line=re.sub(r'"([^"\n]+)"',lambda m:'"'+r'\n'.join(wrap(part,28) for part in m[1].split(r'\n'))+'"',line)
        if re.match(r'\s*(participant|actor|collections|database)\s+[A-Za-z_][\w.]*\s+as\s+',line):
            # Nombre de participante sin comillas: convertir a etiqueta multilínea.
            m=re.match(r'(\s*\w+\s+)(\S+)(\s+as\s+.*)',line)
            label=re.sub(r'(?<=[a-z])(?=[A-Z])',lambda _:r'\n',m[2])
            line=m[1]+'"'+label+'"'+m[3]
        if not sequence and re.search(r'(?:->|-->|\.\.|--|<\|)',line) and ' : ' in line:
            a,b=line.split(' : ',1)
            line=a+' : '+r'\n'.join(wrap(part,35) for part in b.split(r'\n'))
        if line.startswith('|') and line.endswith('|'):
            line='|'+wrap(line[1:-1],28)+'|'
        result.append(line)
    # Cada copia incluye su linaje; la evidencia y limitaciones originales se conservan.
    result.insert(1,f"' Adaptación académica ACA-{number:02d}; original DIA-{IDS[number-1]}; fase 9")
    return '\n'.join(result)+'\n'
def prepare():
    if (OUT/'estado-inicial.json').exists(): raise SystemExit('Ya existe el estado inicial; no se sobrescribe.')
    b=baseline();write(OUT/'estado-inicial.json',json.dumps(b,ensure_ascii=False,indent=2))
    entries=[]
    for phase in (3,4,5): entries+=json.loads((ENG/f'diagramas/registro-fase-{phase}.json').read_text(encoding='utf-8'))
    byid={e['id']:e for e in entries}
    write(OUT/'estilo-academico.puml.inc','''skinparam backgroundColor white
skinparam defaultFontName SansSerif
skinparam defaultFontSize 16
skinparam titleFontSize 18
skinparam noteFontSize 14
skinparam ArrowFontSize 14
skinparam footerFontSize 10
skinparam legendFontSize 12
skinparam shadowing false
skinparam classAttributeIconSize 0
skinparam ArrowColor #334155
skinparam FontColor #172033
skinparam classBackgroundColor #F1F5F9
skinparam classBackgroundColor<<referencia>> #F8FAFC
skinparam classBackgroundColor<<politica>> #EEF4F1
skinparam componentBackgroundColor #F1F5F9
skinparam packageStyle rectangle
skinparam nodesep 35
skinparam ranksep 45
skinparam padding 6
skinparam sequenceParticipantPadding 10
skinparam sequenceMessageAlign left
''')
    manifest=[]
    for i,id in enumerate(IDS,1):
        e=byid['DIA-'+id]; source=ENG/e['source']; svg=ENG/e.get('svg',f'diagramas/renderizados/{source.stem}.svg')
        item={'figure':i,'academic_id':f'ACA-{i:02d}','original':e['id'],'title':e['title'],'type':e['type'],'source':source.relative_to(ROOT).as_posix(),'svg_original':svg.relative_to(ROOT).as_posix(),'source_sha256':sha(source),'svg_sha256':sha(svg),'status':'SIN CAMBIOS' if id in KEEP else 'ADAPTADA','split':False}
        if id not in KEEP:
            p=OUT/f'fuentes/ACA-{i:02d}--DIA-{id}.puml';write(p,adapt(source.read_text(encoding='utf-8'),i))
            item['academic_source']=p.relative_to(ROOT).as_posix(); item['academic_svg']=(OUT/f'svg/{p.stem}.svg').relative_to(ROOT).as_posix()
        manifest.append(item)
    write(OUT/'inventario.json',json.dumps(manifest,ensure_ascii=False,indent=2))
def render(originals=False):
    tool=ENG/'diagramas/herramientas'; java=tool/'jdk-21.0.13+9-jre/bin/java.exe';jar=tool/'plantuml-1.2026.9.jar'
    for d in ('tmp','user-home','prefs','logs','svg','png'): (OUT/d).mkdir(parents=True,exist_ok=True)
    cmd=[str(java),'-Djava.awt.headless=true',f'-Djava.io.tmpdir={OUT / "tmp"}',f'-Duser.home={OUT / "user-home"}',f'-Djava.util.prefs.userRoot={OUT / "prefs"}','-Dplantuml.security.profile=ALLOWLIST',f'-Dplantuml.allowlist.path={ENG}','-jar',str(jar)]
    env=os.environ.copy();env['PLANTUML_LIMIT_SIZE']='16384'
    sources=sorted(str(p) for p in (OUT/'fuentes').glob('*.puml'))
    jobs=[('version',['-version']),('syntax',['--check-syntax','-charset','UTF-8',*sources]),('svg',['--svg','--no-error-image','-charset','UTF-8','--output-dir',str(OUT/'svg'),*sources]),('png',['--png','--no-error-image','-charset','UTF-8','--output-dir',str(OUT/'png'),*sources])]
    if originals:
        inv=json.loads((OUT/'inventario.json').read_text(encoding='utf-8'))
        sources=[str(ROOT/i['source']) for i in inv if i['status']=='SIN CAMBIOS']
        target=OUT/'originales-revisados';target.mkdir(exist_ok=True)
        jobs=[('originales-png',['--png','--no-error-image','-charset','UTF-8','--output-dir',str(target),*sources])]
    for name,args in jobs:
        p=subprocess.run(cmd+args,cwd=OUT,env=env,capture_output=True)
        write(OUT/f'logs/{name}.txt',p.stdout.decode('utf-8',errors='replace')+p.stderr.decode('utf-8',errors='replace'))
        print(name,p.returncode,flush=True)
        if p.returncode: raise SystemExit(p.returncode)
def refresh():
    for item in json.loads((OUT/'inventario.json').read_text(encoding='utf-8')):
        if item.get('academic_source'):
            write(ROOT/item['academic_source'],adapt((ROOT/item['source']).read_text(encoding='utf-8'),item['figure']))
if __name__=='__main__':
    {'preparar':prepare,'actualizar':refresh,'renderizar':render,'originales':lambda:render(True)}[sys.argv[1]]()
