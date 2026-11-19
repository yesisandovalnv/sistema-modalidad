"""Evidencia estática por objetivo. No importa ni ejecuta el producto."""
import ast
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]

def resolve(ref):
    path,_,symbol=ref.partition(':')
    tree=ast.parse((ROOT/path).read_text(encoding='utf-8-sig'))
    node=tree
    for part in symbol.split('.') if symbol else []:
        node=next((n for n in getattr(node,'body',[]) if isinstance(n,(ast.ClassDef,ast.FunctionDef,ast.AsyncFunctionDef)) and n.name==part),None)
        if node is None: return path,None
    return path,node

def review_cases(cases):
    for c in cases:
        failures=[]
        for ref in dict.fromkeys((c['handler'],c['service'])):
            path,node=resolve(ref)
            if node is None: continue
            # Clases agrupadas: se explicita el ámbito, sin adjudicar cada raise a cada variante.
            for n in ast.walk(node):
                if isinstance(n,ast.Raise) and n.exc is not None:
                    failures.append({'reference':ref,'line':n.lineno,'expression':ast.unparse(n.exc),
                                     'scope':'colaborador agrupado; verificar variante' if isinstance(node,ast.ClassDef) else 'método citado'})
        c['exception_evidence']=failures
        matches=[]
        path=c['test'];tree=ast.parse((ROOT/path).read_text(encoding='utf-8-sig'))
        targets={r.partition(':')[2] for r in (c['handler'],c['service'])}
        for cls in tree.body:
            if not isinstance(cls,ast.ClassDef): continue
            for fn in cls.body:
                if not isinstance(fn,(ast.FunctionDef,ast.AsyncFunctionDef)) or not fn.name.startswith('test'): continue
                called={ast.unparse(n.func) for n in ast.walk(fn) if isinstance(n,ast.Call)}
                matched={target for target in targets if target and any(call==target or call.endswith('.'+target) for call in called)}
                if matched:
                    matches.append({'reference':path+':'+cls.name+'.'+fn.name,'line':fn.lineno,
                                    'asserts_exception':any(call.split('.')[-1] in {'assertRaises','assertRaisesMessage','assertRaisesRegex'} for call in called),
                                    'matched_operations':sorted(matched)})
        c['test_method_evidence']=matches

def exception_markdown(c,evidence,doc):
    lines=['Ámbito: `'+c['endpoint']+'`. La guarda de acceso es el perfil `'+c['profile']+'` descrito arriba; no se deducen códigos HTTP universales.']
    if c['exception_evidence']:
        lines+=['','Excepciones declaradas en los símbolos de este objetivo (expresiones del código, sin ejecutar):','']
        for item in c['exception_evidence']:
            expr=item['expression'].replace('|','&#124;').replace('`','&#96;')
            lines.append('- `'+expr+'` — '+evidence(doc,item['reference'])+'; línea '+str(item['line'])+'; '+item['scope']+'.')
        lines+=['','Este inventario no demuestra que cada rama sea alcanzable por todas las variantes. Las validaciones delegadas y las del framework que no aparecen en estos símbolos quedan PENDIENTES de caracterización por escenario.']
    else:
        lines+=['','NO VERIFICABLE con raises explícitos en los dos símbolos citados: no se inventan rechazos. Las validaciones heredadas/delegadas y sus condiciones exactas quedan PENDIENTES de caracterización.']
    return '\n'.join(lines)

def tests_markdown(c,link,doc):
    lines=['### Métodos de prueba identificados','','Métodos identificados por llamada cualificada a la operación citada; afinidad estática, sin ejecución ni certificación de cobertura de cada excepción:','']
    for item in c['test_method_evidence']:
        path,symbol=item['reference'].split(':',1)
        lines.append('- '+link(doc,ROOT/path,symbol)+' (L'+str(item['line'])+'); llamada a `'+', '.join(item['matched_operations'])+'`; '+('contiene aserción de excepción, asociación exacta guarda/aserción pendiente' if item['asserts_exception'] else 'no acredita escenario de excepción')+'.')
    if not c['test_method_evidence']:lines.append('PENDIENTE: no se identificó método de prueba por llamada directa a los símbolos del objetivo; la referencia al archivo conserva únicamente afinidad temática.')
    return '\n'.join(lines)
