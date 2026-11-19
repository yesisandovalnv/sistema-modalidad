"""Generador documental de fase 5. Solo escribe bajo docs/ingenieria.

Nunca ejecutar los constructores anteriores para actualizar esta fase.
No importa Django, modelos ni políticas del producto.
"""
import ast
from collections import Counter
from functools import cache
import hashlib
import html
import json
import os
from pathlib import Path
import re
import sys
import textwrap

sys.dont_write_bytecode=True
from datos_fase5 import BASE, CASES, BY_ID, PROCESSES, VIEWS
import secuencias_fase5
import estados_fase5
import modalidades_fase5

ROOT=BASE.parents[1]
SNAP=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-5.json').read_text(encoding='utf-8'))
VERSION=SNAP['head']+' / '+SNAP['rama']+' / directorio de trabajo 2026-11-02'
PROCESS={p['id']:p for p in PROCESSES}


def write(name,text):
    p=(BASE/name).resolve()
    assert p.is_relative_to(BASE)
    p.parent.mkdir(parents=True,exist_ok=True)
    if p.suffix=='.md': text=re.sub(r'`([^`]+)`',lambda m:'`'+m[1].replace('|','&#124;')+'`',text)
    p.write_text(text.rstrip()+'\n',encoding='utf-8')


def link(doc,target,label):
    return '['+label+']('+os.path.relpath(target,(BASE/doc).parent).replace('\\','/')+')'


@cache
def location(ref):
    path,_,symbol=ref.partition(':')
    p=ROOT/path
    assert p.is_file(),ref
    text=p.read_text(encoding='utf-8-sig')
    line=1
    node=None
    if symbol:
        nodes=ast.parse(text).body
        for name in symbol.split('.'):
            found=None
            for n in nodes:
                if isinstance(n,(ast.ClassDef,ast.FunctionDef,ast.AsyncFunctionDef)) and n.name==name: found=n;break
                if isinstance(n,(ast.Assign,ast.AnnAssign)):
                    targets=n.targets if isinstance(n,ast.Assign) else [n.target]
                    if any(isinstance(t,ast.Name) and t.id==name for t in targets):found=n;break
            assert found is not None,ref
            node=found;line=found.lineno;nodes=getattr(found,'body',[])
    return dict(path=path,symbol=symbol,line=line,end_line=getattr(node,'end_lineno',len(text.splitlines())),sha256=hashlib.sha256(p.read_bytes()).hexdigest()),text,node


def evidence(doc,ref):
    item,_,_=location(ref)
    return link(doc,ROOT/item['path'],(item['symbol'] or item['path'])+' (L'+str(item['line'])+')')


def validate_sources():
    assert len(PROCESSES)==21 and len({p['id'] for p in PROCESSES})==21
    assert Counter(u for p in PROCESSES for u in p['cases'])==Counter(c['id'] for c in CASES)
    assert len({v['id'] for v in VIEWS})==len(VIEWS)
    prior=[]
    for phase in (3,4): prior+=json.loads((BASE/f'diagramas/registro-fase-{phase}.json').read_text(encoding='utf-8'))
    assert not {d['id'] for d in VIEWS}&{d['id'] for d in prior}
    for v in VIEWS:
        if v['type']=='Secuencia':
            def wrap_label(match):
                lines=[]
                for line in match[2].split('\\n'):
                    lines+=textwrap.wrap(line,30,break_long_words=False,break_on_hyphens=False)
                return match[1]+'"'+'\\n'.join(lines)+'"'
            v['body']=re.sub(r'(?m)^((?:participant|database|collections|actor)\s+)"([^"]+)"',wrap_label,v['body'])
        p=PROCESS[v['process']]
        cases=[BY_ID[u] for u in p['cases']]
        refs=set(v['refs'])|{ref for c in cases for ref in (c['handler'],c['service'])}|{t['reference'] for t in v['transitions']}
        v['evidence']=[location(r)[0] for r in sorted(refs)]
        v['references']=sorted(refs)
        for t in v['transitions']:
            _,text,node=location(t['reference'])
            excerpt=ast.get_source_segment(text,node) if node is not None else text
            normalize=lambda s: re.sub(r'\s+','',s)
            assert normalize(t['proof']) in normalize(excerpt),t
        from cobertura_fase7 import classify
        classify(v,p)
        v['rules']=sorted({c['rule_id'] for c in cases})
        v['entities']=sorted({e for c in cases for e in c['entity_ids']})
        v['tests']=sorted({c['test'] for c in cases})
        assert all((ROOT/t).is_file() for t in v['tests'])
        scope=p['id'].split('-')[1]
        component={'SYS':'USR','PG':'MOD','TG':'MOD','TD':'MOD','EG':'MOD','EA':'MOD','DIP':'MOD'}.get(scope,scope)
        v['components']=sorted({'CMP-'+component+'-001','CMP-CORE-001'}|({'CMP-WEB-001'} if v['type']=='Secuencia' and any(r.startswith('src/') for r in refs) else set()))
        v['version']=VERSION
        v['goal']='Documentar el comportamiento implementado de '+v['title'].lower()+', con decisiones, guardas y límites de evidencia.'
        v['scope']=p['title']+'; '+p['variant']


