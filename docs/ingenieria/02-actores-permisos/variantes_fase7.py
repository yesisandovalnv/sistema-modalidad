"""Variantes contrastadas: lectura no hereda la asociación administrativa de escritura."""
ROWS=[
 ('GET','/api/v1/postulaciones/{id}/memorandums-designacion/','Consultar publicaciones','COMMON','UC-PG-001 como contexto, no permiso de publicación','Administración: historial; otros: solo es_vigente','apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion'),
 ('POST','/api/v1/postulaciones/{id}/memorandums-designacion/','Publicar memorando','ADMIN','UC-PG-001','Serializer y MemorandumDesignacionService; policy Proyecto','apps/postulantes/views.py:PostulacionViewSet.memorandums_designacion'),
 ('GET','/api/v1/postulaciones/{id}/cierre/','Consultar cierre','COMMON','UC-PG-002 como contexto, no autorización de mutación','Policy de cierre disponible; auditar=False en consulta','apps/postulantes/cierre_api.py:CierreEstadoView.get'),
 ('POST','/api/v1/postulaciones/{id}/cierre/{action}/','Aprobar revisión/cierre, concluir o reabrir','ADMIN','UC-PG-002','Action selecciona servicio; motivo para reabrir; gates propios','apps/postulantes/cierre_api.py:CierreAccionView.post'),
 ('GET','/api/v1/seguimientos-etapa/{id}/dictamenes-revision/','Consultar dictámenes','RELATED','UC-POS-014 como contexto','get_object sobre queryset vinculado; all_objects para dictámenes','apps/postulantes/views.py:SeguimientoEtapaViewSet.dictamenes_revision'),
 ('POST','/api/v1/seguimientos-etapa/{id}/dictamenes-revision/','Registrar dictamen','ADMIN','UC-POS-014','Guarda administrativa explícita; serializer y servicio','apps/postulantes/views.py:SeguimientoEtapaViewSet.dictamenes_revision'),
 ('GET','/api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/','Consultar informes','RELATED','UC-POS-015 como contexto','Seguimiento visible; queryset InformeRevisionTribunalPrevia','apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal'),
 ('POST','/api/v1/seguimientos-etapa/{id}/informes-revision-tribunal/','Registrar informe','ADMIN','UC-POS-015','Guarda administrativa explícita; validación específica del servicio','apps/postulantes/views.py:SeguimientoEtapaViewSet.informes_revision_tribunal'),
 ('GET','/api/v1/seguimientos-etapa/{id}/decisiones-academicas/','Consultar decisiones y participantes','RELATED','UC-POS-005 como contexto','Seguimiento visible; no concede registrar-decision','apps/postulantes/views.py:SeguimientoEtapaViewSet.decisiones_academicas'),
 ('POST','/api/v1/seguimientos-etapa/{id}/registrar-decision/','Registrar decisión','ADMIN','UC-POS-005','Guarda administrativa explícita; policy y participantes','apps/postulantes/views.py:SeguimientoEtapaViewSet.registrar_decision'),
 ('GET','/api/v1/documentos/observaciones/ y {id}/','Consultar observaciones','RELATED','UC-DOC-004 como contexto','Filtro propietario/asignaciones; no filtra actividad de asignación explícitamente','apps/documentos/views.py:ObservacionDocumentoViewSet.get_queryset'),
 ('POST','/api/v1/documentos/observaciones/{id}/marcar-corregida/','Marcar corregida','ADMIN','UC-DOC-004','IsStaffOrReadOnly; validación del servicio','apps/documentos/views.py:ObservacionDocumentoViewSet.marcar_corregida'),
 ('GET','/api/v1/documentos/confirmaciones-correccion/ y {id}/','Consultar confirmaciones','RELATED','UC-DOC-005 como contexto','get_queryset por propietario/asignaciones; no permiso de escritura por lectura','apps/documentos/views.py:ConfirmacionCorreccionDocumentoViewSet.get_queryset'),
 ('POST','/api/v1/documentos/confirmaciones-correccion/','Registrar confirmación','ADMIN','UC-DOC-005','IsStaffOrReadOnly; serializer y servicio; otras mutaciones heredadas pendientes','apps/documentos/views.py:ConfirmacionCorreccionDocumentoViewSet.create'),
 ('GET','/api/v1/gestion-complementaria/condiciones/ y {id}/','Consultar condiciones','RELATED','UC-POS-027','Filtros por postulación/estado; pendientes y completadas son GET independientes','apps/postulantes/complementarios_api.py:RelatedViewSet.get_queryset'),
 ('GET','/api/v1/gestion-complementaria/entregas-fisicas/ y {id}/','Consultar entregas','RELATED','UC-POS-027','COMPLETA vs pendientes según acción; sin invocar registrar_entrega','apps/postulantes/complementarios_api.py:EntregaFisicaViewSet'),
]

def append_matrix(base,profiles,actors,evidence,write,original_text):
    doc='02-actores-permisos/matriz-fase-4.md'
    text=original_text
    text+='\n## Ampliación verificada de fase 7\n\nLas 77 filas anteriores son resúmenes de objetivos, no un inventario exhaustivo de métodos HTTP. Estas 16 variantes desglosan las superficies auditadas. La relación con un UC administrativo es contextual cuando la operación es una consulta; no transfiere autoridad. No se generalizan permisos de POST a GET. HEAD/OPTIONS y mutaciones heredadas no caracterizadas no se certifican aquí.\n\n| Método | Ruta | Operación / contexto | Actor | Permiso | Alcance | Restricciones | Evidencia backend |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n'
    for method,path,operation,profile,uc,restriction,ref in ROWS:
        ids,guard,scope=profiles[profile]
        text+='| '+ ' | '.join([method,'`'+path+'`',operation+'; '+uc,'; '.join(actors[a][0] for a in ids),guard,scope,restriction,evidence(doc,ref)])+' |\n'
    text+='\nRutas base y alias: [core/urls.py](../../../core/urls.py), [router de seguimiento](../../../apps/postulantes/workflow_urls.py), [router complementario](../../../apps/postulantes/complementarios_urls.py) y [router documental](../../../apps/documentos/urls.py). COMMON aplica rol y vínculo; RELATED filtra por vínculo sin exigir que el cargo académico sea un rol de acceso.\n'
    write(doc,text)
