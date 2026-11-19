"""Construcción documental por AST. No importa Django ni consulta la base de datos.

Escribe exclusivamente bajo docs/ingenieria/. Mantiene una fotografía inicial.
Las fuentes generadas requieren validación PlantUML local independiente.
"""
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

BASE = Path(__file__).resolve().parents[1]
ROOT = BASE.parents[1]
REGISTRY = []
MODELS = {}
CLASSES = {}


def write(path, content):
    target = (BASE / path).resolve()
    assert target.is_relative_to(BASE)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.rstrip() + "\n", encoding="utf-8")


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8")


def expression(node):
    return ast.unparse(node) if node is not None else ""


def literal(node, default=None):
    try:
        return ast.literal_eval(node)
    except (ValueError, TypeError):
        return default


def parse(path):
    text = (ROOT / path).read_text(encoding="utf-8-sig")
    tree = ast.parse(text)
    module_name = path.removesuffix(".py").replace("/", ".")
    local_classes = {node.name for node in tree.body if isinstance(node, ast.ClassDef)}
    imports = {}
    for imp in ast.walk(tree):
        if isinstance(imp, ast.ImportFrom):
            for name in imp.names:
                imports[name.asname or name.name] = (imp.module or "") + "." + name.name
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        key = module_name + "." + node.name
        data = {"key": key, "name": node.name, "path": path, "line": node.lineno,
                "bases": [imports.get(expression(b), module_name + "." + expression(b) if expression(b) in local_classes else expression(b)) for b in node.bases],
                "fields": [], "methods": [], "constraints": [], "indexes": [], "attrs": []}
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                args = [a.arg for a in item.args.posonlyargs + item.args.args + item.args.kwonlyargs if a.arg not in {"self", "cls"}]
                if item.args.vararg:
                    args.append("*" + item.args.vararg.arg)
                if item.args.kwarg:
                    args.append("**" + item.args.kwarg.arg)
                data["methods"].append({"name": item.name, "args": args, "line": item.lineno})
            if isinstance(item, (ast.Assign, ast.AnnAssign)):
                target = item.targets[0] if isinstance(item, ast.Assign) else item.target
                if not isinstance(target, ast.Name):
                    continue
                value = item.value
                callable_value = value
                if isinstance(value, ast.Call) and expression(value.func) in {"staticmethod", "classmethod"} and value.args:
                    callable_value = value.args[0]
                if isinstance(callable_value, ast.Lambda):
                    args = [a.arg for a in callable_value.args.posonlyargs + callable_value.args.args + callable_value.args.kwonlyargs if a.arg not in {"self", "cls"}]
                    data["methods"].append({"name": target.id, "args": args, "line": item.lineno, "alias_callable": True})
                    continue
                data["attrs"].append({"name": target.id, "value": expression(value), "annotation": expression(getattr(item, "annotation", None))})
                if isinstance(value, ast.Call) and expression(value.func).startswith("models.") and expression(value.func).endswith("Field") or isinstance(value, ast.Call) and expression(value.func) in {"models.ForeignKey"}:
                    typ = expression(value.func).split(".")[-1]
                    kw = {a.arg: a.value for a in value.keywords}
                    rel = typ in {"ForeignKey", "OneToOneField", "ManyToManyField"}
                    to = expression(value.args[0]) if rel and value.args else ""
                    if rel and value.args:
                        to = literal(value.args[0], to)
                        to = "usuarios.CustomUser" if to == "settings.AUTH_USER_MODEL" else to
                        to = imports.get(to, to)
                    field = {"name": target.id, "type": typ, "null": literal(kw.get("null"), False),
                             "unique": literal(kw.get("unique"), False), "pk": literal(kw.get("primary_key"), False),
                             "target": to, "kwargs": {k: expression(v) for k, v in kw.items()}, "line": item.lineno}
                    if typ in {"ForeignKey", "OneToOneField"} and "on_delete" not in kw and len(value.args) > 1:
                        field["kwargs"]["on_delete"] = expression(value.args[1])
                    data["fields"].append(field)
            if isinstance(item, ast.ClassDef) and item.name == "Meta":
                for assign in item.body:
                    if isinstance(assign, ast.Assign):
                        name = expression(assign.targets[0])
                        if name in {"constraints", "indexes"} and isinstance(assign.value, (ast.List, ast.Tuple)):
                            data[name] = [expression(v) for v in assign.value.elts]
        CLASSES[key] = data
        if path.endswith("/models.py") and path.startswith("apps/"):
            MODELS[node.name] = data


