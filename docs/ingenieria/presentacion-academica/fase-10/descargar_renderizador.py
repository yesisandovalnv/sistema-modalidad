"""Descarga autorizada de LibreOffice Portable; no transmite documentos."""
from pathlib import Path
import urllib.request,hashlib,json
HERE=Path(__file__).resolve().parent/'herramientas'
HERE.mkdir(exist_ok=True)
URL='https://download.documentfoundation.org/libreoffice/portable/26.2.4/LibreOfficePortable_26.2.4_MultilingualStandard.paf.exe'
EXPECTED='4bde93374aef4409243505b20d16561a4628ac7591457dd01fc6e1ccf571ba65'
p=HERE/'LibreOfficePortable_26.2.4_MultilingualStandard.paf.exe'
if not p.exists():
    with urllib.request.urlopen(URL,timeout=90) as r,p.open('wb') as out:
        total=0;last=0
        while b:=r.read(1024*1024):
            out.write(b);total+=len(b)
            if total-last>30*1024*1024:print(total//1024//1024,'MiB descargados',flush=True);last=total
h=hashlib.sha256(p.read_bytes()).hexdigest()
if h!=EXPECTED:raise SystemExit('SHA256 no coincide; no ejecutar el paquete')
record={'url':URL,'publisher_page':'https://portableapps.com/apps/office/libreoffice_portable','version':'26.2.4','sha256':h,'expected_sha256':EXPECTED,'bytes':p.stat().st_size,'authorization':'Respuesta expresa del usuario: Autorizar renderizador local; fase 10','scope':'Preparación local dentro de fase-10; no servicios externos para documentos'}
(HERE/'procedencia.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print('Descarga y SHA256 verificados',flush=True)
