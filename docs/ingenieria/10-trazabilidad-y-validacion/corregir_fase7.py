"""Regeneración selectiva autorizada de fase 7. Sin importaciones del producto.

No renderiza: invocar los renderizadores locales con los cuatro IDs afectados.
Los cambios de metadatos de familia conservan las cabeceras históricas de fuentes
no corregidas gráficamente; la cobertura vigente vive en ficha/registro/matriz.
"""
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode=True
BASE=Path(__file__).resolve().parents[1]
ROOT=BASE.parents[1]

def write(name,text):
    p=(BASE/name).resolve();assert p.is_relative_to(BASE)
    content=text.rstrip()+'\n'
    if not p.exists() or p.read_text(encoding='utf-8')!=content:
        if '--check' in sys.argv:raise AssertionError('Artefacto obsoleto: '+name)
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_text(content,encoding='utf-8')

def main():
    snapshot=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-7.json').read_text(encoding='utf-8'))
    for path,digest in snapshot['sha256'].items():
        if not path.startswith('docs/ingenieria/'):
            assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest,path
    sys.path.insert(0,str(BASE/'03-casos-de-uso'))
    sys.path.insert(0,str(BASE/'02-actores-permisos'))
    import construir_fase4 as f4
    f4.validate_data()
    # Conservar la protección de caracteres de tabla del constructor original.
    def changed_only(name,text):
        import re
        if name.endswith('.md'):text=re.sub(r'`([^`]+)`',lambda m:'`'+m[1].replace('|','&#124;')+'`',text)
        write(name,text)
    f4.write=changed_only
    f4.specifications();f4.catalogs();f4.actors_permissions()
    write('03-casos-de-uso/registro-fase-4.json',json.dumps(f4.CASES,ensure_ascii=False,indent=2))

    sys.path.insert(0,str(BASE/'diagramas'))
    import construir_fase3 as f3
    f3.write=write
    f3.SNAP=json.loads((BASE/'00-alcance-y-evidencia/estado-fase-3.json').read_text(encoding='utf-8'))
    old=json.loads((BASE/'diagramas/registro-fase-3.json').read_text(encoding='utf-8'))
    selected=next(d for d in old if d['id']=='DIA-POS-021')
    for path in selected['sources']:f3.parse(path)
    f3.class_view(selected['id'],'servicios-defensa-cierre',selected['evidence']['classes'],selected['goal'])
    assert len(f3.REGISTRY)==1
    old=[f3.REGISTRY[0] if d['id']==selected['id'] else d for d in old]
    write('diagramas/registro-fase-3.json',json.dumps(old,ensure_ascii=False,indent=2))

    sys.path.insert(0,str(BASE/'05-procesos-y-estados'))
    import construir_fase5 as f5
    f5.write=changed_only
    f5.validate_sources();f5.sources_and_fiches();f5.matrices_and_indexes()
    # Mismos 118 recursos y rutas: la galería conserva sus vínculos; no reescribirla.
    for p in (BASE/'09-modalidades').glob('*/README.md'):
        text=p.read_text(encoding='utf-8')
        text=text.replace('## Modelado posterior','## Antecedente de planificación (fase 2)')
        text=text.replace('Diagramas definitivos PENDIENTES de autorización.',
            'En fase 2 los diagramas definitivos estaban PENDIENTES de autorización. Ese estado es histórico: las fases 3 y 4 aportaron modelos estructurales y funcionales, y el paquete dinámico de fase 5 enlazado abajo contiene los entregables actuales. Su existencia no certifica validación funcional ni esquema instalado.')
        write(p.relative_to(BASE).as_posix(),text)
    print('Regeneración selectiva: 75 especificaciones; reglas/permisos; 1 clase; metadatos de 49 vistas y 3 recorridos; 6 README.')

if __name__=='__main__':main()
