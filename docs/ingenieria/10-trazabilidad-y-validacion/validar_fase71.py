"""Verificación de escenario → implementación → prueba → aserción, sin ejecución."""
import ast
from collections import Counter
import hashlib
import json
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode=True
BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]
sys.path.insert(0,str(BASE/'03-casos-de-uso'))
from escenarios_fase71 import build,assertion,decorate,locate,sha,STATUSES,inventory

def main():
    errors=[]
    def check(ok,message):
        if not ok:errors.append(message)
    snap=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-7-1.json').read_text(encoding='utf-8'))
    manifest=json.loads((BASE/'10-trazabilidad-y-validacion/cambios-fase-7-1.json').read_text(encoding='utf-8'))
    cases=json.loads((BASE/'03-casos-de-uso/registro-fase-4.json').read_text(encoding='utf-8'))
    registry=json.loads((BASE/'10-trazabilidad-y-validacion/escenarios-fase-7-1.json').read_text(encoding='utf-8'))
    scenarios=registry['scenarios']
    check(len(cases)==75 and len(registry['specifications_reviewed'])==75,'No se revisaron 75 especificaciones')
    check(scenarios==build(cases),'Registro distinto de sus fuentes y curación')
    check(len({s['id'] for s in scenarios})==len(scenarios),'IDs de escenario duplicados')
    check(set(s['uc'] for s in scenarios)=={c['id'] for c in cases},'Objetivo sin escenarios')
    assertions=set()
    for s in scenarios:
        check(s['status'] in STATUSES,'Clasificación inválida: '+s['id'])
        check(s['rule']==next(c['rule_id'] for c in cases if c['id']==s['uc']),'Regla renumerada: '+s['id'])
        positive=s['status'] in STATUSES[:2]
        check(bool(s['proofs'])==positive,'Cobertura sin evidencia / atribución indebida: '+s['id'])
        check(bool(s['reason']),'Sin justificación: '+s['id'])
        for ref in s['implementation']:locate(ref)
        for proof in s['proofs']:
            current=assertion(proof['reference'],proof['normalized'])
            check(proof==current,'Método, ubicación, huella o aserción divergente: '+s['id'])
            assertions.add((proof['path'],proof['line'],proof['normalized']))
            check(proof['method_line']<=proof['line']<=proof['method_end_line'],'Aserción fuera de método: '+s['id'])
        if s['status']=='COBERTURA PARCIAL':check(len(s['reason'])>40,'Límite parcial no explicado: '+s['id'])
    for c in cases:
        doc=BASE/c['specification'];text=doc.read_text(encoding='utf-8')
        prefix=text.split('\n\n## Escenarios y aserciones — fase 7.1')[0]
        check(text.rstrip()==decorate(c,prefix).rstrip(),'Especificación no sincronizada: '+c['id'])
        detail=(BASE/'10-trazabilidad-y-validacion/escenarios-fase-7-1'/str(c['id']+'.md')).read_text(encoding='utf-8')
        for s in (s for s in scenarios if s['uc']==c['id']):
            check(s['id'] in text and s['id'] in detail,'Escenario sin referencia: '+s['id'])
            check(s['status'] in detail,'Clasificación ausente: '+s['id'])
            for p in s['proofs']:check(p['normalized'].replace('|','&#124;') in detail,'Aserción no publicada: '+s['id'])
    inv=json.loads((BASE/'10-trazabilidad-y-validacion/inventario-aserciones-fase-7-1.json').read_text(encoding='utf-8'))
    check(inv==inventory(),'Inventario de métodos/aserciones distinto del AST actual')
    for item in inv:check(sha(ROOT/item['path'])==item['sha256'],'Prueba inventariada alterada: '+item['path'])
    for item in registry['candidates_not_attributed']:locate(item['test'])
    outside=0;unchanged=0
    for name,digest in snap['sha256'].items():
        p=ROOT/name
        if not name.startswith('docs/ingenieria/'):
            outside+=1;check(p.is_file() and sha(p)==digest,'Cambio exterior: '+name)
        elif name.removeprefix('docs/ingenieria/') not in manifest['modificados']:
            unchanged+=1;check(p.is_file() and sha(p)==digest,'Archivo preexistente alterado sin registrar: '+name)
    for name,item in manifest['modificados'].items():
        check(snap['sha256']['docs/ingenieria/'+name]==item['antes'] and sha(BASE/name)==item['despues'],'Huella de cambio incorrecta: '+name)
        check(Path(name).suffix not in {'.puml','.svg','.png'},'Se alteró un diagrama: '+name)
    for args,key in [(['rev-parse','HEAD'],'head'),(['branch','--show-current'],'rama')]:
        check(subprocess.check_output(['git']+args,cwd=ROOT,text=True).strip()==snap[key],'Git alterado: '+key)
    current=subprocess.check_output(['git','status','--porcelain=v1'],cwd=ROOT,text=True)
    exterior=lambda s:{line for line in s.splitlines() if not line[3:].startswith('docs/ingenieria/')}
    check(exterior(current)==exterior(snap['status']),'Cambios locales ajenos alterados')
    result={'especificaciones_revisadas':len(cases),'escenarios':len(scenarios),'clasificacion':dict(Counter(s['status'] for s in scenarios)),
            'aserciones_distintas_vinculadas':len(assertions),'metodos_prueba_distintos':len({p['reference'] for s in scenarios for p in s['proofs']}),
            'archivos_pruebas_inventariados':len(inv),'huellas_exteriores_conservadas':outside,'documentos_previos_sin_cambio':unchanged,
            'archivos_documentales_modificados':len(manifest['modificados']),'diagramas_modificados':0,'pruebas_funcionales_ejecutadas':0,'errores':errors}
    print(json.dumps(result,ensure_ascii=False,indent=2));return bool(errors)

if __name__=='__main__':raise SystemExit(main())