def target_name(field):
    value = field["target"]
    name = value.split(".")[-1]
    assert name in MODELS, (field, name)
    return name


def safe(text):
    return text.replace('"', "'").replace("\n", " ")


def diagram(identifier, slug, title, kind, goal, body, sources, elements, limits, evidence=None):
    stem = identifier + "-" + slug
    source = "diagramas/fuentes/" + stem + ".puml"
    description = "diagramas/fichas/" + stem + ".md"
    version = SNAP["head"][:12] + " / " + SNAP["rama"] + " / directorio de trabajo"
    metadata = {"id": identifier, "title": title, "type": kind, "goal": goal, "scope": elements,
                "sources": sorted(set(sources)), "version": version, "limitations": limits,
                "source": source, "description": description, "evidence": evidence or {}}
    header = ["@startuml " + stem, "' ID: " + identifier, "' Fecha: 2026-11-01 America/La_Paz", "' Objetivo: " + goal,
              "' Alcance y elementos: " + elements, "' Version: " + version,
              "' Limitaciones: " + limits] + ["' Fuente: " + s for s in metadata["sources"]]
    header += ["!include ../estilos/base.puml.inc", 'title ' + identifier + " — " + title,
               "footer " + version + " | lógico derivado del código / infraestructura declarada",
               "legend bottom left", "  Referencia externa = definición abreviada; no duplica entidad.",
               "  No se ha inspeccionado PostgreSQL ni el despliegue en ejecución.", "endlegend"]
    write(source, "\n".join(header) + "\n" + body + "\n@enduml")
    def link(path, label):
        return "[" + label + "](" + os.path.relpath(ROOT / path, (BASE / description).parent).replace("\\", "/") + ")"
    text = "# " + identifier + " — " + title + "\n\n"
    text += "## Objetivo y alcance\n\n" + goal + "\n\nTipo: " + kind + ". Elementos: " + elements + ".\n\n"
    text += "## Fuentes y versión\n\nVersión: " + version + ". [Fotografía](../../00-alcance-y-evidencia/referencia-fase-3.md).\n\n"
    text += "\n".join("- " + link(p, p) for p in metadata["sources"])
    text += "\n\n## Lectura y limitaciones\n\n" + limits + "\n\n[Fuente PlantUML](../fuentes/" + stem + ".puml). "
    if (BASE / "diagramas/renderizados" / (stem + ".svg")).is_file():
        text += "[SVG local](../renderizados/" + stem + ".svg). Validación y revisión visual en el [informe](../../10-trazabilidad-y-validacion/validacion-fase-3.md).\n"
    else:
        text += "SVG pendiente de renderizado local.\n"
    write(description, text)
    REGISTRY.append(metadata)


GROUPS = [
    ("USR", "usuarios", ["Role", "CustomUser", "AuditLog", "StudentLoginThrottle"]),
    ("ACA", "academico", ["Periodo", "Modalidad", "DocumentoOficialModalidad", "EtapaModalidad", "Requisito", "ModalidadRequisito"]),
    ("POS", "postulaciones", ["EstadoPostulacion", "Postulacion", "HistorialEstado", "Observacion"]),
    ("POS", "etapas", ["SeguimientoEtapa"]),
    ("POS", "asignaciones-decisiones", ["AsignacionPostulacion", "DecisionAcademicaEtapa", "ParticipacionDecisionAcademica", "PublicacionMemorandumDesignacion"]),
    ("POS", "condiciones-entregas", ["CondicionPostulacion", "EntregaFisica"]),
    ("POS", "defensas-evaluaciones", ["EventoDefensa", "ParticipanteEvento", "EvaluacionDefensa"]),
    ("POS", "dictamenes", ["DictamenRevisionDocumento", "InformeRevisionTribunalPrevia"]),
    ("DOC", "documentos-versiones", ["EstadoDocumento", "TipoDocumento", "DocumentoPostulacion", "VersionDocumento"]),
    ("DOC", "observaciones-correcciones", ["ObservacionDocumento", "ConfirmacionCorreccionDocumento"]),
    ("NOT", "notificaciones", ["Notificacion"]),
    ("EG", "examen", ["ExamenArea", "ExamenEvaluacion"]),
    ("EA", "excelencia", ["ExcelenciaExpediente"]),
    ("DIP", "diplomado", ["DiplomadoModulo", "DiplomadoDefensa"]),
    ("TD", "trabajo-dirigido", ["TrabajoDirigidoExpediente", "InformeSeguimientoTrabajoDirigido"]),
]


