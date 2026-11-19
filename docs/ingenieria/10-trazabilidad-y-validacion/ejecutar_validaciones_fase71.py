"""Solo verificaciones documentales. Sin Django, pruebas del producto, BD ni red."""
import json
import os
from pathlib import Path
import subprocess
import sys
BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]

def main():
    scripts=[('corregir_fase7.py',['--check']),('verificar.py',[]),('validar_fase3.py',[]),
             ('validar_fase4.py',[]),('validar_fase5.py',[]),('validar_fase7.py',[]),('validar_fase71.py',[])]
    results=[]
    for name,args in scripts:
        command=[sys.executable,'-B',str(BASE/'10-trazabilidad-y-validacion'/name)]+args
        p=subprocess.run(command,cwd=ROOT,capture_output=True,encoding='utf-8',errors='replace',
                         env=dict(os.environ,GIT_OPTIONAL_LOCKS='0',PYTHONIOENCODING='utf-8'),timeout=600)
        item={'script':name,'comando':command,'retorno':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
        try:item['datos']=json.loads(p.stdout)
        except ValueError:pass
        results.append(item);print(name,p.returncode,flush=True)
    result={'fecha':'2026-11-02','alcance':'Verificación documental 7.1; cero pruebas funcionales ejecutadas',
            'correcto':all(x['retorno']==0 for x in results),'resultados':results}
    (BASE/'10-trazabilidad-y-validacion/resultado-fase-7-1.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return not result['correcto']

if __name__=='__main__':raise SystemExit(main())
