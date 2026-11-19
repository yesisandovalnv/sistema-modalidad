"""Valida con PlantUML oficial y genera SVG exclusivamente de forma local.

Usa las herramientas portátiles autorizadas; no instala ni descarga dependencias.
Los procesos temporales, logs y resultados quedan bajo docs/ingenieria/.
"""
import hashlib
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parents[1]
TOOLS = BASE / "diagramas/herramientas"
LOGS = BASE / "10-trazabilidad-y-validacion/logs-renderizado"
OUTPUT = BASE / "diagramas/renderizados"


def main(selected_ids=None):
    LOGS.mkdir(exist_ok=True)
    OUTPUT.mkdir(exist_ok=True)
    java = TOOLS / "jdk-21.0.13+9-jre/bin/java.exe"
    jar = TOOLS / "plantuml-1.2026.9.jar"
    assert java.is_file() and jar.is_file(), "Faltan herramientas portátiles autorizadas"
    assert hashlib.sha256(jar.read_bytes()).hexdigest() == "aa4a1d06f8911c4b842beff4828dd955be431692b631a312d04c0e9fab9581de"
    args = [str(java), "-Djava.awt.headless=true", "-Djava.io.tmpdir=" + str(TOOLS / "tmp"),
            "-Duser.home=" + str(TOOLS / "user-home"), "-Djava.util.prefs.userRoot=" + str(TOOLS / "prefs"),
            "-Dplantuml.security.profile=ALLOWLIST", "-Dplantuml.allowlist.path=" + str(BASE),
            "-jar", str(jar)]
    env = dict(os.environ, PLANTUML_LIMIT_SIZE="16384")
    registry = json.loads((BASE / "diagramas/registro-fase-3.json").read_text(encoding="utf-8"))
    sources = [str(BASE / item["source"]) for item in registry]
    if selected_ids:
        assert set(selected_ids) <= {item["id"] for item in registry}, "ID no registrado"
        previous = json.loads((LOGS / "resultado.json").read_text(encoding="utf-8"))
        assert previous["style_sha256"] == hashlib.sha256((BASE / "diagramas/estilos/base.puml.inc").read_bytes()).hexdigest(), "El estilo cambió; renderizar todo"
        old_entries = {item["id"]: item for item in previous["archivos"]}
        for item in registry:
            if item["id"] not in selected_ids:
                old = old_entries[item["id"]]
                assert hashlib.sha256((BASE / item["source"]).read_bytes()).hexdigest() == old["source_sha256"], "Otra fuente cambió; incluirla o renderizar todo"
                assert hashlib.sha256((BASE / old["svg"]).read_bytes()).hexdigest() == old["sha256"], "Otro SVG cambió; renderizar todo"
    render_sources = [str(BASE / item["source"]) for item in registry if not selected_ids or item["id"] in selected_ids]
    commands = []

    def run(name, extra):
        cmd = args + extra
        result = subprocess.run(cmd, cwd=BASE, env=env, capture_output=True, encoding="utf-8", errors="replace", timeout=300)
        (LOGS / (name + ".txt")).write_text(result.stdout + result.stderr, encoding="utf-8")
        commands.append({"nombre": name, "argumentos": cmd, "retorno": result.returncode})
        print(name, result.returncode, (result.stdout + result.stderr)[-2500:], flush=True)
        return result.returncode

    assert run("version", ["-version"]) == 0
    assert run("graphviz", ["-testdot"]) == 0
    syntax_code = run("sintaxis", ["--check-syntax", "-charset", "UTF-8"] + sources)
    result = {"fecha_validacion": "2026-11-02", "zona": "America/La_Paz", "plantuml": "1.2026.9",
              "java": "Eclipse Temurin JRE 21.0.13+9", "graphviz": "2.44.1 incorporado en PlantUML",
              "ejecucion": "local, sin servicios externos", "fuentes": len(sources),
              "style_sha256": hashlib.sha256((BASE / "diagramas/estilos/base.puml.inc").read_bytes()).hexdigest(),
              "svg_regenerados_en_esta_ejecucion": len(render_sources),
              "sintaxis_retorno": syntax_code, "comandos": commands, "archivos": []}
    if syntax_code == 0:
        result["renderizado_retorno"] = run("svg", ["--svg", "--no-error-image", "-charset", "UTF-8", "--output-dir", str(OUTPUT)] + render_sources)
        for item in registry:
            p = OUTPUT / (Path(item["source"]).stem + ".svg")
            if not p.is_file():
                result["archivos"].append({"id": item["id"], "error": "SVG ausente"})
                continue
            content = p.read_text(encoding="utf-8")
            tree = ET.fromstring(content)
            result["archivos"].append({"id": item["id"], "source": item["source"],
                "source_sha256": hashlib.sha256((BASE / item["source"]).read_bytes()).hexdigest(),
                "svg": p.relative_to(BASE).as_posix(), "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
                "width": tree.get("width"), "height": tree.get("height"), "viewBox": tree.get("viewBox"),
                "error": "SVG de error" if "Syntax Error" in content or "An error has occured" in content else None})
    (LOGS / "resultado.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ok = syntax_code == 0 and result.get("renderizado_retorno") == 0 and len(result["archivos"]) == len(sources) and not any(item.get("error") for item in result["archivos"])
    print(json.dumps({"correcto": ok, "fuentes": len(sources), "svg": len(result["archivos"])}, ensure_ascii=False))
    return 0 if ok else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--ids", nargs="+", help="Regenerar solo IDs seleccionados si el resto conserva sus huellas")
    sys.exit(main(parser.parse_args().ids))
