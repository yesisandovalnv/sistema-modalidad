"""Individualización documental y vínculos curados; no importa el producto."""
import ast
from collections import Counter
from functools import cache
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
sys.dont_write_bytecode=True
from curacion_fase71 import ROWS,REJECTED

BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]
REGISTRY=BASE/'10-trazabilidad-y-validacion/escenarios-fase-7-1.json'
STATUSES=['VERIFICADO DOCUMENTALMENTE','COBERTURA PARCIAL','SIN PRUEBA IDENTIFICADA','NO VERIFICABLE']

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(path,text):
    p=(BASE/path).resolve();assert p.is_relative_to(BASE)
    content=text.rstrip()+'\n'
    if not p.exists() or p.read_text(encoding='utf-8')!=content:
        p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,encoding='utf-8')

@cache
def locate(ref):
    path,_,symbol=ref.partition(':');p=ROOT/path
    text=p.read_text(encoding='utf-8-sig');node=ast.parse(text)
    for part in symbol.split('.') if symbol else []:
        found=None
        for n in getattr(node,'body',[]):
            if isinstance(n,(ast.ClassDef,ast.FunctionDef,ast.AsyncFunctionDef)) and n.name==part:found=n;break
            if isinstance(n,(ast.Assign,ast.AnnAssign)):
                targets=n.targets if isinstance(n,ast.Assign) else [n.target]
                if any(isinstance(t,ast.Name) and t.id==part for t in targets):found=n;break
        assert found is not None,ref
        node=found
    return {'reference':ref,'path':path,'symbol':symbol,'line':getattr(node,'lineno',1),
            'end_line':getattr(node,'end_lineno',len(text.splitlines())),'sha256':sha(p)},node,text

def assertion(test,expression):
    location,node,text=locate(test)
    wanted=ast.dump(ast.parse(expression,mode='eval').body,include_attributes=False)
    calls=sorted((n for n in ast.walk(node) if isinstance(n,ast.Call)),key=lambda n:(n.lineno,n.col_offset))
    matches=[n for n in calls if ast.dump(n,include_attributes=False)==wanted]
    assert matches,(test,expression)
    call=matches[0]
    return dict(location,line=call.lineno,end_line=call.end_lineno,
                assertion=ast.get_source_segment(text,call),normalized=ast.unparse(call),
                occurrence=0,method_line=node.lineno,method_end_line=node.end_lineno,
                method_excerpt=ast.get_source_segment(text,node))

def inventory():
    paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode('utf-8').split('\0')
    out=[]
    for name in sorted(set(paths)):
        p=ROOT/name
        if not name or name.startswith('docs/ingenieria/') or not p.is_file():continue
        if p.suffix not in {'.py','.js','.jsx','.ts','.tsx','.mjs','.cjs'} or not re.search(r'test|spec|e2e',name,re.I):continue
        item={'path':name,'sha256':sha(p),'methods':[],'limitation':''}
        if p.suffix=='.py':
            try:tree=ast.parse(p.read_text(encoding='utf-8-sig'))
            except SyntaxError as exc:item['limitation']='AST no disponible: '+str(exc);out.append(item);continue
            for parent in tree.body:
                methods=parent.body if isinstance(parent,ast.ClassDef) else [parent]
                for fn in methods:
                    if not isinstance(fn,(ast.FunctionDef,ast.AsyncFunctionDef)) or not fn.name.startswith('test'):continue
                    symbol=(parent.name+'.' if isinstance(parent,ast.ClassDef) else '')+fn.name
                    assertions=[]
                    for n in ast.walk(fn):
                        if isinstance(n,ast.Assert):assertions.append({'line':n.lineno,'expression':ast.unparse(n)})
                        if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and (n.func.attr.startswith('assert') or n.func.attr=='raises'):
                            assertions.append({'line':n.lineno,'expression':ast.unparse(n)})
                    item['methods'].append({'reference':name+':'+symbol,'line':fn.lineno,'end_line':fn.end_lineno,'assertions':assertions})
        else:item['limitation']='Inventariado y con huella; sin atribuir cobertura mediante nombres ni parser JavaScript. Requiere revisión específica si se propone un vínculo.'
        out.append(item)
    return out