def sources_and_fiches():
    kindfolders={'Actividades':'actividades','Secuencia':'secuencias','Estados':'estados'}
    for v in VIEWS:
        folder=kindfolders[v['type']]
        v['source']=f'diagramas/fuentes/fase-5/{folder}/{v["id"]}.puml'
        v['description']=f'diagramas/fichas/fase-5/{v["id"]}.md'
        v['svg']=f'diagramas/renderizados/fase-5/{v["id"]}.svg'
        header=['@startuml',"' ID: "+v['id'],"' Nombre: "+v['title'],"' Tipo UML: "+v['type'],"' Objetivo: "+v['goal'],"' Alcance: "+v['scope'],"' UC: "+', '.join(v['context_cases']),"' RN: "+', '.join(v['rules']),"' Componentes: "+', '.join(v['components']),"' Entidades: "+', '.join(v['entities']),"' Version: "+VERSION,"' Limitaciones: "+v['limitations']]
        header += ["' Evidencia: "+r for r in v['references']]
        header += ["' Prueba relacionada, no ejecutada: "+r for r in v['tests']]
        header += ['!include ../../../estilos/base.puml.inc','skinparam maxMessageSize 240','skinparam stateBackgroundColor #EFF6FF','skinparam activityBackgroundColor #EFF6FF',f'title {v["id"]} — {v["title"]}']
        if v['type']=='Actividades' and v['id']!='DIA-SYS-003':header.append('!pragma useVerticalIf on')
        footer=['footer '+SNAP['head'][:12]+' / desarrollo / trabajo local / 2026-11-02','@enduml']
        write(v['source'],'\n'.join(header+[v['body']]+footer))
        doc=v['description']
        text=f'''# {v['id']} — {v['title']}

- Identificador: {v['id']}.
- Tipo UML: {v['type']}.
- Objetivo: {v['goal']}
- Alcance: {v['scope']}
- Proceso: {v['process']}.
- Casos relacionados: {', '.join(v['context_cases'])} (contexto de familia; no acredita cobertura directa).
- Recorridos directos: {', '.join(v['cases']) or 'ninguno confirmado para los objetivos de esta familia'}.
- Reglas observadas: {', '.join(v['rules'])}.
- Componentes: {', '.join(v['components'])}.
- Entidades relacionadas: {', '.join(v['entities'])}.
- Versión documentada: {VERSION}.
- Clasificación: IMPLEMENTADO según análisis estático; recorrido selectivo, no prueba de ejecución.

{link(doc,BASE/v['source'],'Fuente PlantUML')} · {link(doc,BASE/v['svg'],'SVG')} · {link(doc,BASE/'10-trazabilidad-y-validacion/matriz-fase-5.md','Trazabilidad')}.

## Interpretación y limitaciones

{v['limitations']}

La cabecera UC de la fuente PlantUML conserva las referencias de familia históricas. La clasificación vigente por objetivo es la de la matriz dinámica y el campo `coverage` del registro JSON. RN, entidades, evidencia y pruebas de familia son contexto; su presencia no demuestra ejecución individual. {v['coverage_limit']}

Los permisos del backend y las guardas de cada ruta prevalecen sobre botones o cargos académicos. Un nombre de acción resume una operación y no acredita SQL literal ni infraestructura instalada. Las vistas de coordinación entre solicitudes no representan una única transacción del sistema.

## Evidencia verificable

'''
        for ref in v['references']:text+='- '+evidence(doc,ref)+'.\n'
        if v.get('stage_codes'):
            text+='\n## Particularidades académicas\n\n'+v['particularities']+'\n\nOrden nominal de STAGE_DATA, no lista de filas instaladas:\n\n'
            text+='\n'.join(f'{i}. `{code}`.' for i,code in enumerate(v['stage_codes'],1))+'\n'
        if v['transitions']:
            text+='\n## Contrato de transiciones\n\nOrigen y destino se refieren a la dimensión de esta vista. `[*]` indica creación, no un estado persistido. Cada Txx del dibujo se desarrolla aquí; las guardas completas incluyen las validaciones del método citado.\n\n| T | Origen | Evento | Guarda | Acción | Destino | Restricción y evidencia |\n| --- | --- | --- | --- | --- | --- | --- |\n'
            for t in v['transitions']:
                text+=f"| {t['id'].split('/')[-1]} | {t['origin']} | {t['event']} | {t['guard']} | {t['action']} | {t['target']} | No ejecutar si falla la guarda; {evidence(doc,t['reference'])} |\n"
        text+='\n## Pruebas relacionadas\n\nReferencias existentes por afinidad; no acreditan cobertura por escenario ni resultados actuales. No se ejecutaron pruebas funcionales del producto.\n\n'
        text+='\n'.join('- '+link(doc,ROOT/t,t)+'.' for t in v['tests'])+'\n'
        write(doc,text)
    write('diagramas/registro-fase-5.json',json.dumps(VIEWS,ensure_ascii=False,indent=2))
    write('05-procesos-y-estados/registro-procesos-fase-5.json',json.dumps(PROCESSES,ensure_ascii=False,indent=2))


