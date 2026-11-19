"""Construye documentación funcional sin importar ni ejecutar el producto.

Solo escribe en docs/ingenieria; no reescribe fuentes, fichas ni SVG de fase 3.
Los datos son una transcripción documental curada, no descubrimiento de permisos
por nombres de roles. Ejecutar desde la raíz con Python ya disponible.
"""
import ast
import hashlib
import html
import json
import os
from pathlib import Path
import re
import sys
import textwrap

sys.dont_write_bytecode = True
from datos_fase4 import CASES
import datos_ampliacion_fase4  # añade el desglose a la colección compartida

BASE = Path(__file__).resolve().parents[1]
ROOT = BASE.parents[1]
SNAP = json.loads((BASE / '00-alcance-y-evidencia/estado-fase-4.json').read_text(encoding='utf-8'))
VERSION = SNAP['head'] + ' / ' + SNAP['rama'] + ' / directorio de trabajo 2026-11-02'
ACTORS = {
 'ACT-SYS-001': ('Solicitante de acceso', 'Persona sin sesión aceptada; solicita credenciales o presenta un refresh válido. No representa una integración externa.'),
 'ACT-SYS-002': ('Usuario autenticado', 'Sesión admitida por el backend. Algunos endpoints añaden IsActiveUser; no se generaliza esa guarda a todos.'),
 'ACT-USR-001': ('Administración funcional', 'is_superuser o rol ADMINISTRADOR según is_staff_user. ADMINISTRACION e is_staff por sí solos no otorgan esta autoridad.'),
 'ACT-USR-002': ('Estudiante', 'Rol ESTUDIANTE. En el filtro común solo accede a postulaciones propias; el rol no prueba propiedad de cualquier expediente.'),
 'ACT-USR-003': ('Docente', 'Rol DOCENTE. En el filtro común y reportes consulta expedientes asignados; la mera existencia del rol no concede escritura académica.'),
 'ACT-POS-001': ('Propietario de postulación', 'Relación request.user = postulacion.estudiante. Es condición contextual, distinta del rol; las consultas RELATED no exigen un código de rol.'),
 'ACT-POS-002': ('Usuario vinculado al expediente', 'Asignación y, solo en defensas, participación en el evento. Las rutas aceptan vínculos diferentes: se conserva el detalle en la matriz; no es un rol global.'),
}
PROFILES = {
 'PUBLIC': (['ACT-SYS-001'], 'Sin sesión previa; credenciales o token refresh válidos según la operación.', 'Sin expedientes; no autoriza operaciones académicas.'),
 'AUTH': (['ACT-SYS-002'], 'IsAuthenticated; no se presume un IsActiveUser adicional.', 'Catálogos autenticados o notificaciones propias; no concede acceso universal a expedientes.'),
 'AUTH_ACTIVE': (['ACT-SYS-002'], 'IsAuthenticated e IsActiveUser en la vista.', 'Cuenta de la sesión; no habilita otras cuentas.'),
 'ADMIN': (['ACT-USR-001'], 'IsAuthenticated y autoridad administrativa comprobada en permiso de vista o guarda del método/servicio.', 'Global cuando la vista lo permite; siguen vigentes validaciones académicas y de recurso.'),
 'ADMIN_ACTIVE': (['ACT-USR-001'], 'IsAuthenticated, IsActiveUser y permiso administrativo del recurso (CanManageUsers, CanManageApplications o IsStaff según la vista).', 'Catálogos administrativos. La protección del superusuario y el filtro de candidatos añaden restricciones específicas.'),
 'COMMON': (['ACT-USR-001','ACT-USR-002','ACT-USR-003'], 'Filtro postulaciones_in_scope: administración; ESTUDIANTE propietario; DOCENTE asignado; otros roles sin alcance.', 'Administración: todos; estudiante: propios; docente: asignados. No equivale a RELATED.'),
 'RELATED': (['ACT-USR-001','ACT-POS-001','ACT-POS-002'], 'IsAuthenticated y queryset por administración, propietario o asignación. En estas consultas el vínculo no exige rol DOCENTE.', 'Solo expedientes relacionados; el queryset concreto decide el tratamiento de asignaciones históricas.'),
 'DEFENSE_READ': (['ACT-USR-001','ACT-POS-001','ACT-POS-002'], 'IsAuthenticated; administración, propietario, asignación (incluida histórica donde all_objects se usa) o participante del evento.', 'La participación habilita esta lectura de defensas; no habilita registrar asistencia ni evaluación.'),
 'OWNER_ADMIN': (['ACT-USR-001','ACT-POS-001'], 'Administración o propietario; la asignación sola no permite esta escritura.', 'Solo expediente propio o administración, sujeto a política documental y etapa.'),
 'REPORT': (['ACT-USR-001','ACT-USR-003'], 'IsAuthenticated y administración o rol DOCENTE en la vista de reportes.', 'Administración global; docente asignados. ESTUDIANTE rechazado en la vista aunque ScopeService contemple propiedad.'),
}
GROUPS = {
 'usuarios': ('DIA-USR-040','Autenticación y usuarios'),
 'academico': ('DIA-ACA-040','Gestión académica'),
 'postulaciones': ('DIA-POS-040','Postulaciones'),
 'seguimiento': ('DIA-POS-041','Seguimiento de etapas'),
 'asignaciones': ('DIA-POS-042','Asignaciones académicas'),
 'defensas': ('DIA-POS-043','Defensas y evaluaciones'),
 'complementarios': ('DIA-POS-044','Condiciones y entrega física'),
 'documentos': ('DIA-DOC-040','Gestión documental'),
 'notificaciones': ('DIA-NOT-040','Notificaciones'),
 'reportes': ('DIA-REP-040','Reportes'),
 'proyecto': ('DIA-PG-040','Proyecto de Grado'),
 'tesis': ('DIA-TG-040','Tesis de Grado'),
 'trabajo': ('DIA-TD-040','Trabajo Dirigido'),
 'examen': ('DIA-EG-040','Examen de Grado'),
 'excelencia': ('DIA-EA-040','Excelencia Académica'),
 'diplomado': ('DIA-DIP-040','Graduación vía Diplomado'),
}


