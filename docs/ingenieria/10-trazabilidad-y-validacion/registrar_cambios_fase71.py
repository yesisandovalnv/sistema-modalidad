"""Manifiesto 7.1: conserva la fotografía y los manifiestos históricos."""
import hashlib
import json
import os
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]

def main():
    snapshot=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-7-1.json').read_text(encoding='utf-8'))
    changed={};created=[]
    for name,digest in snapshot['sha256'].items():
        p=ROOT/name;assert p.is_file(),name
        current=hashlib.sha256(p.read_bytes()).hexdigest()
        if current!=digest:
            assert name.startswith('docs/ingenieria/'),name
            assert p.suffix not in {'.puml','.svg','.png'},name
            changed[name.removeprefix('docs/ingenieria/')]={'antes':digest,'despues':current}
    for parent,dirs,names in os.walk(BASE):
        dirs[:]=[d for d in dirs if d not in {'herramientas','__pycache__'}]
        for name in names:
            p=Path(parent)/name
            if p.relative_to(ROOT).as_posix() not in snapshot['sha256']:created.append(p.relative_to(BASE).as_posix())
    data={'autorizacion':'Exclusivamente fase 7.1, AUD-06-009, documentación; sin pruebas del producto ejecutadas',
          'head':snapshot['head'],'rama':snapshot['rama'],'modificados':dict(sorted(changed.items())),
          'creados':sorted(set(created)|{'10-trazabilidad-y-validacion/cambios-fase-7-1.json'})}
    (BASE/'10-trazabilidad-y-validacion/cambios-fase-7-1.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'modificados':len(changed),'creados':len(data['creados'])}))

if __name__=='__main__':main()