def matrices_and_indexes():
    count=Counter(v['type'] for v in VIEWS)
    doc='diagramas/registro-fase-5.md'
    text=f'# Registro de modelos dinámicos — fase 5\n\n{len(VIEWS)} vistas nuevas: {count["Actividades"]} actividades, {count["Secuencia"]} secuencias y {count["Estados"]} estados. No se modifican los 69 diagramas previos. Las guardas completas de estados están en sus fichas.\n\n| ID | Nombre | Tipo | Fuente | Ficha | SVG |\n| --- | --- | --- | --- | --- | --- |\n'
    for v in VIEWS:text+=f"| {v['id']} | {v['title']} | {v['type']} | {link(doc,BASE/v['source'],'PlantUML')} | {link(doc,BASE/v['description'],'Ficha')} | {link(doc,BASE/v['svg'],'SVG')} |\n"
    write(doc,text)
    doc='10-trazabilidad-y-validacion/matriz-fase-5.md'
    text='# Cobertura dinámica de procesos y casos de uso\n\n75 UC conservados. Cobertura por familia y recorrido selectivo: no se afirma un diagrama exhaustivo por cada variante CRUD. Las fichas de fase 4 siguen detallando endpoints, permisos y alternativas. Las RN existentes se reutilizan sin renumeración. Las guardas dinámicas adicionales se describen en contratos Txx y evidencia, no como requisitos académicos nuevos.\n\n| UC | Proceso | RN observada | Vistas de familia | Endpoint y servicio | Entidades | Pruebas relacionadas | Nivel |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n'
    for c in CASES:
        p=next(p for p in PROCESSES if c['id'] in p['cases'])
        views=[v for v in VIEWS if v['process']==p['id']]
        assert views
        classified='; '.join(link(doc,BASE/v['description'],v['id'])+' — '+v['coverage'][c['id']] for v in views)
        level='DIRECTA selectiva' if any(v['coverage'][c['id']]=='DIRECTA' for v in views) else 'PENDIENTE DE VERIFICACIÓN' if any(v['coverage'][c['id']]=='PENDIENTE DE VERIFICACIÓN' for v in views) else 'Sin recorrido directo; contexto / no representado'
        text+=f"| {link(doc,BASE/c['specification'],c['id'])} | {p['id']} | {c['rule_id']} | {classified} | `{c['endpoint']}`; {evidence(doc,c['handler'])}; {evidence(doc,c['service'])} | {', '.join(c['entity_ids'])} | {link(doc,ROOT/c['test'],'Archivo existente; no ejecutado')} | {level} |\n"
    legend='\n## Significado de la clasificación\n\n- DIRECTA: el dibujo representa un recorrido selectivo del objetivo; no todas sus variantes ni su ejecución.\n- REFERENCIA CONTEXTUAL: comparte familia, evidencia o entidad; no demuestra ese recorrido.\n- NO REPRESENTADO: se comprobó que ese objetivo no aparece en la vista indicada.\n- PENDIENTE DE VERIFICACIÓN: no hay contraste semántico suficiente para atribuir recorrido directo.\n\nLas 75 filas garantizan inventario y trazabilidad de objetivos, no 75 objetivos con cobertura dinámica directa. La clasificación editable está en `05-procesos-y-estados/cobertura_fase7.py`. Las cabeceras UC/RN y las pruebas de afinidad históricas se interpretan como contexto; no acreditan escenarios individuales.\n'
    write(doc,text+legend)
    doc='09-modalidades/cobertura-fase-5.md'
    text='# Cobertura dinámica por modalidad\n\nInfraestructura común y reglas académicas separadas. Las seis políticas operan sobre etapas persistidas cuya configuración instalada no se consulta. El recorrido nominal no obliga al backend a ejecutar todas las etapas en una sola llamada.\n\n| Modalidad | Vistas propias | Particularidad y límite |\n| --- | --- | --- |\n'
    for scope in ['PG','TG','TD','EG','EA','DIP']:
        views=[v for v in VIEWS if v['process']=='PROC-'+scope+'-001']
        act=next(v for v in views if v.get('stage_codes'))
        text+=f"| {PROCESS['PROC-'+scope+'-001']['title']} | {'; '.join(link(doc,BASE/v['description'],v['id']) for v in views)} | {act['particularities']} |\n"
    text+='\n## Dependencias y variantes\n\nTrabajo Dirigido importa comportamiento base de Proyecto en sus políticas de eventos/evaluación/revisión previa; la importación no demuestra equivalencia de reglas. Proyecto conserva regímenes PG_LEGACY/PG_HITOS_V1 y semánticas de notas históricas; Tesis mantiene sus propias entradas y consolidación. No se alteran esas dependencias ni se normalizan escalas en esta fase.\n\n[Procesos comunes y cobertura de los 75 UC](../10-trazabilidad-y-validacion/matriz-fase-5.md). Las modalidades reutilizan los servicios comunes solo donde sus políticas los habilitan; no se considera que cada operación del motor aplique a todas por defecto.\n'
    write(doc,text)
    folders={'PG':'proyecto-grado','TG':'tesis-grado','TD':'trabajo-dirigido','EG':'examen-grado','EA':'excelencia-academica','DIP':'diplomado'}
    for scope,folder in folders.items():
        own=[v for v in VIEWS if v['process']=='PROC-'+scope+'-001']
        act=next(v for v in own if v.get('stage_codes'))
        package=f'09-modalidades/{folder}/dinamica-fase-5.md'
        body='# Paquete dinámico: '+PROCESS['PROC-'+scope+'-001']['title']+'\n\n'+act['particularities']+'\n\n## Vistas propias\n\n'
        body+='\n'.join('- '+link(package,BASE/v['description'],v['id']+' — '+v['title'])+'.' for v in own)
        body+='\n\n## Infraestructura y trazabilidad compartidas\n\n'
        body+='- '+link(package,BASE/'05-procesos-y-estados/README-fase-5.md','Inventario y vistas del motor común')+'.\n'
        body+='- '+link(package,BASE/'10-trazabilidad-y-validacion/matriz-fase-5.md','Casos, reglas, servicios, entidades y pruebas')+'.\n'
        body+='- '+link(package,BASE/'00-alcance-y-evidencia/referencia-fase-5.md','Referencia Git y variante local')+'.\n'
        body+='\nReutilizar una vista común no convierte las reglas de esta modalidad en reglas universales. El orden nominal y las guardas propias se detallan en su ficha; no se acreditan datos instalados ni ejecución de pruebas. Esta fase no altera la política académica.\n'
        write(package,body)
        index=f'09-modalidades/{folder}/README.md'
        old=(BASE/index).read_text(encoding='utf-8')
        if '## Paquete dinámico de fase 5' not in old:
            write(index,old+'\n## Paquete dinámico de fase 5\n\n[Modelado dinámico propio y vínculos al motor común](dinamica-fase-5.md). Se conserva la separación de reglas académicas y variantes de esta modalidad.\n')
    write('05-procesos-y-estados/README-fase-5.md',f'''# Modelado dinámico — fase 5

{len(PROCESSES)} familias de procesos; {len(VIEWS)} vistas dinámicas ({count['Actividades']} actividades, {count['Secuencia']} secuencias y {count['Estados']} estados). 75 UC vinculados a su proceso, reglas, implementación, entidades y pruebas existentes. Las vistas son selectivas y modulares.

- [Análisis previo e inventario](analisis-fase-5.md).
- [Registro de fuentes, fichas y SVG](../diagramas/registro-fase-5.md).
- [Matriz dinámica UC → proceso → RN → vistas → implementación → entidad → pruebas](../10-trazabilidad-y-validacion/matriz-fase-5.md).
- [Paquetes de las seis modalidades](../09-modalidades/cobertura-fase-5.md).
- [Versión y diferencias](../00-alcance-y-evidencia/referencia-fase-5.md).
- [Validación, discrepancias y recomendaciones](../10-trazabilidad-y-validacion/validacion-fase-5.md).

No se crea una máquina de estados genérica de EvaluacionDefensa: tiene tipos/resultados, no un campo de lifecycle con transiciones universales. Sí se representan resultados/estados persistidos de ExamenArea, ExcelenciaExpediente y DiplomadoModulo con sus escritores reales. VersionDocumento se limita a su indicador de actualidad.
''')