def model_view(scope, slug, own, number, er=False):
    relations = []
    neighbors = set()
    for name in own:
        for field in MODELS[name]["fields"]:
            if field["target"]:
                target = target_name(field)
                neighbors.add(target)
                relations.append((name, field, target))
    body = ["left to right direction"]
    for name in own + sorted(neighbors - set(own)):
        model = MODELS[name]
        ref = name not in own
        body.append(('entity' if er else 'class') + ' "' + name + '" as ' + name + (' <<referencia>>' if ref else ' <<entidad>>') + ' {')
        body.append('  id : BigAutoField <<PK derivada>>')
        if not ref:
            scalars = [f for f in model["fields"] if not f["target"]]
            selected = [f for f in model["fields"] if f["target"]] + scalars[:5]
            for f in selected:
                markers = (" <<FK>>" if f["target"] and f["type"] != "ManyToManyField" else " <<M2M>>" if f["target"] else "")
                markers += " <<UQ>>" if f["unique"] or f["type"] == "OneToOneField" else ""
                markers += " <<NULL>>" if f["null"] else ""
                label = f["name"] + ("_id" if er and f["target"] and f["type"] != "ManyToManyField" else "")
                body.append("  " + label + " : " + f["type"] + markers)
            if not er:
                for method in [m for m in model["methods"] if m["name"] in {"clean", "save", "nombre_completo"}][:3]:
                    body.append("  +" + method["name"] + "(" + ", ".join(method["args"]) + ")")
        body.append("}")
    for name, f, target in relations:
        left = "0..*"
        right = "0..1" if f["null"] else "1"
        if f["type"] == "OneToOneField" or f["unique"]:
            left = "0..1"
        if f["type"] == "ManyToManyField":
            right = "0..*"
        if er:
            many = "}o" if left == "0..*" else "|o"
            parent = "o|" if right == "0..1" else "o{" if right == "0..*" else "||"
            body.append(name + " " + many + "--" + parent + " " + target + " : " + f["name"])
        else:
            body.append(name + ' "' + left + '" -- "' + right + '" ' + target + " : " + f["name"])
    if er:
        for name in own:
            constraints = MODELS[name]["constraints"]
            if not constraints:
                continue
            body.append("note bottom of " + name)
            body.append("Restricciones seleccionadas de Meta:")
            for raw in constraints[:2]:
                call = ast.parse(raw, mode="eval").body
                kw = {k.arg: k.value for k in call.keywords}
                fields = literal(kw.get("fields"), [])
                if "UniqueConstraint" in raw:
                    body.append("UQ(" + ", ".join(fields) + ")")
                    if "condition" in kw:
                        body.append("condicional; no equivale a UQ global")
                else:
                    body.append("CHECK: " + str(literal(kw.get("name"), "ver diccionario")))
            if len(constraints) > 2:
                body.append("Más restricciones: ver diccionario completo.")
            body.append("end note")
    sources = [MODELS[n]["path"] for n in own] + ["core/models.py", "core/settings/base.py"]
    limits = "Vista lógica, no esquema instalado. PK id derivada de DEFAULT_AUTO_FIELD; campos comunes heredados y atributos escalares no mostrados se detallan en el diccionario. Referencias externas abreviadas. Cardinalidades estructurales por null/OneToOne/unique; restricciones condicionales y clean no alteran esos máximos. No se afirma composición UML ni obligatoriedad de colección M2M por blank=False."
    if "CustomUser" in own:
        limits += " Campos y M2M heredados de AbstractUser se separan en la vista de autenticación."
    if "PublicacionMemorandumDesignacion" in own:
        limits += " asignaciones es M2M con intermediaria implícita, sin nombre físico certificado."
    diagram("DIA-" + scope + "-" + str(number).zfill(3), slug + ("-er" if er else "-clases"),
            ("ER lógico: " if er else "Clases de dominio: ") + slug, "ER lógico" if er else "Clases",
            "Mostrar entidades, relaciones y opcionalidad de " + slug, "\n".join(body), sources, ", ".join(own), limits,
            {"models": own, "relationships": [{"source": n, "field": f["name"], "target": t, "type": f["type"], "null": f["null"], "unique": f["unique"]} for n, f, t in relations]})


