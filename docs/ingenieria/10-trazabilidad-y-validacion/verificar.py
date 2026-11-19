"""Valida esta documentación sin importar Django ni ejecutar el producto.

Uso desde la raíz: python docs/ingenieria/10-trazabilidad-y-validacion/verificar.py
No escribe archivos. La comprobación de huellas conserva la fotografía de fase 2.
"""
import ast
from collections import Counter
import hashlib
import json
from pathlib import Path
import re


BASE = Path(__file__).resolve().parents[1]
ROOT = BASE.parents[1]


def symbols(path):
    result = set()

    def walk(nodes, prefix=""):
        for node in nodes:
            if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                result.add(prefix + node.name)
                if isinstance(node, ast.ClassDef):
                    walk(node.body, prefix + node.name + ".")

    walk(ast.parse(path.read_text(encoding="utf-8-sig")).body)
    return result


def main():
    errors = []
    links = 0
    checked_symbols = 0
    all_markdown = sorted(BASE.rglob("*.md"))
    # Las licencias originales del JRE portátil no son documentación del sistema.
    # No se reformatean ni se someten a las convenciones editoriales del proyecto.
    def vendor_document(path):
        parts = path.relative_to(BASE).parts
        return len(parts) > 2 and parts[:2] == ("diagramas", "herramientas") and (
            parts[2].startswith("jdk-") or parts[2] in {"tmp", "user-home", "prefs"})
    documents = [path for path in all_markdown if not vendor_document(path)]
    for doc in documents:
        content = doc.read_text(encoding="utf-8")
        if not content.startswith("# ") or not content.endswith("\n"):
            errors.append(f"Estructura: {doc.relative_to(BASE)}")
        if "\ufffd" in content:
            errors.append(f"Revisar codificación: {doc.relative_to(BASE)}")
        if content.count("```") % 2:
            errors.append(f"Bloque sin cierre: {doc.relative_to(BASE)}")
        for line in content.splitlines():
            if line.rstrip() != line:
                errors.append(f"Espacio final: {doc.relative_to(BASE)}")
        table_width = None
        for line in content.splitlines():
            if line.startswith("|"):
                width = len(line.split("|"))
                if table_width is not None and width != table_width:
                    errors.append(f"Columnas inconsistentes: {doc.relative_to(BASE)}")
                table_width = width
            else:
                table_width = None
        for label, target in re.findall(r"\[([^\]]+)\]\(([^)]+)\)", content):
            if re.match(r"[a-z]+://", target):
                continue
            path_text, _, anchor = target.partition("#")
            path = (doc.parent / path_text).resolve() if path_text else doc
            links += 1
            if not path.is_relative_to(ROOT) or not path.is_file():
                errors.append(f"Enlace inválido: {doc.relative_to(BASE)} -> {target}")
            elif anchor:
                errors.append(f"Ancla requiere revisión: {doc.relative_to(BASE)} -> {target}")
            elif doc.name == "matriz.md" and path.suffix == ".py":
                if label != "Archivo; escenarios por desglosar":
                    checked_symbols += 1
                    if label not in symbols(path):
                        errors.append(f"Símbolo inexistente: {target}::{label}")

    canonical = {
        "FUN": ["03-casos-de-uso/catalogo-funcionalidades.md"],
        "UC": ["03-casos-de-uso/catalogo-funcionalidades.md"],
        "RN": ["10-trazabilidad-y-validacion/matriz.md", "10-trazabilidad-y-validacion/reglas-fase-4.md"],
        "ENT": ["04-dominio-y-datos/catalogo-entidades.md"],
        "CMP": ["01-arquitectura/catalogo-modulos.md"]
        + [str(p.relative_to(BASE)) for p in BASE.glob("09-modalidades/*/README.md")],
        "DIA": ["diagramas/README.md", "diagramas/registro-fase-4.md", "diagramas/registro-fase-5.md"],
        "ACT": ["02-actores-permisos/actores-fase-4.md"],
        "DISC": ["00-alcance-y-evidencia/discrepancias.md"],
    }
    definitions = {}
    for kind, files in canonical.items():
        pattern = rf"\b{kind}-(?:[A-Z]+-)?\d{{3}}\b"
        found = []
        for file in files:
            content = (BASE / file).read_text(encoding="utf-8")
            # Los enlaces a fuentes/fichas repiten el ID en su nombre de archivo.
            # Solo la primera columna del registro declara una vista.
            if kind == "DIA":
                found += re.findall(r"^\|\s*(DIA-[A-Z]+-\d{3})\s*\|", content, re.M)
            elif kind == "UC":
                found += re.findall(r"^\|\s*FUN-[A-Z]+-\d{3}\s*\|\s*(UC-[A-Z]+-\d{3})\s*\|", content, re.M)
            else:
                found += re.findall(pattern, content)
        duplicates = [key for key, value in Counter(found).items() if value > 1]
        if duplicates:
            errors.append(f"IDs duplicados {kind}: {duplicates}")
        definitions[kind] = set(found)
    known = set().union(*definitions.values())
    for doc in documents:
        for identifier in re.findall(r"\b(?:FUN|UC|RN|ENT|CMP|DIA|ACT)-[A-Z]+-\d{3}\b|\bDISC-\d{3}\b", doc.read_text(encoding="utf-8")):
            if identifier not in known:
                errors.append(f"ID sin registro: {identifier}")

    # Verifica clases del catálogo de entidades, además de las operaciones de matriz.
    entity_doc = BASE / "04-dominio-y-datos/catalogo-entidades.md"
    for line in entity_doc.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| ENT-"):
            continue
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        target = re.search(r"\]\(([^)]+)\)", cells[2]).group(1)
        if cells[1] not in symbols((entity_doc.parent / target).resolve()):
            errors.append(f"Entidad inexistente: {cells[1]}")
        checked_symbols += 1

    snapshot = json.loads((BASE / "00-alcance-y-evidencia/estado-inicial.json").read_text(encoding="utf-8"))
    for name, digest in snapshot["sha256"].items():
        path = ROOT / name
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            errors.append(f"Archivo previo cambió: {name}")
    if list(BASE.rglob("*.puml")) and not (BASE / "diagramas/registro-fase-3.json").is_file():
        errors.append("Fuentes de diagramas sin registro autorizado de fase 3")
    result = {
        "markdown": len(documents),
        "markdown_proveedor_excluidos": len(all_markdown) - len(documents),
        "enlaces_locales": links,
        "simbolos_python": checked_symbols,
        "ids": {key: len(value) for key, value in definitions.items()},
        "archivos_previos_sin_cambio": len(snapshot["sha256"]) if not any("Archivo previo" in e for e in errors) else None,
        "errores": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
