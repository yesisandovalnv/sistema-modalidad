"""Validación estática local; no sustituye al parser oficial PlantUML.

Solo lee. No importa el sistema, no conecta a PostgreSQL y no usa red.
"""
import ast
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess

BASE = Path(__file__).resolve().parents[1]
ROOT = BASE.parents[1]


def main():
    registry = json.loads((BASE / "diagramas/registro-fase-3.json").read_text(encoding="utf-8"))
    models = json.loads((BASE / "04-dominio-y-datos/modelo-logico-fase-3.json").read_text(encoding="utf-8"))
    snapshot = json.loads((BASE / "00-alcance-y-evidencia/estado-fase-3.json").read_text(encoding="utf-8"))
    errors = []
    ids = [d["id"] for d in registry]
    if len(ids) != len(set(ids)):
        errors.append("Colisión de IDs de diagrama")
    declared_files = {d["source"] for d in registry}
    actual_files = {p.relative_to(BASE).as_posix() for p in (BASE / "diagramas/fuentes").glob("*.puml")}
    if declared_files != actual_files:
        errors.append("Registro y fuentes no coinciden")
    owners = {"ER lógico": [], "Clases": []}
    relations = 0
    methods = 0
    inheritance = 0
    for entry in registry:
        path = BASE / entry["source"]
        text = path.read_text(encoding="utf-8")
        if len(re.findall(r"^@startuml\b", text, re.M)) != 1 or len(re.findall(r"^@enduml\b", text, re.M)) != 1:
            errors.append("Delimitadores: " + entry["id"])
        if "!includeurl" in text or re.search(r"!include\s+https?://", text):
            errors.append("Inclusión remota: " + entry["id"])
        for include in re.findall(r"^!include (.+)$", text, re.M):
            resolved = (path.parent / include).resolve()
            if not resolved.is_relative_to(BASE) or not resolved.is_file():
                errors.append("Include inválido: " + entry["id"])
        for key in ["id", "title", "type", "goal", "scope", "sources", "version", "limitations"]:
            if not entry.get(key):
                errors.append("Metadato ausente: " + entry["id"] + " / " + key)
        for source in entry["sources"]:
            if not (ROOT / source).is_file():
                errors.append("Fuente inexistente: " + source)
        # Solo llaves de contenedores/declaraciones; no confundir atributos con sintaxis.
        opens = sum(bool(re.match(r"^(?:abstract )?(?:class|entity|package|node|frame)\b.*\{$", line.strip())) for line in text.splitlines())
        closes = sum(line.strip() == "}" for line in text.splitlines())
        if opens != closes:
            errors.append("Llaves estructurales: " + entry["id"])
        evidence = entry.get("evidence", {})
        if entry["type"] in owners:
            owners[entry["type"]] += evidence.get("models", [])
        for relation in evidence.get("relationships", []):
            model = models[relation["source"]]
            field = next((f for f in model["fields"] if f["name"] == relation["field"]), None)
            if not field or any(field[k] != relation[k] for k in ("type", "null", "unique")):
                errors.append("Relación inconsistente: " + entry["id"])
                continue
            if field["target"].split(".")[-1] != relation["target"]:
                errors.append("Destino inconsistente: " + entry["id"])
            left = "0..1" if field["type"] == "OneToOneField" or field["unique"] else "0..*"
            right = "0..*" if field["type"] == "ManyToManyField" else "0..1" if field["null"] else "1"
            name, target = relation["source"], relation["target"]
            if entry["type"] == "ER lógico":
                expected = name + " " + ("}o" if left == "0..*" else "|o") + "--" + ("o{" if right == "0..*" else "o|" if right == "0..1" else "||") + " " + target + " : " + field["name"]
            else:
                expected = name + ' "' + left + '" -- "' + right + '" ' + target + " : " + field["name"]
            if expected not in text:
                errors.append("Cardinalidad no reflejada: " + entry["id"] + " / " + field["name"])
            relations += 1
        for key in evidence.get("classes", []):
            module, name = key.rsplit(".", 1)
            source = ROOT / (module.replace(".", "/") + ".py")
            node = next((c for c in ast.parse(source.read_text(encoding="utf-8-sig")).body if isinstance(c, ast.ClassDef) and c.name == name), None)
            if node is None:
                errors.append("Clase no encontrada: " + key)
                continue
            for base in node.bases:
                base_name = ast.unparse(base).split(".")[-1]
                if re.search(r'class "' + re.escape(base_name) + r'" as ' + re.escape(base_name) + r'\b', text):
                    inheritance += 1
                    if base_name + " <|-- " + name not in text:
                        errors.append("Herencia declarada no reflejada: " + key + " / " + base_name)
            block = re.search(r"class \"" + name + r"\" as " + name + r".*?\{(.*?)\n\}", text, re.S)
            if block:
                available = {n.name for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
                for member in node.body:
                    if isinstance(member,ast.Assign):
                        value=member.value
                        if isinstance(value,ast.Call) and ast.unparse(value.func) in {'staticmethod','classmethod'} and value.args:
                            value=value.args[0]
                        if isinstance(value,ast.Lambda):available.update(t.id for t in member.targets if isinstance(t,ast.Name))
                for method in re.findall(r"^\s*\+(\w+)\(", block[1], re.M):
                    methods += 1
                    if method not in available:
                        errors.append("Operación inventada: " + key + "." + method)

    for kind, names in owners.items():
        if set(names) != set(models) or any(count != 1 for count in Counter(names).values()):
            errors.append("Cobertura de entidades: " + kind)
    # Contraste del inventario con el AST actual, independiente del renderizado.
    for name, model in models.items():
        node = next(n for n in ast.parse((ROOT / model["path"]).read_text(encoding="utf-8-sig")).body if isinstance(n, ast.ClassDef) and n.name == name)
        fields = {}
        for member in node.body:
            if isinstance(member, ast.Assign) and isinstance(member.value, ast.Call):
                call = member.value
                typ = ast.unparse(call.func).split(".")[-1]
                if typ.endswith("Field") or typ == "ForeignKey":
                    kwargs = {k.arg: k.value for k in call.keywords}
                    fields[member.targets[0].id] = (typ, ast.literal_eval(kwargs["null"]) if "null" in kwargs else False)
        if set(fields) != {f["name"] for f in model["fields"]}:
            errors.append("Inventario de campos divergente: " + name)
        for f in model["fields"]:
            if fields.get(f["name"]) != (f["type"], f["null"]):
                errors.append("Tipo/nulabilidad divergente: " + name + "." + f["name"])
    for name, digest in snapshot["sha256_fuera_documentacion"].items():
        path = ROOT / name
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            errors.append("Archivo exterior cambió: " + name)
    current_status = subprocess.check_output(["git", "-c", "core.quotePath=false", "status", "--short", "--untracked-files=all"], cwd=ROOT).decode("utf-8").splitlines()
    outside = lambda lines: {line for line in lines if not line[3:].startswith("docs/ingenieria/")}
    same_status = outside(current_status) == outside(snapshot["status"])
    if not same_status:
        errors.append("Estado Git exterior cambió respecto a la fotografía")
    render_status = "PENDIENTE de ejecución del renderizador local"
    render_path = BASE / "10-trazabilidad-y-validacion/logs-renderizado/resultado.json"
    if render_path.is_file():
        rendered = json.loads(render_path.read_text(encoding="utf-8"))
        if rendered.get("sintaxis_retorno") != 0 or rendered.get("renderizado_retorno") != 0:
            errors.append("Validación oficial/renderizado con errores")
        svg_entries = {entry["id"]: entry for entry in rendered.get("archivos", [])}
        if set(svg_entries) != set(ids):
            errors.append("Cobertura SVG distinta al registro")
        if rendered.get("style_sha256") != hashlib.sha256((BASE / "diagramas/estilos/base.puml.inc").read_bytes()).hexdigest():
            errors.append("Estilo modificado después del renderizado")
        for entry in registry:
            result_entry = svg_entries.get(entry["id"], {})
            svg_path = BASE / result_entry.get("svg", "__ausente__")
            if result_entry.get("error") or not svg_path.is_file():
                errors.append("SVG inválido/ausente: " + entry["id"])
            elif hashlib.sha256(svg_path.read_bytes()).hexdigest() != result_entry.get("sha256"):
                errors.append("SVG modificado después del renderizado: " + entry["id"])
            if hashlib.sha256((BASE / entry["source"]).read_bytes()).hexdigest() != result_entry.get("source_sha256"):
                errors.append("Fuente modificada después del renderizado: " + entry["id"])
        render_status = "VALIDADA localmente con PlantUML " + rendered.get("plantuml", "desconocido")
    result = {"diagramas": len(registry), "modelos_propios": len(models), "relaciones_contrastadas_clases_y_er": relations,
              "operaciones_de_diseno_contrastadas": methods,
              "huellas_exteriores": len(snapshot["sha256_fuera_documentacion"]),
              "estado_git_exterior_sin_cambio": same_status,
              "herencias_contrastadas": inheritance,
              "sintaxis_plantuml_oficial": render_status,
              "errores": errors}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
