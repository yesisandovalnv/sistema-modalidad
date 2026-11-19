"""Desviaciones autorizadas sin reescribir las fotografías históricas."""
import hashlib
import json
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]

def historical_matches(path,original):
    path=Path(path).resolve()
    if not path.is_file():return False
    current=hashlib.sha256(path.read_bytes()).hexdigest()
    if current==original:return True
    if not path.is_relative_to(BASE):return False
    digest=original
    for name in ('cambios-fase-7.json','cambios-fase-7-1.json'):
        manifest=BASE/'10-trazabilidad-y-validacion'/name
        if not manifest.is_file():continue
        entry=json.loads(manifest.read_text(encoding='utf-8'))['modificados'].get(path.relative_to(BASE).as_posix(),{})
        if entry.get('antes')==digest:digest=entry.get('despues')
        if digest==current:return True
    return False