def class_view(identifier, slug, keys, goal):
    own = {k: CLASSES[k] for k in keys}
    names = {c["key"]: c["name"] for c in own.values()}
    refs = {}
    for c in own.values():
        for base in c["bases"]:
            if base in CLASSES and base not in own:
                refs[base] = CLASSES[base]
    body = ["left to right direction"]
    all_classes = dict(own, **refs)
    for key, c in all_classes.items():
        name = c["name"]
        kind = "referencia" if key in refs else "politica" if "Policy" in name else "servicio" if "Service" in name or "Publisher" in name else "clase"
        body.append('class "' + name + '" as ' + name + ' <<' + kind + '>> {')
        if key in own:
            for a in c["attrs"][:4]:
                body.append("  " + a["name"] + (" : " + safe(a["annotation"]) if a["annotation"] else ""))
            methods = [m for m in c["methods"] if not m["name"].startswith("_")]
            selected = [m for m in methods if not m.get("alias_callable")][:6] + [m for m in methods if m.get("alias_callable")]
            for m in selected:
                body.append("  +" + m["name"] + "(" + ", ".join(m["args"]) + ")")
        body.append("}")
    for key, c in own.items():
        for base in c["bases"]:
            if base in all_classes:
                body.append(all_classes[base]["name"] + " <|-- " + c["name"])
        for a in c["attrs"]:
            match = re.match(r"^(\w+)\(\)$", a["value"])
            if match and match[1] in {d["name"] for d in all_classes.values()}:
                body.append(c["name"] + " --> " + match[1] + " : " + a["name"])
            for candidate in all_classes.values():
                if candidate["key"] != key and re.search(r"\b" + candidate["name"] + r"\b", a["annotation"]):
                    body.append(c["name"] + " ..> " + candidate["name"] + " : tipo de " + a["name"])
    diagram(identifier, slug, "Clases: " + slug, "Clases de diseño", goal, "\n".join(body),
            [c["path"] for c in all_classes.values()], ", ".join(c["name"] for c in own.values()),
            "Operaciones seleccionadas de las declaradas en código; no representa toda la API pública ni secuencia de ejecución. Referencias externas abreviadas. Herencia explícita en AST; asociaciones por instanciación en atributos y dependencias por anotación de tipo. No se presume igualdad académica por herencia.",
            {"classes": keys})