def scenario(c,key,kind,title,origin,implementation,status='SIN PRUEBA IDENTIFICADA',reason='No se identificó una aserción pertinente para este escenario en esta revisión; no significa que no existan pruebas.'):
    return dict(id='ESC-'+c['id'][3:]+'-'+key,uc=c['id'],kind=kind,expected=title,origin=origin,
                rule=c['rule_id'],rule_scope='Regla contextual del objetivo; la guarda específica se cita en implementación, sin inventar una regla académica nueva.',
                endpoint=c['endpoint'],implementation=implementation,status=status,reason=reason,proofs=[])

def build(cases):
    results=[]
    snap=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-7-1.json').read_text(encoding='utf-8'))
    for c in cases:
        raw=(BASE/c['specification']).read_bytes()
        specification=raw.decode('utf-8').replace('\r\n','\n')
        prior=specification.split('\n\n## Escenarios y aserciones — fase 7.1')[0].rstrip()+'\n'
        ending='\r\n' if b'\r\n' in raw else '\n'
        assert hashlib.sha256(prior.replace('\n',ending).encode('utf-8')).hexdigest()==snap['sha256']['docs/ingenieria/'+c['specification']],c['id']
        assert all(step in prior for step in c['steps']),c['id']
        assert c['alternate'] in prior,c['id']
        items=[scenario(c,'P01','PRINCIPAL',c['post'],'Flujo principal: '+' → '.join(c['steps']),[c['handler'],c['service']])]
        alternatives=re.split(r'(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ])|;\s+',c['alternate'])
        for i,text in enumerate(alternatives,1):
            contextual=bool(re.search(r'no (?:es |equivale|implica|se presume|se inventa|certifica|sustituye|acredita|se afirma|genera|crea|hay )|separad|otro caso|otro objetivo|superficie pendiente|no todas',text,re.I))
            items.append(scenario(c,f'A{i:02d}','ALTERNATIVO / LÍMITE DOCUMENTADO',text,'Flujos alternativos de la especificación',[c['handler'],c['service']],
                                  'NO VERIFICABLE' if contextual else 'SIN PRUEBA IDENTIFICADA',
                                  'El enunciado delimita contexto o agrupa variantes; no permite atribuir una única ejecución/aserción sin caracterización adicional.' if contextual else 'Variante documentada; no se identificó aserción directa en esta revisión.'))
        seen=set()
        for e in c['exception_evidence']:
            unique=(e['reference'],e['line'],e['expression'])
            if unique in seen:continue
            seen.add(unique)
            loc,node,text=locate(e['reference'])
            grouped=isinstance(node,ast.ClassDef)
            guard=[]
            for n in ast.walk(node):
                if isinstance(n,ast.If) and any(isinstance(x,ast.Raise) and x.lineno==e['line'] for x in ast.walk(n)):
                    branch='then' if any(getattr(x,'lineno',0)<=e['line']<=getattr(x,'end_lineno',0) for x in n.body) else 'else'
                    guard.append(ast.unparse(n.test)+' ['+branch+']')
            title='Rechazo declarado: '+e['expression']
            item=scenario(c,f'E{len(seen):03d}','EXCEPCIONAL DECLARADO' if not grouped else 'CANDIDATO EXCEPCIONAL DE COLABORADOR AGRUPADO',title,
                          'Excepciones de la especificación; '+e['reference']+' L'+str(e['line']),[e['reference']],
                          'NO VERIFICABLE' if grouped else 'SIN PRUEBA IDENTIFICADA',
                          'La clase agrupa operaciones: no se afirma que este rechazo sea alcanzable por cada variante del UC.' if grouped else 'Raise localizado; no se identificó una aserción que demuestre su guarda concreta.')
            item['exception']=dict(e,guard_context=guard,source_line=text.splitlines()[e['line']-1]);items.append(item)
        for row in [r for r in ROWS if r['uc']==c['id']]:
            target=None
            if row['target']:
                matches=[s for s in items if row['target'] in s.get('exception',{}).get('expression','') and row['implementation'] in s['implementation']]
                assert len(matches)==1,(row,matches)
                target=matches[0]
            elif row['key']=='P01':target=items[0]
            if target is None:
                target=scenario(c,row['key'],'REFINAMIENTO VERIFICABLE',row['title'],'Desglose del objetivo, permisos o validación declarada en el código; estímulo especificado en la prueba.',[row['implementation']]);items.append(target)
            target.update(status=row['status'],reason=row['reason'],verified_behavior=row['title'],implementation=[row['implementation']],
                          proofs=[assertion(row['test'],a) for a in row['assertions']])
            target['implementation_evidence']=[locate(row['implementation'])[0]]
        results+=items
    assert len({s['id'] for s in results})==len(results)
    return results

