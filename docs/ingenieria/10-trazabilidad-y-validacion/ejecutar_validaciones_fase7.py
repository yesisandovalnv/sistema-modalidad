"""Ejecuta únicamente verificadores de documentación locales y guarda evidencia."""
import json
import os
from pathlib import Path
import subprocess
import sys

BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]

def main():
    scripts=[('corregir_fase7.py',['--check']),('verificar.py',[]),('validar_fase3.py',[]),
             ('validar_fase4.py',[]),('validar_fase5.py',[]),('validar_fase7.py',[])]
    results=[]
    for name,args in scripts:
        command=[sys.executable,'-B',str(BASE/'10-trazabilidad-y-validacion'/name)]+args
        proc=subprocess.run(command,cwd=ROOT,capture_output=True,encoding='utf-8',errors='replace',
                            env=dict(os.environ,GIT_OPTIONAL_LOCKS='0',PYTHONIOENCODING='utf-8'),timeout=600)
        result={'script':name,'comando':command,'retorno':proc.returncode,'stdout':proc.stdout,'stderr':proc.stderr}
        try:result['datos']=json.loads(proc.stdout)
        except ValueError:pass
        results.append(result)
        print(name,proc.returncode,flush=True)
    data={'fecha':'2026-11-02','tipo':'Verificación documental estática local',
          'pruebas_funcionales_ejecutadas':0,'resultados':results,'correcto':all(r['retorno']==0 for r in results)}
    (BASE/'10-trazabilidad-y-validacion/resultado-fase-7.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return not data['correcto']

if __name__=='__main__':raise SystemExit(main())