def main():
    global SNAP
    snapshot_path = BASE / "00-alcance-y-evidencia/estado-fase-3.json"
    if not snapshot_path.exists():
        paths = set(git("ls-files", "-z").split("\0") + git("ls-files", "--others", "--exclude-standard", "-z").split("\0"))
        hashes = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in sorted(paths)
                  if p and not p.startswith("docs/ingenieria/") and (ROOT / p).is_file()}
        snap = {"fecha": "2026-11-01", "zona": "America/La_Paz", "head": git("rev-parse", "HEAD").strip(),
                "rama": git("branch", "--show-current").strip(),
                "status": git("-c", "core.quotePath=false", "status", "--short", "--untracked-files=all").splitlines(),
                "diff_funcional": git("diff", "--", "apps/modalidades/proyecto_grado.py"), "sha256_fuera_documentacion": hashes}
        write("00-alcance-y-evidencia/estado-fase-3.json", json.dumps(snap, ensure_ascii=False, indent=2))
    SNAP = json.loads(snapshot_path.read_text(encoding="utf-8"))
    assert git("rev-parse", "HEAD").strip() == SNAP["head"], "HEAD cambió; registrar una nueva revisión documental antes de regenerar"
    for name, digest in SNAP["sha256_fuera_documentacion"].items():
        path = ROOT / name
        assert path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == digest, "Fuente cambió: " + name + "; registrar nueva revisión antes de regenerar"
    for path in ROOT.glob("apps/*/models.py"):
        parse(path.relative_to(ROOT).as_posix())
    paths = ["core/models.py", "apps/modalidades/policies.py", "apps/modalidades/proyecto_grado.py",
             "apps/modalidades/tesis_grado.py", "apps/modalidades/trabajo_dirigido.py", "apps/modalidades/examen_grado.py",
             "apps/modalidades/excelencia_academica.py", "apps/modalidades/diplomado.py", "apps/postulantes/services.py",
             "apps/postulantes/workflow.py", "apps/postulantes/asignaciones.py", "apps/postulantes/decisiones_academicas.py",
             "apps/postulantes/cierre.py", "apps/postulantes/defensas.py", "apps/documentos/services.py",
             "apps/notificaciones/events.py", "apps/notificaciones/services.py", "apps/usuarios/views.py",
             "apps/usuarios/services.py", "core/permissions.py", "apps/modalidades/examen_grado_service.py",
             "apps/modalidades/excelencia_academica_service.py", "apps/modalidades/diplomado_service.py",
             "apps/modalidades/trabajo_dirigido_service.py"]
    for path in paths:
        parse(path)
    write("diagramas/estilos/base.puml.inc", "\n".join([
        "skinparam backgroundColor white", "skinparam defaultFontName SansSerif", "skinparam defaultFontSize 13",
        "skinparam shadowing false", "skinparam classAttributeIconSize 0",
        "skinparam ArrowColor #334155", "skinparam classBackgroundColor #EFF6FF",
        "skinparam classBackgroundColor<<referencia>> #F1F5F9", "skinparam classBackgroundColor<<politica>> #ECFDF5",
        "skinparam componentBackgroundColor #EFF6FF", "skinparam packageStyle rectangle"]))
    seen = []
    counters = {}
    for scope, slug, own in GROUPS:
        seen += own
        counters[scope] = counters.get(scope, 0) + 1
        model_view(scope, slug, own, counters[scope], False)
        model_view(scope, slug, own, counters[scope] + 100, True)
    assert len(seen) == len(set(seen)) == len(MODELS) == 40
    class_view("DIA-SYS-002", "modelo-base", ["core.models.BaseModel"], "Identificar atributos comunes heredados sin crear una tabla BaseModel")
    policy_paths = {"PG": "proyecto_grado", "TG": "tesis_grado", "TD": "trabajo_dirigido", "EG": "examen_grado", "EA": "excelencia_academica", "DIP": "diplomado"}
    for scope, stem in policy_paths.items():
        keys = [k for k, c in CLASSES.items() if c["path"] == "apps/modalidades/" + stem + ".py"]
        class_view("DIA-" + scope + "-020", "politicas-" + stem, keys, "Mostrar especialización propia de " + scope + " y herencias explícitas")
    class_view("DIA-MOD-001", "contratos-politicas", [k for k, c in CLASSES.items() if c["path"] == "apps/modalidades/policies.py" and c["name"] in {"BaseModalidadPolicy", "BaseEventoPolicy", "BaseEvaluacionPolicy", "BaseRequisitosPolicy", "BaseCierrePolicy", "BaseRevisionTribunalPreviaPolicy", "ModalidadPolicyRegistry", "EtapaDefinition", "DecisionAcademicaDefinition", "ModalidadCapabilities"}], "Mostrar contratos de extensión sin atribuir a todas las modalidades las reglas de Proyecto")
    service_groups = {
        "DIA-POS-020": ("servicios-expediente", ["PostulacionService", "WorkflowService", "AsignacionService", "DecisionAcademicaEtapaService"]),
        "DIA-POS-021": ("servicios-defensa-cierre", ["EventoDefensaService", "EvaluacionDefensaService", "CierrePostulacionService", "ProyectoGradoCierrePolicy"]),
        "DIA-DOC-020": ("servicios-documentales", ["DocumentoService", "ConfirmacionCorreccionDocumentoService"]),
        "DIA-NOT-020": ("servicios-eventos-notificaciones", ["DomainEvent", "DomainEventPublisher", "NotificationRecipientResolver", "NotificationService"]),
        "DIA-USR-020": ("autenticacion-autorizacion", ["CustomTokenObtainPairView", "CustomTokenRefreshView", "StudentTokenObtainPairView", "LogoutView", "MeView", "UserCapabilitiesService", "IsActiveUser", "IsStaff"]),
        "DIA-EG-021": ("servicio-examen", ["ExamenGradoService"]),
        "DIA-EA-021": ("servicio-excelencia", ["ExcelenciaAcademicaService"]),
        "DIA-DIP-021": ("servicio-diplomado", ["DiplomadoService"]),
        "DIA-TD-021": ("servicio-trabajo-dirigido", ["TrabajoDirigidoService"]),
    }
    for identifier, (slug, names) in service_groups.items():
        keys = [k for k, c in CLASSES.items() if c["name"] in names]
        assert len(keys) == len(names), names
        class_view(identifier, slug, keys, "Separar servicios, entrada API y políticas; solo operaciones verificadas")
    write("04-dominio-y-datos/modelo-logico-fase-3.json", json.dumps(MODELS, ensure_ascii=False, indent=2))
    dictionary()
    architecture()
    supplements()
    write("diagramas/registro-fase-3.json", json.dumps(REGISTRY, ensure_ascii=False, indent=2))
    index()
    print(json.dumps({"diagramas": len(REGISTRY), "entidades": len(MODELS)}, ensure_ascii=False))


