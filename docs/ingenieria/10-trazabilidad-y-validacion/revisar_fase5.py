"""Control geométrico de SVG y hojas de contacto para revisión humana local.

--previsualizar también genera PNG con el mismo PlantUML y estilo. Los avisos de
intersección de texto son candidatos a revisar, no prueba automática de defecto.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parents[1]
LOGS = BASE / "10-trazabilidad-y-validacion/logs-renderizado-fase-5"
TOOLS = BASE / "diagramas/herramientas"


def geometry(registry):
    report = []
    for item in registry:
        root = ET.parse(BASE / "diagramas/renderizados/fase-5" / (Path(item["source"]).stem + ".svg")).getroot()
        width, height = [float(n) for n in root.get("viewBox").split()][2:]
        texts, outside, overlaps = [], [], []
        for node in root.iter():
            if not node.tag.endswith("}text") or not all(node.get(a) for a in ("textLength", "x", "y")):
                continue
            size = float(node.get("font-size", "13"))
            x, y, w = (float(node.get(a)) for a in ("x", "y", "textLength"))
            text = "".join(node.itertext())
            box = (x, y - size * .82, x + w, y + size * .18)
            texts.append((box, text, size))
            if box[0] < 0 or box[1] < 0 or box[2] > width + 1 or box[3] > height + 1:
                outside.append(text)
        for i, (a, label_a, _) in enumerate(texts):
            for b, label_b, _ in texts[i + 1:]:
                dx = min(a[2], b[2]) - max(a[0], b[0])
                dy = min(a[3], b[3]) - max(a[1], b[1])
                if dx > 2 and dy > 3:
                    overlaps.append([label_a, label_b, round(dx * dy, 1)])
        report.append({"id": item["id"], "width": width, "height": height,
                       "min_font": min(t[2] for t in texts), "textos_fuera_viewbox": outside,
                       "posibles_solapamientos": overlaps})
    (LOGS / "geometria-svg.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"svg": len(report), "fuera_viewbox": sum(len(r["textos_fuera_viewbox"]) for r in report),
                      "avisos_solapamiento": sum(len(r["posibles_solapamientos"]) for r in report),
                      "vistas_con_avisos": [r["id"] for r in report if r["posibles_solapamientos"]]}, ensure_ascii=False), flush=True)


def previews(registry, selected_ids=None):
    from PIL import Image, ImageDraw, ImageFont
    output = LOGS / "previsualizaciones"
    output.mkdir(exist_ok=True)
    cmd = [str(TOOLS / "jdk-21.0.13+9-jre/bin/java.exe"), "-Djava.awt.headless=true",
           "-Djava.io.tmpdir=" + str(TOOLS / "tmp"), "-Duser.home=" + str(TOOLS / "user-home"),
           "-Dplantuml.security.profile=ALLOWLIST", "-Dplantuml.allowlist.path=" + str(BASE),
           "-jar", str(TOOLS / "plantuml-1.2026.9.jar"), "--png", "--no-error-image", "-charset", "UTF-8",
           "--output-dir", str(output)] + [str(BASE / d["source"]) for d in registry if not selected_ids or d["id"] in selected_ids]
    result = subprocess.run(cmd, capture_output=True, encoding="utf-8", errors="replace", timeout=300,
                            env=dict(os.environ, PLANTUML_LIMIT_SIZE="16384"))
    (LOGS / "png-revision.txt").write_text(result.stdout + result.stderr, encoding="utf-8")
    assert result.returncode == 0, "Fallo de previsualización"
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
    for page in range((len(registry) + 5) // 6):
        sheet = Image.new("RGB", (1600, 2100), "#e2e8f0")
        draw = ImageDraw.Draw(sheet)
        for pos, item in enumerate(registry[page * 6:page * 6 + 6]):
            x, y = (pos % 2) * 800, (pos // 2) * 700
            draw.text((x + 12, y + 10), item["id"] + " - " + item["title"][:48], fill="black", font=font)
            img = Image.open(output / (Path(item["source"]).stem + ".png")).convert("RGB")
            img.thumbnail((780, 650))
            sheet.paste(img, (x + 10 + (780 - img.width) // 2, y + 40 + (650 - img.height) // 2))
        sheet.save(output / ("contacto-" + str(page + 1).zfill(2) + ".png"))
    print("Previsualizaciones y hojas de contacto generadas localmente.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--previsualizar", action="store_true")
    parser.add_argument("--ids", nargs="*")
    args = parser.parse_args()
    data = json.loads((BASE / "diagramas/registro-fase-5.json").read_text(encoding="utf-8"))
    geometry(data)
    if args.previsualizar:
        previews(data, args.ids)
