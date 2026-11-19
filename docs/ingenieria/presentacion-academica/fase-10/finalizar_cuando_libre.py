"""Publica las copias revisadas sólo si los destinos están libres y sin cambios ajenos.

No cierra aplicaciones ni termina procesos. Un bloqueo mantiene pendiente la entrega.
"""
from preparar_documentos import *
def main():
    publication=json.loads((OUT/'publicacion-pendiente.json').read_text(encoding='utf-8'))
    visual=json.loads((OUT/'revision-visual.json').read_text(encoding='utf-8'))
    rendered=json.loads((OUT/'qa/renderizado-revision-.json').read_text(encoding='utf-8'))
    expected={'analisis-y-diseno.docx':publication['expected_initial_main_sha256'],'anexos-uml.docx':publication['annex_sha256']}
    for name in expected:
        reviewed=OUT/('revision-'+name)
        record=next(r for r in visual['documents'] if r['reviewed_source']==reviewed.name)
        if sha(reviewed)!=record['source_sha256']:raise SystemExit('La copia revisada cambió; requiere nueva revisión')
        if sha(OUT/name) not in (expected[name],sha(reviewed)):raise SystemExit('El destino contiene cambios ajenos; no se sobrescribe: '+name)
        try:
            with (OUT/name).open('r+b'):pass
        except PermissionError:
            print('PENDIENTE: el destino sigue bloqueado. No se cierra Word ni se publica sobre el archivo abierto: '+name)
            return
    for name in expected:(OUT/name).write_bytes((OUT/('revision-'+name)).read_bytes())
    publication['status']='RESUELTO';publication['final_main_replaced']=True
    write(OUT/'publicacion-pendiente.json',json.dumps(publication,ensure_ascii=False,indent=2))
    visual['status']='COMPLETADA';visual['final_main_pending_file_lock']=False
    for r in visual['documents']:
        final=OUT/(r['document']+'.docx');assert sha(final)==r['source_sha256'];r['final_docx']=final.name;r['final_sha256']=sha(final)
    write(OUT/'revision-visual.json',json.dumps(visual,ensure_ascii=False,indent=2))
    for r in rendered:
        r['final_docx']=r['document']+'.docx';r['final_sha256_equal_source']=sha(OUT/r['final_docx'])==r['source_sha256']
    write(OUT/'qa/renderizado-local.json',json.dumps(rendered,ensure_ascii=False,indent=2))
    write(OUT/'estado-entrega.json',json.dumps({'phase':10,'status':'COMPLETADA','figures':25,'main_pages':28,'annex_pages':29,'main_images':8,'annex_images':12,'large_svg_figures':7,'figure20_pages':[24,25,26],'files_sha256':{n:sha(OUT/n) for n in expected},'physical_print_verified':False},ensure_ascii=False,indent=2))
    print('Publicación completada: los dos DOCX finales coinciden con las copias inspeccionadas.')
if __name__=='__main__':main()