def dictionary():
    text = "# Diccionario lógico derivado del código — fase 3\n\n"
    text += "Estado: IMPLEMENTADO en modelos; no esquema físico instalado. Fuente completa: [extracción AST](modelo-logico-fase-3.json).\n\n"
    text += "Todos los modelos propios heredan BaseModel (created_at, updated_at, activo) y una PK id BigAutoField implícita según DEFAULT_AUTO_FIELD. No se mezclan blank (validación de formularios) y null (persistencia). ManyToMany no es una columna FK del propietario. Restricciones condicionales no se convierten en unicidad global.\n\n"
    text += "CustomUser hereda AbstractUser: atributos y M2M del framework se señalan aparte. Las tablas de Django y SimpleJWT no son parte del inventario propio de 40 entidades. Su esquema físico, nombres efectivos e instalación no se certifican.\n\n"
    for name, c in MODELS.items():
        source = os.path.relpath(ROOT / c["path"], BASE / "04-dominio-y-datos").replace("\\", "/")
        text += "## " + name + "\n\n[Fuente](" + source + "), clase " + name + ", línea " + str(c["line"]) + ".\n\n"
        text += "| Campo | Tipo | NULL | Único | Destino | Opciones exactas del modelo |\n| --- | --- | --- | --- | --- | --- |\n"
        for f in c["fields"]:
            text += "| " + " | ".join([f["name"], f["type"], str(f["null"]), str(f["unique"] or f["type"] == "OneToOneField"), f["target"] or "—", str(f["kwargs"]).replace("|", " OR ")]) + " |\n"
        text += "\nRestricciones declaradas:\n\n"
        text += "\n".join("- " + x for x in c["constraints"]) if c["constraints"] else "Sin constraints adicionales en Meta; revisar unique de campos y validaciones clean."
        text += "\n\nÍndices declarados:\n\n" + ("\n".join("- " + x for x in c["indexes"]) if c["indexes"] else "Sin índices explícitos adicionales en Meta.") + "\n\n"
    write("04-dominio-y-datos/diccionario-fase-3.md", text)


