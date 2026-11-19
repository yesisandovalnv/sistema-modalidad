"""Render canónico DOCX->PDF->PNG con LibreOffice portátil autorizado."""
from pathlib import Path
import os,subprocess,json,sys,hashlib
import pypdfium2 as pdfium
P=Path(__file__).resolve().parent
R=Path('C:/Users/luisfer/.cache/codex-runtimes/codex-primary-runtime/dependencies')
SKILL=Path('C:/Users/luisfer/.codex/plugins/cache/openai-primary-runtime/documents/26.1026.10807/skills/documents')
env=os.environ.copy();tmp=P/'qa/tmp';tmp.mkdir(parents=True,exist_ok=True)
env['TEMP']=env['TMP']=str(tmp)
env['PYTHONDONTWRITEBYTECODE']='1'
env['PATH']=os.pathsep.join([str(P/'herramientas/LibreOfficePortable/App/libreoffice/program'),str(R/'native/poppler/Library/bin'),str(R/'native/poppler/bin'),env.get('PATH','')])
results=[]
prefix='revision-' if '--revision' in sys.argv else ''
for name in ('analisis-y-diseno','anexos-uml'):
    target=P/'qa'/(prefix+name);target.mkdir(parents=True,exist_ok=True)
    cmd=[sys.executable,'-B',str(P/'ejecutar_render_canonico.py'),str(P/f'{prefix}{name}.docx'),'--output_dir',str(target),'--dpi','108','--emit_pdf','--verbose']
    proc=subprocess.run(cmd,cwd=P,env=env,capture_output=True,timeout=300)
    log=proc.stdout.decode('utf-8',errors='replace')+proc.stderr.decode('utf-8',errors='replace')
    (target/'renderizado.log').write_text(log,encoding='utf-8')
    pdf=target/f'{prefix}{name}.pdf'
    pages=len(pdfium.PdfDocument(str(pdf))) if pdf.exists() else 0
    result={'document':name,'source_docx':prefix+name+'.docx','source_sha256':hashlib.sha256((P/f'{prefix}{name}.docx').read_bytes()).hexdigest(),'exit':proc.returncode,'pages':pages,'pdf':str(pdf),'renderer':'render_docx.py con LibreOffice Portable 26.2.4 autorizado'}
    results.append(result);print(json.dumps(result),flush=True)
(P/f'qa/renderizado-{prefix or "local"}.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
if any(r['exit'] or not r['pages'] for r in results):raise SystemExit(1)