def gallery_and_master():
    allviews=[]
    for phase in (3,4,5):allviews+=json.loads((BASE/f'diagramas/registro-fase-{phase}.json').read_text(encoding='utf-8'))
    cards=[]
    for d in allviews:
        svg=d.get('svg','diagramas/renderizados/'+Path(d['source']).stem+'.svg')
        rel=lambda p:os.path.relpath(BASE/p,BASE/'diagramas/renderizados').replace('\\','/')
        title=html.escape(d['id']+' — '+d['title'])
        cards.append(f'<article><h2>{title}</h2><p>{html.escape(d["type"])}</p><a href="{rel(svg)}"><img loading="lazy" src="{rel(svg)}" alt="{title}"></a><p><a href="{rel(d["source"])}">PlantUML</a> · <a href="{rel(d["description"])}">Ficha</a> · <a href="{rel(svg)}">SVG</a></p></article>')
    n=len(allviews)
    write('diagramas/renderizados/index.html','<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Galería UML — fases 3, 4 y 5</title><style>body{font:16px system-ui;margin:2rem;color:#172554;background:#f8fafc}input{padding:.8rem;width:min(90%,50rem)}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:1rem}article{background:white;border:1px solid #cbd5e1;padding:1rem;min-width:0}img{width:100%;height:360px;object-fit:contain}h2{font-size:1rem}a{color:#1d4ed8}</style><h1>Galería UML — '+str(n)+' vistas</h1><p>Arquitectura, modelos, casos de uso y comportamiento dinámico. Abrir SVG para ampliar. Sin recursos externos.</p><label>Buscar <input id="q" type="search" placeholder="Identificador, título o tipo"></label><p id="count">'+str(n)+' vistas</p><main>'+''.join(cards)+'''</main><script>const q=document.querySelector('#q');q.addEventListener('input',()=>{let n=0;document.querySelectorAll('article').forEach(a=>{a.hidden=!a.textContent.toLowerCase().includes(q.value.toLowerCase());if(!a.hidden)n++});document.querySelector('#count').textContent=n+' vistas'});</script></html>''')
    p=BASE/'diagramas/README.md';text=p.read_text(encoding='utf-8')
    for id in ['DIA-SYS-003','DIA-SYS-004','DIA-SYS-005']:
        text=re.sub(r'^\| '+id+r' \|.*\n','',text,flags=re.M)
    if '## Modelado dinámico de fase 5' not in text:text+='\n## Modelado dinámico de fase 5\n\n[Registro de nuevas actividades, secuencias y estados](registro-fase-5.md). Consume las tres reservas generales de estas familias; fuentes y fichas de fases 3/4 permanecen intactas.\n'
    write('diagramas/README.md',text)
    p=BASE/'README.md';text=p.read_text(encoding='utf-8').replace('Fases 2, 3 y 4','Fases 2, 3, 4 y 5')
    if '## Entrega de fase 5' not in text:
        pos=text.index('## Entrega de fase 4')
        text=text[:pos]+'''## Entrega de fase 5

- [Inventario y modelado dinámico](05-procesos-y-estados/README-fase-5.md).
- [Fuentes, fichas y SVG dinámicos](diagramas/registro-fase-5.md).
- [Cobertura de los 75 casos de uso](10-trazabilidad-y-validacion/matriz-fase-5.md).
- [Particularidades de las seis modalidades](09-modalidades/cobertura-fase-5.md).
- [Git y estado analizado](00-alcance-y-evidencia/referencia-fase-5.md).
- [Validación y pendientes](10-trazabilidad-y-validacion/validacion-fase-5.md).

'''+text[pos:]
    write('README.md',text)


def main():
    validate_sources()
    sources_and_fiches()
    matrices_and_indexes()
    gallery_and_master()
    print(json.dumps(dict(procesos=len(PROCESSES),vistas=len(VIEWS),tipos=Counter(v['type'] for v in VIEWS),transiciones=sum(len(v['transitions']) for v in VIEWS)),ensure_ascii=False))


if __name__=='__main__':main()
