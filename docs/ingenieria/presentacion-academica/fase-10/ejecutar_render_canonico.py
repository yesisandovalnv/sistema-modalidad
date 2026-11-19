"""Ejecuta la habilidad sin editarla; conserva perfiles que Windows no pueda limpiar."""
import tempfile,runpy,sys
Original=tempfile.TemporaryDirectory
class StableTemporaryDirectory(Original):
    def __init__(self,*a,**k):
        k['ignore_cleanup_errors']=True
        super().__init__(*a,**k)
tempfile.TemporaryDirectory=StableTemporaryDirectory
script='C:/Users/luisfer/.codex/plugins/cache/openai-primary-runtime/documents/26.1026.10807/skills/documents/render_docx.py'
sys.argv=[script,*sys.argv[1:]]
runpy.run_path(script,run_name='__main__')