def architecture():
    # Vistas curadas: solo dependencias respaldadas por puntos de entrada y servicios.
    diagram("DIA-SYS-006", "componentes-general", "Componentes generales", "Componentes", "Situar SPA, API, seguridad, dominio y almacenamiento", r'''
component "React SPA\nCMP-WEB-001" as Web
package "Backend Django REST Framework" {
 component "Rutas / APIViews / ViewSets" as API
 component "JWT / permisos / alcance\nCMP-USR-001" as Auth
 component "Servicios de expediente\nCMP-POS-001" as Pos
 component "Registro y políticas\nCMP-MOD-001" as Mod
 component "Documentos\nCMP-DOC-001" as Doc
 component "Catálogos académicos\nCMP-ACA-001" as Acad
 component "Reportes\nCMP-REP-001" as Rep
 component "Eventos y notificaciones\nCMP-NOT-001" as Not
 component "ORM Django" as ORM
}
database "PostgreSQL" as DB
folder "media / FileField" as Media
Web --> API : HTTP / JSON / multipart / Bearer
API --> Auth : autenticación y autorización
API --> Pos
API --> Doc
API --> Rep
API --> Acad
API --> Not : consulta y lectura de notificaciones
Pos --> Acad : entidades académicas
Acad --> ORM
Pos --> Mod : validaciones específicas
Doc --> Mod : documentos / actores / contexto
Pos --> Not : publicar después del commit
Doc --> Not : publicar después del commit
Pos --> ORM
Doc --> ORM
Not --> ORM
Rep --> ORM
ORM --> DB : psycopg2
Doc --> Media : guardar / leer archivos
''', ["core/urls.py", "core/settings/base.py", "src/services/api.js", "apps/postulantes/workflow.py", "apps/documentos/services.py", "apps/notificaciones/events.py", "apps/reportes/services.py"], "SPA, seguridad, dominio, políticas, ORM y archivos", "Vista general selectiva: las dependencias no son una secuencia ni servicios desplegables separados. No hay broker externo demostrado. FileField representa rutas/archivos, no BLOB PostgreSQL.")
    diagram("DIA-MOD-002", "componentes-motor", "Motor y modalidades", "Componentes", "Mostrar resolución explícita de políticas y límites de reutilización", r'''
component "WorkflowService" as WF
component "DocumentoService" as DS
component "EventoDefensaService / EvaluacionDefensaService" as EV
component "ModalidadPolicyRegistry" as REG
package "Políticas registradas en ModalidadesConfig.ready" {
 component "Proyecto de Grado" as PG
 component "Tesis de Grado" as TG
 component "Trabajo Dirigido" as TD
 component "Examen de Grado" as EG
 component "Excelencia Académica" as EA
 component "Vía Diplomado" as DIP
}
WF --> REG
DS --> REG
EV --> REG
REG ..> PG : registro explícito
REG ..> TG : registro explícito
REG ..> TD : registro explícito
REG ..> EG : registro explícito
REG ..> EA : registro explícito
REG ..> DIP : registro explícito
TD ..> PG : importa clases específicas\nno comparte identidad normativa
''', ["apps/modalidades/apps.py", "apps/modalidades/policies.py", "apps/modalidades/trabajo_dirigido.py", "apps/postulantes/workflow.py", "apps/documentos/services.py", "apps/postulantes/defensas.py"], "Motor común y seis políticas", "Las flechas de registro no implican invocación simultánea de modalidades. No existe política académica de respaldo para códigos sin registro.")
    diagram("DIA-SYS-007", "despliegue-docker", "Despliegue Docker de desarrollo declarado", "Despliegue", "Separar navegador, publicaciones de puertos, red implícita y volúmenes", r'''
node "Host local / Docker Engine" as Host {
 node "Navegador" as Browser
 frame "Red default implícita de Compose\n(no nombre runtime confirmado)" {
  node "frontend\nnode:22-alpine\nVite 0.0.0.0:5173" as FE
  node "backend\npython:3.12-slim\nrunserver 0.0.0.0:8000" as BE
  database "db\npostgres:15\n5432" as PG
 }
 folder "Repositorio ." as Repo
 folder "./media" as Media
 folder "./backups" as Backup
 storage "sistema_modalidad_data\nvolumen nombrado" as Data
 storage "Volumen anónimo\n/app/node_modules" as Modules
}
Browser --> FE : host FRONTEND_PORT (15174) -> 5173
Browser --> BE : host BACKEND_PORT (19001) -> 8000\nAxios usa VITE_API_BASE_URL localhost
BE --> PG : DB_HOST=db / DB_PORT=5432
PG -- Data : /var/lib/postgresql/data
PG -- Backup : /docker-entrypoint-initdb.d : ro
BE -- Repo : /app (bind)
FE -- Repo : /app (bind)
BE -- Media : /app/media (bind)
FE -- Modules : /app/node_modules
note right of PG
Host DB_HOST_PORT (5540) -> 5432.
Healthcheck pg_isready.
end note
note bottom of Host
Puertos entre paréntesis = valores por defecto declarados,
no valores efectivos de .env ni servicios observados.
backend depende de db healthy; frontend de backend started.
El entrypoint migra y puede crear superusuario: no ejecutado.
Producción: configuración Django existente, topología no comprobada.
end note
''', ["docker-compose.yml", "Dockerfile.backend", "Dockerfile.frontend", "docker/backend/entrypoint.sh", "core/settings/production.py", "src/config/env.js"], "Tres servicios, red implícita, puertos y montajes", "Infraestructura declarada de desarrollo, no contenedores observados. No se ejecutó Docker ni se leyó .env. Producción no representada como desplegada; no se afirma proxy, TLS terminado o nube.")