def write(name, content):
    p = BASE / name
    assert p.resolve().is_relative_to(BASE)
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.suffix == '.md':
        content = re.sub(r'`([^`]+)`', lambda m: '`'+m[1].replace('|','&#124;')+'`', content)
    p.write_text(content.rstrip() + '\n', encoding='utf-8')


def link(doc, target, label=None):
    return '[' + (label or str(target)) + '](' + os.path.relpath(target, (BASE/doc).parent).replace('\\','/') + ')'


def evidence(doc, ref):
    path, _, symbol = ref.partition(':')
    return link(doc, ROOT/path, symbol or path)


def rule_id(c):
    _, scope, num = c['id'].split('-')
    return f'RN-{scope}-{100+int(num):03d}'


def spec_path(c):
    return '03-casos-de-uso/especificaciones/' + c['id'] + '.md'


def symbols(path):
    result = set()
    def walk(nodes, prefix=''):
        for n in nodes:
            if isinstance(n, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                result.add(prefix+n.name)
                if isinstance(n, ast.ClassDef): walk(n.body, prefix+n.name+'.')
            elif isinstance(n, (ast.Assign, ast.AnnAssign)):
                targets = n.targets if isinstance(n, ast.Assign) else [n.target]
                for t in targets:
                    if isinstance(t, ast.Name): result.add(prefix+t.id)
    walk(ast.parse(path.read_text(encoding='utf-8-sig')).body)
    return result


def validate_data():
    assert len(CASES) == 75 and len({c['id'] for c in CASES}) == 75
    entities = {}
    for line in (BASE/'04-dominio-y-datos/catalogo-entidades.md').read_text(encoding='utf-8').splitlines():
        if line.startswith('| ENT-'):
            cells = [x.strip() for x in line.split('|')[1:-1]]
            entities[cells[1]] = cells[0]
    for c in CASES:
        assert c['group'] in GROUPS and c['profile'] in PROFILES, c
        for ref in (c['handler'], c['service']):
            name, _, symbol = ref.partition(':')
            assert (ROOT/name).is_file(), ref
            assert not symbol or symbol in symbols(ROOT/name), ref
        assert (ROOT/c['test']).is_file(), c['test']
        assert all(e in entities for e in c['entities']), c['entities']
        c['entity_ids'] = [entities[e] for e in c['entities']]
        c['rule_id'] = rule_id(c)
        c['actors'] = PROFILES[c['profile']][0]
        c['specification'] = spec_path(c)
    from evidencias_fase7 import review_cases
    review_cases(CASES)
    return entities


def specifications():
    for c in CASES:
        doc = spec_path(c)
        actors = '; '.join(a+' — '+ACTORS[a][0] for a in c['actors'])
        profile = PROFILES[c['profile']]
        steps = '\n'.join(f'{i}. {s}.' for i,s in enumerate(c['steps'],1))
        nuance = ''
        if c['id']=='UC-POS-022':
            nuance = '\n\n**Variantes de permiso:** GET admite alcance COMMON; POST exige administración. La asociación de lectura no concede recálculo al estudiante o docente.'
        if c['id']=='UC-USR-008':
            nuance = '\n\n**Variantes de permiso:** el catálogo global aplica IsAuthenticated, IsActiveUser e IsStaff. El endpoint contextual aplica la autoridad administrativa de PostulacionViewSet y filtros de política; no se le atribuye un IsActiveUser adicional no declarado.'
        if c['id']=='UC-TG-001':
            nuance = '\n\n**Especialización:** concreta UC-POS-008 para TESIS_GRADO; comparte endpoint y no constituye una segunda operación HTTP.'
        if c['id']=='UC-DOC-005':
            nuance = '\n\n**Superficie heredada pendiente:** el ModelViewSet también expone actualización y eliminación; no se afirma que reproduzcan las validaciones de create. Deben caracterizarse antes de documentarlas como flujos equivalentes.'
        text=f'''# {c['id']} — {c['name']}

## Identidad y estado

- Identificador: {c['id']}.
- Objetivo: {c['post']}
- Actor principal: {actors}. Son alternativas sujetas a contexto, no colaboración obligatoria.
- Actores secundarios: ninguno con interacción independiente confirmado para este objetivo. Personas registradas como tutor, tribunal o evaluador no se convierten por ello en operadores API.
- Estado de implementación: {c['status']}.
- Versión documentada: {VERSION}.

## Descripción y disparador

{c['name']} mediante `{c['endpoint']}`. El disparador es la solicitud del actor al recurso o acción indicada. Si el objetivo agrupa CRUD o acciones del ciclo, cada solicitud selecciona una variante; no obliga a ejecutar todas en secuencia.{nuance}

## Precondiciones

{profile[1]} {profile[2]}

{c['condition']} La existencia y pertenencia del recurso se resuelven en el endpoint; la interfaz no sustituye esta comprobación.

## Flujo principal

{steps}

## Flujos alternativos

{c['alternate']}

## Excepciones

{__import__('evidencias_fase7').exception_markdown(c,evidence,doc)}

## Postcondiciones

{c['post']} No implica conclusión académica de otras etapas o modalidades.

## Reglas de negocio y permisos

{c['rule_id']}: {c['rule']}

Perfil documental `{c['profile']}`; consultar {link(doc,BASE/'02-actores-permisos/matriz-fase-4.md','matriz por operación')} y {link(doc,BASE/'02-actores-permisos/actores-fase-4.md','catálogo de actores')}. El perfil resume una guarda; no es un permiso implementado con ese nombre.

## Evidencia y trazabilidad

- Servicio o endpoint: {evidence(doc,c['handler'])}; colaboración: {evidence(doc,c['service'])}.
- Entidades: {', '.join(c['entity_ids'])} ({', '.join(c['entities'])}). {link(doc,BASE/'04-dominio-y-datos/catalogo-entidades.md','Catálogo persistente')}.
- Pruebas relacionadas: {link(doc,ROOT/c['test'],'archivo de pruebas existente')}. Referencia por afinidad del objetivo; no acredita cobertura de todas sus variantes. No se ejecutaron pruebas del producto en esta fase.

{__import__('evidencias_fase7').tests_markdown(c,link,doc)}

- {link(doc,BASE/'10-trazabilidad-y-validacion/matriz-fase-4.md','Matriz de trazabilidad')} y {link(doc,BASE/'00-alcance-y-evidencia/revision-fase-4.md','límites de la revisión')}.
'''
        from escenarios_fase71 import decorate
        write(doc,decorate(c,text))


def catalogs():
    doc='03-casos-de-uso/catalogo-funcionalidades.md'
    text='# Catálogo de funcionalidades y casos de uso confirmados\n\n75 objetivos confirmados por análisis estático. Se conservan los 23 identificadores de fase 2; los desgloses reciben IDs nuevos. Tesis incluye una especialización de conclusión común, no un endpoint adicional. IMPLEMENTADO no certifica ejecución ni vigencia normativa.\n\n| Funcionalidad | Caso de uso | Nombre y especificación | Área |\n| --- | --- | --- | --- |\n'
    for c in CASES:
        text+=f"| {c['id'].replace('UC-','FUN-')} | {c['id']} | {link(doc,BASE/spec_path(c),c['name'])} | {GROUPS[c['group']][1]} |\n"
    write(doc,text)
    doc='10-trazabilidad-y-validacion/reglas-fase-4.md'
    text='# Reglas observadas por objetivo — fase 4\n\nSon restricciones de implementación verificables, no nuevos requisitos ni dictamen normativo. La serie 100+ evita reutilizar los 23 RN originales de la matriz histórica.\n\n| ID | Regla observada | Caso | Evidencia |\n| --- | --- | --- | --- |\n'
    for c in CASES:
        refs=[c['handler'],c['service']]
        if c['rule_id']=='RN-POS-118': refs.append('apps/postulantes/defensas_api.py:PostulacionEventosView._post')
        text+=f"| {c['rule_id']} | {c['rule']} | {c['id']} | {'; '.join(evidence(doc,r) for r in dict.fromkeys(refs))} |\n"
    write(doc,text)
    doc='10-trazabilidad-y-validacion/matriz-fase-4.md'
    text='# Trazabilidad funcional vigente — fase 4\n\nCadena verificable UC → RN → endpoint/servicio → entidad → archivo de pruebas relacionado. Las pruebas son evidencia existente, no resultados ni cobertura exhaustiva. Los 23 RN iniciales se conservan en la [matriz histórica](matriz.md); esta vista refina su granularidad sin renumerarlos.\n\n| Caso | Regla | Endpoint y servicio | Entidades | Pruebas relacionadas |\n| --- | --- | --- | --- | --- |\n'
    for c in CASES:
        text+=f"| {link(doc,BASE/spec_path(c),c['id'])} | {c['rule_id']} | `{c['endpoint']}`; {evidence(doc,c['handler'])}; {evidence(doc,c['service'])} | {', '.join(c['entity_ids'])} | {link(doc,ROOT/c['test'],'Archivo existente; no ejecutado')} |\n"
    write(doc,text)
    write('03-casos-de-uso/README-fase-4.md', '''# Documentación funcional — fase 4

75 especificaciones verificables; siete actores funcionales; 17 vistas de casos de uso. Los objetivos agrupados se descomponen en variantes HTTP cuando el permiso cambia. La especialización de Tesis comparte la operación común de conclusión.

- [Catálogo y acceso a las 75 fichas](catalogo-funcionalidades.md).
- [Actores y participantes](../02-actores-permisos/actores-fase-4.md).
- [Matriz de permisos](../02-actores-permisos/matriz-fase-4.md).
- [Trazabilidad](../10-trazabilidad-y-validacion/matriz-fase-4.md).
- [Reglas observadas](../10-trazabilidad-y-validacion/reglas-fase-4.md).
- [Diagramas y fichas](../diagramas/registro-fase-4.md).
- [Revisión preliminar](../00-alcance-y-evidencia/revision-fase-4.md).

No se modelan operaciones como registro autónomo de estudiantes, escritura directa de tribunales, correo externo o administración de modalidades por POST/DELETE sin evidencia de implementación. La ausencia de un caso no afirma que cualquier método heredado esté bloqueado: las superficies no caracterizadas se registran como pendientes.
''')


def actors_permissions():
    doc='02-actores-permisos/actores-fase-4.md'
    text='# Actores, roles, participantes y capacidades — fase 4\n\nSiete actores funcionales. Un actor representa interacción autorizada, no una tabla ni un cargo académico. No se confirmó sistema externo iniciador; JWT, PostgreSQL, publicador interno y archivos son componentes del sistema.\n\n| ID | Actor | Criterio verificable |\n| --- | --- | --- |\n'
    for id,(name,desc) in ACTORS.items(): text+=f'| {id} | {name} | {desc} |\n'
    text+='''
## Roles y autoridad

Los códigos ADMINISTRADOR, ADMINISTRACION, DOCENTE y ESTUDIANTE reconocidos por [core.permissions](../../../core/permissions.py) no son cuatro autoridades equivalentes. `is_staff_user` acepta ADMINISTRADOR o is_superuser; `is_staff` pertenece a Django Admin. ADMINISTRACION no satisface por sí solo esa guarda. No se ha consultado la tabla de roles instalada en PostgreSQL.

La generalización UML de administración, estudiante, docente, propietario y vinculado hacia usuario autenticado expresa sesión necesaria, no transferencia de alcance entre roles. Estudiante no hereda de propietario: debe probar la propiedad para cada expediente. El solicitante de acceso permanece separado.

## Participación académica

Tipos declarados en AsignacionPostulacion.TipoParticipacionChoices:

'''
    tree=ast.parse((ROOT/'apps/postulantes/models.py').read_text(encoding='utf-8-sig'))
    for n in ast.walk(tree):
        if isinstance(n,ast.ClassDef) and n.name=='TipoParticipacionChoices':
            for a in n.body:
                if isinstance(a,ast.Assign):
                    try: val=ast.literal_eval(a.value)
                    except (ValueError,TypeError): continue
                    if isinstance(val,tuple): text+=f'- `{val[0]}`: {val[1]}.\n'
    text+='''
Fuente: [AsignacionPostulacion](../../../apps/postulantes/models.py). Los participantes del evento de defensa y dictámenes son registros de atribución académica. Registrar una nota, dictamen, asistencia o decisión sigue siendo una acción administrativa en los endpoints examinados; no se asocia automáticamente al tutor/tribunal como operador. La lectura de defensas sí contempla participantes en su queryset.

## Capacidades de interfaz

[UserCapabilitiesService.resolve](../../../apps/usuarios/services.py) y [AppRoutes.jsx](../../../src/routes/AppRoutes.jsx) deciden visibilidad y navegación. La existencia de un botón o su ocultamiento no concede ni revoca la autorización del backend. Los endpoints IsAuthenticated pueden aceptar usuarios cuyo menú no exhibe una capacidad; esto se documenta sin ampliar sus permisos.

## Perfiles documentales de acceso

Los siguientes nombres son abreviaturas de esta documentación, no clases nuevas ni roles persistidos.

| Perfil | Guarda resumida | Alcance |
| --- | --- | --- |
'''
    for key,(_,guard,scope) in PROFILES.items(): text+=f'| {key} | {guard} | {scope} |\n'
    text+='\nEvidencia principal: [permisos comunes](../../../core/permissions.py), [alcance de postulaciones](../../../apps/postulantes/permissions.py), [vistas de etapas](../../../apps/postulantes/views.py), [documentos](../../../apps/documentos/views.py) y [reportes](../../../apps/reportes/views.py). El detalle de cada operación prevalece sobre el perfil resumido.\n'
    write(doc,text)
    doc='02-actores-permisos/matriz-fase-4.md'
    text='# Matriz de permisos por objetivo y variante — fase 4\n\nLa autorización backend prevalece sobre la interfaz. COMMON, RELATED y DEFENSE_READ tienen alcances diferentes; no son permisos intercambiables. Las guardas específicas se conservan en la ficha del caso y en la evidencia de su método.\n\n| Caso y operación | Actor o condición | Permiso requerido | Alcance del expediente | Condición académica | Evidencia backend |\n| --- | --- | --- | --- | --- | --- |\n'
    for c in CASES:
        variants=[(c['endpoint'],c['profile'])]
        if c['id']=='UC-POS-022': variants=[('GET resultado final','COMMON'),('POST recalcular resultado final','ADMIN')]
        if c['id']=='UC-USR-008': variants=[('GET /api/v1/usuarios/candidatos-asignacion/','ADMIN_ACTIVE'),('GET /api/v1/postulaciones/{id}/candidatos-asignacion/','ADMIN')]
        for operation,prof in variants:
            ids,guard,scope=PROFILES[prof]
            text+=f"| {c['id']}: `{operation}` | {'; '.join(ACTORS[a][0] for a in ids)} | {prof}: {guard} | {scope} | {c['condition']} | {evidence(doc,c['handler'])}; {evidence(doc,c['service'])} |\n"
    text+='''
## Restricciones que no deben perderse

- Administración de usuarios no contiene DELETE en UserAdminViewSet; roles sí usa ModelViewSet y captura protección referencial al borrar. La cuenta superusuario tiene protección de objeto.
- ModalidadViewSet rechaza create y destroy. Periodos y requisitos no heredan esa prohibición.
- Candidatos globales y candidatos contextuales de asignación no son la misma ruta: la política del expediente añade filtros al endpoint contextual.
- Documentos se leen por vínculo y por publicación de memorandos; cargar requiere administración o propietario. Marcar una observación documental como corregida exige administración, aun cuando pertenezca al estudiante.
- La creación de confirmación de corrección aplica servicio/política; las mutaciones heredadas de su ModelViewSet requieren caracterización independiente.
- Las evaluaciones y asistencia se registran por administración. El evaluador/participante registrado no adquiere ese permiso por su registro.
- Cambiar estado general mediante PATCH no equivale a concluir mediante WorkflowService. El primero no invoca todas las guardas de conclusión; no se declara como una ruta académicamente equivalente.
- GET de overview de Examen/Diplomado puede inicializar estructuras auxiliares en el servicio; no se presume ausencia absoluta de escrituras por ser una consulta.
- Cerrar sesión presenta un refresh para blacklist; la vista no contiene comprobación explícita de propiedad de ese refresh. Queda pendiente caracterizar el contrato sin ejecutar operaciones sobre tokens reales.

Fuentes: métodos enlazados en cada fila. Las pruebas relacionadas figuran en la [matriz de trazabilidad](../10-trazabilidad-y-validacion/matriz-fase-4.md); no se ejecutaron en esta fase.
'''
    sys.path.insert(0,str(BASE/'02-actores-permisos'))
    from variantes_fase7 import append_matrix
    append_matrix(BASE,PROFILES,ACTORS,evidence,write,text)


def diagrams():
    registry=[]
    sets=[('DIA-SYS-001','Vista general del sistema', [c for c in CASES if c['id'] in {'UC-USR-001','UC-ACA-005','UC-POS-002','UC-POS-003','UC-DOC-001','UC-POS-006','UC-NOT-001','UC-REP-001'}])]
    sets += [(id,title,[c for c in CASES if c['group']==group]) for group,(id,title) in GROUPS.items()]
    for id,title,cases in sets:
        source=f'diagramas/fuentes/fase-4/{id}.puml'
        ficha=f'diagramas/fichas/fase-4/{id}.md'
        svg=f'diagramas/renderizados/fase-4/{id}.svg'
        actorids=sorted(set(a for c in cases for a in c['actors']))
        if id=='DIA-SYS-001': actorids=sorted(ACTORS)
        lines=['@startuml',"' Identificador: "+id,"' Nombre: "+title,"' Objetivo: identificar objetivos y actores autorizados, con guardas detalladas en la matriz.","' Alcance: "+', '.join(c['id'] for c in cases),"' Elementos: actores funcionales y casos de uso; asociaciones sujetas al contexto backend.","' Version: "+VERSION,"' Limitaciones: análisis estático; asociación no concede todas las variantes; ver ficha y matriz."]
        sources=sorted(set(ref.partition(':')[0] for c in cases for ref in [c['handler'],c['service']]))
        lines += ["' Evidencia: "+s for s in sources]
        lines += ['!include ../../estilos/base.puml.inc','left to right direction','skinparam packageStyle rectangle','skinparam usecaseBackgroundColor #EFF6FF','skinparam actorStyle awesome',f'title {id} — {title}']
        alias=lambda s:s.replace('-','_')
        for a in actorids:
            label='\\n'.join(textwrap.wrap(ACTORS[a][0],22))
            lines.append(f'actor "{label}" as {alias(a)}')
        if id=='DIA-SYS-001':
            for a in actorids:
                if a not in {'ACT-SYS-001','ACT-SYS-002'}: lines.append(f'{alias(a)} --|> ACT_SYS_002')
        lines.append(f'rectangle "Sistema de Modalidades de Graduación\\n{title}" {{')
        for c in cases:
            label=c['id']+'\\n'+'\\n'.join(textwrap.wrap(c['name'],32))
            lines.append(f'  usecase "{label}" as {alias(c["id"])}')
        if id=='DIA-TG-040':
            lines.append('  usecase "UC-POS-008\\nConcluir postulación\\n(referencia común)" as UC_POS_008 #F1F5F9')
        lines.append('}')
        for c in cases:
            for a in c['actors']: lines.append(f'{alias(a)} -- {alias(c["id"])}')
        if id=='DIA-TG-040': lines.append('UC_TG_001 --|> UC_POS_008')
        if any(c['id']=='UC-POS-022' for c in cases):
            lines += ['note bottom of UC_POS_022','Estudiante/docente: GET en su alcance.','POST recálculo: solo administración.','end note']
        lines+=['legend bottom','Asociación = interacción sujeta a guardas backend.','No implica permiso para todas las variantes HTTP.','Los cargos académicos no son operadores automáticos.','endlegend',f'footer {SNAP["head"][:12]} / desarrollo / trabajo local / 2026-11-02','@enduml']
        write(source,'\n'.join(lines))
        item=dict(id=id,title=title,type='Casos de uso',goal='Mostrar objetivos reales y actores autorizados sin confundir cargos con permisos.',scope=', '.join(c['id'] for c in cases),sources=sources,version=VERSION,limitations='Confirmación estática; variantes y restricciones en matriz. No certifica pruebas ni normativa. Sin include/extend no demostrados.',source=source,description=ficha,svg=svg,cases=[c['id'] for c in cases],actors=actorids)
        registry.append(item)
        content=f'# {id} — {title}\n\n- Identificador: {id}.\n- Objetivo: {item["goal"]}\n- Alcance: {item["scope"]}.\n- Elementos: '+', '.join(actorids)+'; objetivos enumerados a continuación.\n- Versión: '+VERSION+'.\n- Limitaciones: '+item['limitations']+'\n\n'
        content+=link(ficha,BASE/source,'Fuente PlantUML')+' · '+link(ficha,BASE/svg,'SVG local')+' · '+link(ficha,BASE/'02-actores-permisos/matriz-fase-4.md','Permisos detallados')+'\n\n## Objetivos\n\n'
        content+='\n'.join('- '+link(ficha,BASE/spec_path(c),c['id']+' — '+c['name']) for c in cases)+'\n\n## Evidencia de código\n\n'
        content+='\n'.join('- '+link(ficha,ROOT/s,s) for s in sources)+'\n\n## Notación y lectura\n\nAsociaciones sin flecha de flujo. No se usa include/extend: autenticarse es precondición y las acciones agrupadas son variantes, no inclusiones obligatorias ni extensiones demostradas. La vista general selecciona objetivos representativos; el catálogo contiene el alcance completo.\n'
        if id=='DIA-TG-040': content+='\nTesis especializa la conclusión común UC-POS-008 mediante generalización; el padre es una referencia, no un caso nuevo. Las guardas de ACTA_DEFENSA y etapas propias permanecen en la política de Tesis.\n'
        write(ficha,content)
    write('diagramas/registro-fase-4.json',json.dumps(registry,ensure_ascii=False,indent=2))
    write('03-casos-de-uso/registro-fase-4.json',json.dumps(CASES,ensure_ascii=False,indent=2))
    doc='diagramas/registro-fase-4.md'
    text='# Registro UML de casos de uso — fase 4\n\n17 vistas nuevas, 75 objetivos cubiertos; las 52 fuentes de fase 3 permanecen intactas. La vista general es selectiva y no reemplaza las vistas modulares.\n\n| ID | Nombre | Fuente | Ficha | SVG |\n| --- | --- | --- | --- | --- |\n'
    for d in registry: text+=f"| {d['id']} | {d['title']} | {link(doc,BASE/d['source'],'PlantUML')} | {link(doc,BASE/d['description'],'Ficha')} | {link(doc,BASE/d['svg'],'SVG')} |\n"
    write(doc,text)
    return registry


def review():
    doc='00-alcance-y-evidencia/revision-fase-4.md'
    old=json.loads((BASE/'diagramas/registro-fase-3.json').read_text(encoding='utf-8'))
    text=f'''# Revisión preliminar y conciliación — fase 4

Versión: {VERSION}. Fuente de verdad: directorio de trabajo, no solo HEAD. Se revisaron el índice maestro, los 52 registros de fase 3 con sus fuentes y fichas, los 23 candidatos originales, permisos, vistas, serializers, servicios y pruebas referenciadas. Las huellas previas están en [estado-fase-4.json](estado-fase-4.json).

## Resultado de coherencia

Se confirman 75 objetivos: los 23 candidatos preservados y 52 desgloses u omisiones incorporados. No son 75 endpoints diferentes: varios objetivos tienen variantes y Tesis especializa la conclusión común. Los 52 diagramas anteriores describen estructura y persistencia; los nuevos diagramas describen interacción. No se modifican fuentes, fichas, SVG ni estilo de fase 3.

La clasificación inicial necesitaba separar autenticación, rol, propiedad, asignación y cargo académico. Las diferencias COMMON/RELATED/DEFENSE_READ se explicitan en la matriz. El backend no concede escritura académica a todo docente o participante. No se confirmó actor de sistema externo.

## Revisión de las 52 vistas

Cada fila acredita revisión documental del registro, fuente y ficha; no revalida esquema físico instalado ni ejecución de la aplicación. La comprobación automática conserva las 158 huellas protegidas.

| Vista | Tipo | Resultado |
| --- | --- | --- |
'''
    for d in old: text+=f"| {d['id']} | {d['type']} | Revisada; conservada sin edición; {link(doc,BASE/d['description'],'ficha existente')} |\n"
    text+='\n## Conciliación de los 23 candidatos\n\nLos IDs originales se conservan aunque se precise el nombre. Los nuevos objetivos separan consulta, autenticación alternativa, escritura o cierre donde el permiso o resultado cambia.\n\n| ID conservado | Precisión de alcance |\n| --- | --- |\n'
    for c in CASES[:23]: text+=f"| {c['id']} | {c['name']}; {link(doc,BASE/spec_path(c),'especificación')} |\n"
    text+='''
Los agregados de autenticación se dividen en login, login estudiantil, refresh, logout y consulta de sesión. Periodos/requisitos se separan de modalidades, cuyo create/destroy está rechazado. Trabajo Dirigido separa institución, informe, consulta y conclusión; Examen, Excelencia y Diplomado conservan sus operaciones y políticas. Tesis es especialización de conclusión, no duplicación del endpoint. Históricos, intentos, dictámenes, observaciones, entregas, lectura documental y notificaciones mutables antes no tenían ficha propia.

## Contradicciones y pendientes

1. ADMINISTRACION e is_staff no equivalen a administración funcional. La interfaz puede diferir del conjunto aceptado por IsAuthenticated.
2. Marcar observación documental como corregida exige administración; no atribuir esa acción al propietario estudiante.
3. Los memorandos/versiones se filtran por publicación y vigencia; el vínculo al expediente no basta para ver todos los archivos.
4. PATCH de estado general y conclusión por workflow tienen validaciones distintas. No se corrige ni se declara equivalencia normativa.
5. ConfirmacionCorreccionDocumentoViewSet hereda PUT/PATCH/DELETE; no se extrapola la validación de create a esas rutas. Pendiente caracterización sin datos reales.
6. Examen y Diplomado pueden inicializar estructuras en overview; lectura lógica no significa ausencia de toda persistencia auxiliar.
7. Logout no verifica explícitamente propiedad del refresh en la vista; contrato pendiente de prueba aislada. No se afirma explotación ni se opera una sesión real.

No se documentan como flujos confirmados las consultas stub con NotImplementedError, baja sin ruta HTTP confirmada ni funcionalidades propuestas por backlog. PUT/PATCH normal de PostulacionViewSet existe mediante serializer; no se declara bloqueado. Las variantes no caracterizadas de esa edición quedan pendientes de desglose, además de las operaciones confirmadas de estado general.

## Límites de evidencia

Análisis estático y referencias a archivos de pruebas; no ejecución de pruebas del producto, PostgreSQL, migraciones o credenciales. No certifica cobertura por escenario, normativa académica vigente, datos instalados ni producción. Los diagramas funcionales describen autorización actual incluso cuando plantea una discrepancia que merezca revisión posterior.
'''
    write(doc,text)
    status=SNAP.get('status','')
    write('00-alcance-y-evidencia/referencia-fase-4.md',f'''# Referencia de versión — fase 4

- HEAD: `{SNAP['head']}`.
- Rama: `{SNAP['rama']}`.
- Fecha documental: 2026-11-02, America/La_Paz.
- Estado analizado: directorio de trabajo con modificaciones preexistentes, sin descartarlas ni confirmarlas.
- [Snapshot completo de Git y huellas](estado-fase-4.json).
- [Referencia de fase 3](referencia-fase-3.md).

HEAD y rama coinciden con fase 3. Se registraron 1754 huellas de archivos exteriores a docs/ingenieria y 158 huellas protegidas de fase 3. La validación final comprueba su conservación. La diferencia local de antelación de defensa pública de Proyecto (48 en HEAD, 0 en trabajo) ya existía y no se modifica ni se avala normativamente.

El snapshot conserva el listado completo de cambios locales, incluidos archivos temporales, auditorías de backups, frontend y el propio árbol documental no seguido. La entrega añade únicamente documentación bajo docs/ingenieria. No hubo commits, push ni alteraciones funcionales.
''')


def indexes(registry):
    p=BASE/'diagramas/README.md'
    t=p.read_text(encoding='utf-8')
    t=t.replace('| DIA-SYS-001 | Casos de uso | PENDIENTE, fuera de fase 3 |\n','')
    if '## Casos de uso de fase 4' not in t: t+='\n## Casos de uso de fase 4\n\n[17 vistas funcionales y sus fuentes](registro-fase-4.md). El identificador reservado de vista general se materializa en este registro. Las 52 vistas anteriores conservan fuentes, fichas y renderizados.\n'
    write('diagramas/README.md',t)
    p=BASE/'README.md'; t=p.read_text(encoding='utf-8')
    t=t.replace('Fases 2 y 3 · 2026-11-01','Fases 2, 3 y 4 · 2026-11-02')
    t=t.replace(', sin ejecución autorizada.', ', antecedente de planificación.')
    if '## Entrega de fase 4' not in t:
        pos=t.index('## Entrega de fase 3')
        t=t[:pos]+'''## Entrega de fase 4

- [75 casos de uso y especificaciones](03-casos-de-uso/README-fase-4.md).
- [Actores, roles y participantes](02-actores-permisos/actores-fase-4.md).
- [Matriz de permisos por operación](02-actores-permisos/matriz-fase-4.md).
- [17 diagramas de casos de uso](diagramas/registro-fase-4.md).
- [Trazabilidad vigente](10-trazabilidad-y-validacion/matriz-fase-4.md).
- [Revisión preliminar](00-alcance-y-evidencia/revision-fase-4.md) y [referencia Git](00-alcance-y-evidencia/referencia-fase-4.md).
- [Validación y recomendaciones para fase 5](10-trazabilidad-y-validacion/validacion-fase-4.md).

'''+t[pos:]
    write('README.md',t)
    for name,note in [
      ('02-actores-permisos/README.md','La clasificación inicial se conserva como antecedente. Consultar el [catálogo confirmado de fase 4](actores-fase-4.md) y la [matriz por operación](matriz-fase-4.md).'),
      ('10-trazabilidad-y-validacion/matriz.md','Matriz histórica de los 23 candidatos de fase 2: se conservan sus IDs. La [matriz vigente de fase 4](matriz-fase-4.md) refina objetivos, permisos y reglas sin borrar este antecedente.'),
      ('10-trazabilidad-y-validacion/identificadores.md','Fase 4: ACT identifica actores funcionales en el [registro canónico](../02-actores-permisos/actores-fase-4.md); UC/FUN mantienen los 23 IDs y amplían a 75. RN de la serie 100+ registra 75 reglas observadas sin reutilizar los RN iniciales. DIA de fase 4 se registra en [su índice](../diagramas/registro-fase-4.md).'),
      ('diagramas/convenciones-uml.md','Fase 4: asociaciones actor–objetivo sin flechas de flujo; generalización con triángulo al actor o caso general. No se utiliza include/extend sin dependencia obligatoria o extensión condicional demostrada. Autenticación como precondición. Cargos académicos separados de actores API. Los perfiles y variantes HTTP se detallan fuera del dibujo para mantener legibilidad.'),
    ]:
        p=BASE/name;t=p.read_text(encoding='utf-8')
        if note not in t: write(name,t+'\n## Actualización de fase 4\n\n'+note)
    old=json.loads((BASE/'diagramas/registro-fase-3.json').read_text(encoding='utf-8'))
    cards=[]
    for d in old+registry:
        svg=d.get('svg','diagramas/renderizados/'+Path(d['source']).stem+'.svg')
        rel=lambda path:os.path.relpath(BASE/path,BASE/'diagramas/renderizados').replace('\\','/')
        cards.append(f'<article><h2>{html.escape(d["id"]+" — "+d["title"])}</h2><p>{html.escape(d["type"])}</p><a href="{rel(svg)}"><img loading="lazy" src="{rel(svg)}" alt="{html.escape(d["title"])}"></a><p><a href="{rel(d["source"])}">PlantUML</a> · <a href="{rel(d["description"])}">Ficha</a> · <a href="{rel(svg)}">SVG</a></p></article>')
    write('diagramas/renderizados/index.html','''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Galería UML — fases 3 y 4</title><style>body{font:16px system-ui;margin:2rem;color:#175554;background:#f8fafc}input{padding:.8rem;width:min(90%,50rem)}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:1rem}article{background:white;border:1px solid #cbd5e1;padding:1rem;min-width:0}img{width:100%;height:360px;object-fit:contain}h2{font-size:1rem}a{color:#1d4ed8}</style><h1>Galería UML — 69 vistas</h1><p>52 vistas de arquitectura/modelos y 17 de casos de uso. Abrir SVG para ampliar. Sin recursos externos.</p><label>Buscar <input id="q" type="search" placeholder="Identificador, título o tipo"></label><p id="count">69 vistas</p><main>'''+''.join(cards)+'''</main><script>const q=document.querySelector('#q');q.addEventListener('input',()=>{let n=0;document.querySelectorAll('article').forEach(a=>{a.hidden=!a.textContent.toLowerCase().includes(q.value.toLowerCase());if(!a.hidden)n++});document.querySelector('#count').textContent=n+' vistas'});</script></html>''')


def main():
    validate_data()
    specifications()
    catalogs()
    actors_permissions()
    registry=diagrams()
    review()
    indexes(registry)
    print(json.dumps({'casos':len(CASES),'actores':len(ACTORS),'diagramas':len(registry)},ensure_ascii=False))


if __name__=='__main__': main()
