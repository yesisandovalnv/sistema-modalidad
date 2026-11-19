"""Inventario de diferencias frente al control previo; no modifica snapshots."""
import hashlib
import json
import os
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]

def main():
    before=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-7.json').read_text(encoding='utf-8'))
    changed={};new=[]
    for name,old in before['sha256'].items():
        p=ROOT/name
        assert p.is_file(),'Archivo eliminado: '+name
        digest=hashlib.sha256(p.read_bytes()).hexdigest()
        if digest!=old:
            assert name.startswith('docs/ingenieria/'),'Cambio exterior: '+name
            changed[name.removeprefix('docs/ingenieria/')]={'antes':old,'despues':digest}
    for parent,dirs,names in os.walk(BASE):
        dirs[:]=[d for d in dirs if d not in {'herramientas','__pycache__'}]
        for name in names:
            p=Path(parent)/name
            if p.relative_to(ROOT).as_posix() not in before['sha256']:new.append(p.relative_to(BASE).as_posix())
    result={'autorizacion':'Fase 7; exclusivamente documentación; AUD-06-001 a AUD-06-010',
            'head':before['head'],'rama':before['rama'],'modificados':dict(sorted(changed.items())),
            'creados':sorted(set(new)|{'10-trazabilidad-y-validacion/cambios-fase-7.json'})}
    result['creados']=sorted(set(result['creados'])|{'10-trazabilidad-y-validacion/archivos-fase-7.md'})
    doc='# Inventario de archivos — fase 7\n\nCambios respecto de la fotografía previa; ninguna eliminación. Las huellas antes/después se conservan en [el manifiesto](cambios-fase-7.json). Fuera de `docs/ingenieria/` no se permiten cambios.\n\n## Modificados\n\n'
    for name in result['modificados']:
        relative=os.path.relpath(BASE/name,BASE/'10-trazabilidad-y-validacion').replace('\\','/')
        doc+='- ['+name+']('+relative+').\n'
    doc+='\n## Creados\n\n'
    for name in result['creados']:
        relative=os.path.relpath(BASE/name,BASE/'10-trazabilidad-y-validacion').replace('\\','/')
        doc+='- ['+name+']('+relative+').\n'
    (BASE/'10-trazabilidad-y-validacion/archivos-fase-7.md').write_text(doc,encoding='utf-8')
    (BASE/'10-trazabilidad-y-validacion/cambios-fase-7.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'modificados':len(changed),'creados':len(result['creados'])}))

if __name__=='__main__':main()
