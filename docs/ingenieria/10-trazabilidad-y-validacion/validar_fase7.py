"""Regresión documental estática: no ejecuta pruebas del producto ni accede a BD."""
import ast
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from integridad_fase7 import historical_matches

sys.dont_write_bytecode=True
BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]
sys.path.insert(0,str(BASE/'03-casos-de-uso'))
sys.path.insert(0,str(BASE/'05-procesos-y-estados'))
from evidencias_fase7 import review_cases,resolve
from construir_fase5 import validate_sources,VIEWS

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    errors=[]
    def check(condition,message):
        if not condition:errors.append(message)
    before=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-7.json').read_text(encoding='utf-8'))
    manifest=json.loads((BASE/'10-trazabilidad-y-validacion/cambios-fase-7.json').read_text(encoding='utf-8'))
    outside=0
    for name,digest in before['sha256'].items():
        p=ROOT/name
        if not name.startswith('docs/ingenieria/'):
            outside+=1;check(p.is_file() and sha(p)==digest,'Exterior alterado: '+name)
        elif name.removeprefix('docs/ingenieria/') not in manifest['modificados']:
            check(historical_matches(p,digest),'Cambio no inventariado: '+name)
    for name,item in manifest['modificados'].items():
        check(before['sha256'].get('docs/ingenieria/'+name)==item['antes'],'Huella original divergente: '+name)
        check(historical_matches(BASE/name,item['despues']),'Huella final divergente: '+name)
    check({n for n in manifest['modificados'] if n.endswith('.puml')}=={
        'diagramas/fuentes/DIA-POS-021-servicios-defensa-cierre.puml',
        'diagramas/fuentes/fase-5/actividades/DIA-POS-067.puml',
        'diagramas/fuentes/fase-5/secuencias/DIA-PG-070.puml',
        'diagramas/fuentes/fase-5/secuencias/DIA-POS-074.puml'},'Fuentes UML fuera de selección autorizada')
    validate_sources()
    views={v['id']:v for v in VIEWS}
    body=views['DIA-POS-067']['body']
    check(body.index('devolver registros visibles')<body.index('stop')<body.index('else (POST)'),'Consulta continúa a mutación')
    check(all(x in body for x in ('is_staff_user','Condición PENDIENTE','Reemplazar cantidad_recibida','Recepción individual no exige PENDIENTE')),'Variantes complementarias incompletas')
    close=views['DIA-PG-070']['body']
    check(all(x in close for x in ('alt estado_actual.codigo == CONCLUIDA','Sin auditoría ni evento','else No concluida','else Cumple','ValidationError / rollback')),'Cierre sin tres recorridos')
    check('validar observaciones' not in views['DIA-POS-074']['body'] and 'request.data.get' in views['DIA-POS-074']['body'],'Validación ficticia de observaciones')
    for id in ('DIA-USR-070','DIA-USR-071'):
        check(views[id]['coverage']['UC-USR-004']=='NO REPRESENTADO','Logout acreditado por login/refresh')
    check(views['DIA-PG-070']['coverage']['UC-PG-001']=='NO REPRESENTADO','Memorando acreditado por cierre')
    source=(BASE/'diagramas/fuentes/DIA-POS-021-servicios-defensa-cierre.puml').read_text(encoding='utf-8')
    for name in ('suspender_evento','cancelar_evento','registrar_evaluacion_perfil','registrar_evaluacion_tematica','registrar_evaluacion_privada','registrar_evaluacion_publica'):
        check('+'+name+'(' in source,'Invocable como atributo: '+name)
    cases=json.loads((BASE/'03-casos-de-uso/registro-fase-4.json').read_text(encoding='utf-8'))
    reviewed=json.loads(json.dumps(cases));review_cases(reviewed)
    for c,current in zip(cases,reviewed):
        check(c['exception_evidence']==current['exception_evidence'] and c['test_method_evidence']==current['test_method_evidence'],'Evidencia de caso obsoleta: '+c['id'])
        text=(BASE/c['specification']).read_text(encoding='utf-8')
        check('Credenciales, sesión o autoridad insuficientes impiden la operación' not in text,'Plantilla genérica de excepción: '+c['id'])
        check('PENDIENTE' in text or 'NO VERIFICABLE' in text,'Falta limitación de escenario: '+c['id'])
        for test in c['test_method_evidence']:
            check(resolve(test['reference'])[1] is not None,'Prueba inventada: '+test['reference'])
    dip=next(c for c in cases if c['id']=='UC-DIP-001')
    check('no aprueba ni actualiza SeguimientoEtapa' in dip['post'],'Efecto DIP ficticio')
    rules=(BASE/'10-trazabilidad-y-validacion/reglas-fase-4.md').read_text(encoding='utf-8')
    for id,symbol in [('RN-POS-109','SeguimientoEtapaViewSet.get_queryset'),('RN-POS-118','EventoDefensaViewSet.get_queryset')]:
        row=next(s for s in rules.splitlines() if s.startswith('| '+id+' |'))
        check(symbol in row,'Referencia RN no demuestra alcance: '+id)
    permissions=(BASE/'02-actores-permisos/matriz-fase-4.md').read_text(encoding='utf-8')
    check(sum(s.startswith('| GET |') or s.startswith('| POST |') for s in permissions.splitlines())==16,'Variantes HTTP incompletas')
    for p in (BASE/'09-modalidades').glob('*/README.md'):
        check('## Antecedente de planificación' in p.read_text(encoding='utf-8'),'README histórico ambiguo: '+p.name)
    for args,key in [(['rev-parse','HEAD'],'head'),(['branch','--show-current'],'rama')]:
        check(subprocess.check_output(['git']+args,cwd=ROOT,text=True).strip()==before[key],'Git cambió: '+key)
    current_status=subprocess.check_output(['git','status','--porcelain=v1'],cwd=ROOT,text=True)
    exterior=lambda text:{s for s in text.splitlines() if not s[3:].startswith('docs/ingenieria/')}
    check(exterior(current_status)==exterior(before['status']),'Estado Git exterior cambió')
    result=dict(huellas_exteriores=outside,archivos_modificados=len(manifest['modificados']),casos_revisados=len(cases),
                casos_con_excepciones_explicitas=sum(bool(c['exception_evidence']) for c in cases),
                casos_con_metodos_prueba_identificados=sum(bool(c['test_method_evidence']) for c in cases),
                metodos_prueba_distintos=len({t['reference'] for c in cases for t in c['test_method_evidence']}),
                uc_con_recorrido_directo_selectivo=len({u for v in VIEWS for u in v['cases']}),
                clasificaciones=Counter(s for v in VIEWS for s in v['coverage'].values()),
                pruebas_producto_ejecutadas=0,errores=errors)
    print(json.dumps(result,ensure_ascii=False,indent=2));return bool(errors)

if __name__=='__main__':raise SystemExit(main())