def link(doc,path,label):return '['+label+']('+os.path.relpath(path,(BASE/doc).parent).replace('\\','/')+')'
def clean(text):return str(text).replace('|','&#124;').replace('\n',' ')

def decorate(c,text):
    if not REGISTRY.is_file():return text
    items=[s for s in json.loads(REGISTRY.read_text(encoding='utf-8'))['scenarios'] if s['uc']==c['id']]
    assert items,c['id']
    doc=c['specification'];details=BASE/'10-trazabilidad-y-validacion/escenarios-fase-7-1'/str(c['id']+'.md')
    result=text.rstrip()+'\n\n## Escenarios y aserciones — fase 7.1\n\n'
    result+='La afinidad de métodos/archivos anterior no acredita cobertura. Esta clasificación por escenario prevalece para AUD-06-009. Ninguna prueba se ejecutó. '+link(doc,details,'Matriz detallada: regla, implementación, método, aserción y límites')+'.\n\n'
    result+='| Escenario | Tipo | Clasificación |\n| --- | --- | --- |\n'
    for s in items:result+='| '+s['id']+' | '+s['kind']+' | '+s['status']+' |\n'
    return result

def main():
    cases=json.loads((BASE/'03-casos-de-uso/registro-fase-4.json').read_text(encoding='utf-8'))
    inv=inventory();scenarios=build(cases)
    snapshot=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-7-1.json').read_text(encoding='utf-8'))
    data={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
          'scope':'75 especificaciones; análisis estático; cero pruebas del producto ejecutadas',
          'statuses':STATUSES,'counts':dict(Counter(s['status'] for s in scenarios)),
          'cases':len(cases),'scenarios':scenarios,'curation_rows':len(ROWS),'candidates_not_attributed':REJECTED,
          'specifications_reviewed':{c['id']:{'path':c['specification'],'sha256_before':snapshot['sha256']['docs/ingenieria/'+c['specification']],
                                           'sections':['Flujo principal','Flujos alternativos','Excepciones']} for c in cases}}
    write('10-trazabilidad-y-validacion/escenarios-fase-7-1.json',json.dumps(data,ensure_ascii=False,indent=2))
    write('10-trazabilidad-y-validacion/inventario-aserciones-fase-7-1.json',json.dumps(inv,ensure_ascii=False,indent=2))
    doc='10-trazabilidad-y-validacion/matriz-escenarios-fase-7-1.md'
    index='# Trazabilidad por escenario y aserción — fase 7.1\n\n75 especificaciones revisadas. Las relaciones positivas son curadas por estímulo, guarda y aserción; no por nombre de archivo ni familia. No se ejecutó ninguna prueba. La ausencia de vínculo significa SIN PRUEBA IDENTIFICADA en esta revisión, no inexistencia demostrada de pruebas.\n\n'
    index+='## Criterios\n\n- VERIFICADO DOCUMENTALMENTE: aserción pertinente a todo el comportamiento acotado del escenario, sin ejecución.\n- COBERTURA PARCIAL: la aserción comprueba solo una parte; el límite consta en la fila.\n- SIN PRUEBA IDENTIFICADA: escenario identificable sin vínculo de aserción demostrado.\n- NO VERIFICABLE: correspondencia de operación/variante insuficiente, enunciado contextual o validación agrupada.\n\nP01 conserva el flujo principal completo; A individualiza los enunciados alternativos por límites de oración/cláusula; E individualiza cada raise declarado sin convertirlo en rechazo universal; V precisa un estímulo y resultado que ya existen en el objetivo o su implementación. Un mismo método puede comprobar varias situaciones: las unidades contadas son escenarios, no pruebas independientes. Los candidatos E de clases agrupadas no se presentan como recorridos implementados del UC sin contraste. RN conserva el identificador contextual del objetivo; no se inventan reglas de permiso ni reglas académicas.\n\n'
    index+='## Resultados\n\n'+''.join('- '+k+': '+str(data['counts'].get(k,0))+'.\n' for k in STATUSES)+'\n'
    index+='| Caso | Matriz y aserciones | Escenarios | Directos | Parciales | Sin prueba identificada | No verificables |\n| --- | --- | --- | --- | --- | --- | --- |\n'
    for c in cases:
        selected=[s for s in scenarios if s['uc']==c['id']];counts=Counter(s['status'] for s in selected)
        target='10-trazabilidad-y-validacion/escenarios-fase-7-1/'+c['id']+'.md'
        index+='| '+c['id']+' | '+link(doc,BASE/target,c['name'])+' | '+str(len(selected))+' | '+' | '.join(str(counts.get(k,0)) for k in STATUSES)+' |\n'
        body='# '+c['id']+' — escenarios revisados\n\n'+link(target,BASE/c['specification'],'Especificación')+' · '+link(target,BASE/doc,'Índice y criterios')+'.\n\nRegla contextual: '+c['rule_id']+' — '+c['rule']+'\n\nEndpoint/operación del objetivo: `'+c['endpoint']+'`. En cada escenario prevalece el servicio/variante acotado; una prueba de servicio no verifica por sí misma el endpoint. Sin ejecución de pruebas.\n'
        for s in selected:
            body+='\n## '+s['id']+'\n\n- Tipo: '+s['kind']+'.\n- Clasificación: **'+s['status']+'**.\n- Origen: '+clean(s['origin'])+'.\n- Comportamiento documentado: '+clean(s['expected'])+'\n'
            if s.get('verified_behavior'):body+='- Comportamiento acotado comprobado por la aserción: '+s['verified_behavior']+'\n'
            body+='- Regla: '+s['rule']+'; '+s['rule_scope']+'\n- Correspondencia/límite: '+s['reason']+'\n- Implementación: '+'; '.join(link(target,ROOT/r.partition(':')[0],r) for r in s['implementation'])+'.\n'
            if s.get('exception'):body+='- Contexto sintáctico de guardas: `'+clean('; '.join(s['exception']['guard_context']) or 'sin if envolvente; puede ser propagación/validación delegada')+'`. No equivale a una prueba de alcanzabilidad.\n'
            if s['proofs']:
                body+='\n| Método de prueba y ubicación | Aserción exacta y ubicación | Comportamiento esperado |\n| --- | --- | --- |\n'
                for p in s['proofs']:
                    body+='| '+link(target,ROOT/p['path'],p['symbol']+' L'+str(p['method_line']))+' | `'+clean(p['normalized'])+'` (L'+str(p['line'])+') | '+clean(s.get('verified_behavior',s['expected']))+' |\n'
            else:body+='\nMétodo de prueba: no atribuido. Aserción: no identificada / correspondencia no verificable según la clasificación. No se presenta el archivo temático como cobertura.\n'
        write(target,body)
    index+='\n## Candidatos descartados tras contraste\n\n'
    for item in REJECTED:
        loc,_,_=locate(item['test'])
        index+='- '+item['uc']+': '+link(doc,ROOT/loc['path'],loc['symbol']+' L'+str(loc['line']))+' — '+item['reason']+'\n'
    index+='\n[Registro estructurado de escenarios y fragmentos de prueba](escenarios-fase-7-1.json). [Inventario de fuentes de prueba y aserciones](inventario-aserciones-fase-7-1.json). Este inventario facilita revisión; ninguna coincidencia automática concede cobertura. Las fuentes JavaScript inventariadas no se interpretaron mediante AST Python ni se ejecutaron.\n'
    write(doc,index)
    print(json.dumps({'escenarios':len(scenarios),'clasificacion':data['counts'],'archivos_pruebas_inventariados':len(inv)},ensure_ascii=False))

if __name__=='__main__':main()