def supplements():
    diagram("DIA-USR-021", "herencia-autenticacion", "Herencia y persistencia de autenticación", "Clases / persistencia heredada",
            "Explicar la herencia de usuario y M2M de autenticación sin confundir rol académico y permisos Django", '''
class "AbstractUser" as AbstractUser <<framework>> {
 password : CharField
 last_login : DateTimeField <<NULL>>
 is_superuser : BooleanField
 is_staff : BooleanField
 is_active : BooleanField
 date_joined : DateTimeField
}
abstract class "BaseModel" as BaseModel <<abstracta>> {
 created_at : DateTimeField
 updated_at : DateTimeField
 activo : BooleanField
}
class "CustomUser" as CustomUser <<entidad>> {
 username : CharField <<UQ>>
 role : ForeignKey <<NULL>>
}
class "Role" as Role <<entidad>>
class "auth.Group" as Group <<framework>>
class "auth.Permission" as Permission <<framework>>
AbstractUser <|-- CustomUser
BaseModel <|-- CustomUser
CustomUser "0..*" -- "0..1" Role : role
CustomUser "0..*" -- "0..*" Group : groups (heredada)
CustomUser "0..*" -- "0..*" Permission : user_permissions (heredada)
note bottom of CustomUser
Campos heredados corroborados en migración inicial.
Las dos relaciones M2M tienen intermedias implícitas.
activo (BaseModel) e is_active (Django) son campos distintos.
is_staff no otorga por sí solo autoridad interna.
No se presenta el esquema completo del framework.
end note
''', ["apps/usuarios/models.py", "apps/usuarios/migrations/0001_initial.py", "core/models.py", "core/permissions.py"],
            "CustomUser, dos bases, rol y referencias Django Group/Permission",
            "AbstractUser se muestra como frontera del framework; la lista incluye campos que hereda de sus propias bases, no afirma que todos se declaren directamente allí. Evidencia de M2M y campos: migración versionada, sin ejecutarla. La instalación física y el esquema completo de Django/SimpleJWT quedan pendientes.")
    diagram("DIA-POS-120", "intermedia-memorandum", "ER lógico: intermedia de memorando", "ER lógico derivado",
            "Hacer visible la intermedia implícita de asignaciones sin inventar su nombre físico", '''
entity "PublicacionMemorandumDesignacion" as P <<referencia>> {
 id : BigAutoField <<PK>>
}
entity "AsignacionPostulacion" as A <<referencia>> {
 id : BigAutoField <<PK>>
}
entity "Intermedia implícita de asignaciones" as Link <<derivada_M2M>> {
 id : PK implícita <<derivada>>
 publicacion : FK conceptual
 asignacion : FK conceptual
}
P ||--o{ Link : propietario
A ||--o{ Link : asignación
note bottom of Link
Derivada de ManyToManyField sin through explícito.
Nombres de columnas y tabla no certificados.
Tipo físico de la PK no certificado.
No es una clase declarada en models.py.
El M2M lógico completo se muestra en la vista de asignaciones.
end note
''', ["apps/postulantes/models.py", "apps/postulantes/migrations/0019_publicacionmemorandumdesignacion.py"],
            "Dos entidades de referencia y una intermedia conceptual derivada",
            "Intermedia inferida de la declaración M2M y la migración; no se cuenta como modelo propio adicional ni se declara tabla efectivamente instalada.")


def index():
    text = "# Registro de diagramas — fase 3\n\nFuentes reales creadas; validación y renderizado se informan en [validación](../10-trazabilidad-y-validacion/validacion-fase-3.md). Referencia: directorio de trabajo, no solo HEAD.\n\n"
    text += "[Galería local de SVG](renderizados/index.html). No requiere conexión a servicios externos.\n\n"
    text += "| ID | Vista | Tipo | Fuente | Ficha | SVG |\n| --- | --- | --- | --- | --- | --- |\n"
    for d in REGISTRY:
        svg = Path(d["source"]).stem + ".svg"
        rendered = "[SVG](renderizados/" + svg + ")" if (BASE / "diagramas/renderizados" / svg).is_file() else "Pendiente"
        text += "| " + d["id"] + " | " + d["title"] + " | " + d["type"] + " | [PUML](../" + d["source"] + ") | [Descripción](../" + d["description"] + ") | " + rendered + " |\n"
    text += "\n## Vistas reservadas para otra fase\n\n"
    text += "| ID | Vista | Estado |\n| --- | --- | --- |\n| DIA-SYS-001 | Casos de uso | PENDIENTE, fuera de fase 3 |\n| DIA-SYS-003 | Actividades | PENDIENTE, fuera de fase 3 |\n| DIA-SYS-004 | Secuencias | PENDIENTE, fuera de fase 3 |\n| DIA-SYS-005 | Estados | PENDIENTE, fuera de fase 3 |\n"
    text += "\n## Entrada del atlas\n\n| ID | Vista | Estado |\n| --- | --- | --- |\n| DIA-SYS-008 | [Atlas ER](../04-dominio-y-datos/atlas-fase-3.md) | Desglosado en fuentes ER modulares, sin fuente gigante propia |\n\nNo se reutiliza el ID del atlas para una entidad distinta. [Convenciones](convenciones-uml.md).\n"
    write("diagramas/README.md", text)


if __name__ == "__main__":
    main()
