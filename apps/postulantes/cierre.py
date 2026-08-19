from django.core.exceptions import ValidationError
from django.db import transaction

from apps.documentos.models import DocumentoPostulacion, TipoDocumento
from apps.postulantes.models import (CondicionPostulacion, EntregaFisica,
    EstadoPostulacion, EvaluacionDefensa, EventoDefensa, HistorialEstado,
    Postulacion, SeguimientoEtapa)
from apps.postulantes.workflow import WorkflowService
from apps.usuarios.models import AuditLog
from apps.modalidades.policies import BaseCierrePolicy, ModalidadPolicyRegistry
from apps.notificaciones.events import EventTypes, publish_domain_event


class ProyectoGradoCierrePolicy(BaseCierrePolicy):
    CONDITION_CODES=tuple(x for x,_ in CondicionPostulacion.Tipo.choices)
    DELIVERY_CODES=(EntregaFisica.Tipo.CD_RESPALDO,EntregaFisica.Tipo.EJEMPLARES_IMPRESOS,EntregaFisica.Tipo.TIMBRE_UNIVERSITARIO)
    FINAL_DOCUMENT_CODES=("DOCUMENTO_FINAL","ACTA_DEFENSA","HOJA_APROBACION","INFORME_FINAL_TUTOR")
    REVIEW_DOCUMENT_CODES=("DOCUMENTO_FINAL","HOJA_APROBACION")

    @classmethod
    def inicializar_requisitos(cls, post):
        """Crea controles pendientes sin presuponer cantidades institucionales."""
        condition_names = dict(CondicionPostulacion.Tipo.choices)
        delivery_names = dict(EntregaFisica.Tipo.choices)
        for code in cls.CONDITION_CODES:
            CondicionPostulacion.objects.get_or_create(postulacion=post, codigo=code,
                defaults={"tipo": code, "nombre": condition_names[code]})
        for code in cls.DELIVERY_CODES:
            EntregaFisica.objects.get_or_create(postulacion=post, codigo=code,
                defaults={"nombre": delivery_names[code]})

    @staticmethod
    def _stage(post,code):
        return post.seguimientos_etapa.filter(etapa__codigo=code,activo=True).order_by("-numero_intento").first()

    @staticmethod
    def _documents(post,codes,event=None,require_configured=False):
        configured=set(TipoDocumento.objects.filter(codigo__in=codes,activo=True).values_list("codigo",flat=True)); approved=[]; missing=[]
        for code in codes if require_configured else configured:
            if code not in configured:
                missing.append(code)
                continue
            doc=DocumentoPostulacion.objects.filter(postulacion=post,tipo_documento__codigo=code,activo=True).select_related("estado","evento_defensa").first()
            valid=bool(doc and doc.estado.codigo=="APR" and not doc.requiere_correccion and doc.versiones.filter(es_version_actual=True,activo=True).exists())
            if valid and code=="ACTA_DEFENSA" and event is not None: valid=doc.evento_defensa_id==event.pk
            (approved if valid else missing).append(code)
        return configured,approved,missing

    @classmethod
    def evaluar_revision_final(cls,post):
        from apps.postulantes.defensas import EvaluacionDefensaService

        missing=[]; warnings=[]; detail={}
        stage=cls._stage(post,"DEFENSA_PUBLICA"); detail["defensa_publica_aprobada"]=bool(stage and stage.estado=="APROBADA")
        if not detail["defensa_publica_aprobada"]: missing.append("DEFENSA_PUBLICA_APROBADA")
        event=post.eventos_defensa.filter(tipo_evento="DEFENSA_PUBLICA",estado="FINALIZADA",activo=True).order_by("-fecha_fin_real").first()
        detail["evento_publico_finalizado"]=event.pk if event else None
        if not event: missing.append("EVENTO_DEFENSA_PUBLICA_FINALIZADO")
        evaluation=event.evaluaciones.filter(tipo_evaluacion="RESULTADO_FINAL",es_resultado_final_evento=True,nota_numerica__isnull=False,activo=True).first() if event else None
        detail["evaluacion_publica_valida"]=evaluation.pk if evaluation else None
        if not evaluation: missing.append("EVALUACION_PUBLICA_CONSOLIDADA_VALIDA")
        final_result=EvaluacionDefensaService.calcular_resultado_final(post,None,auditar=False)
        detail["nota_final"]=final_result["nota_final"]
        detail["clasificacion_final"]=final_result["clasificacion"]
        if final_result["nota_final"] is None: missing.append("RESULTADO_FINAL_COMPLETO")
        elif final_result["clasificacion"]==EvaluacionDefensa.Resultado.POSTERGADO: missing.append("RESULTADO_FINAL_APROBATORIO")
        unresolved=DocumentoPostulacion.objects.filter(postulacion=post,activo=True,requiere_correccion=True).exists()
        if unresolved: missing.append("CORRECCIONES_DOCUMENTALES_PENDIENTES")
        configured,approved,doc_missing=cls._documents(post,cls.REVIEW_DOCUMENT_CODES,event,require_configured=True)
        missing.extend(f"DOCUMENTO:{x}" for x in doc_missing)
        detail.update(documentos_configurados=sorted(configured),documentos_aprobados=approved)
        return {"cumple":not missing,"faltantes":missing,"advertencias":warnings,"detalle":detail}

    @classmethod
    def evaluar_cierre_documental(cls,post):
        missing=[]; warnings=[]; detail={}
        revision=cls._stage(post,"REVISION_FINAL_POST_PUBLICA")
        if not revision or revision.estado!="APROBADA": missing.append("REVISION_FINAL_POST_PUBLICA_APROBADA")
        conditions={x.codigo:x.estado for x in post.condiciones.filter(codigo__in=cls.CONDITION_CODES,activo=True)}
        condition_missing=[c for c in cls.CONDITION_CODES if conditions.get(c)!="CUMPLE"]
        missing.extend(f"CONDICION:{x}" for x in condition_missing)
        deliveries={x.codigo:x.estado for x in post.entregas_fisicas.filter(codigo__in=cls.DELIVERY_CODES,activo=True)}
        delivery_missing=[c for c in cls.DELIVERY_CODES if deliveries.get(c)!="COMPLETA"]
        missing.extend(f"ENTREGA:{x}" for x in delivery_missing)
        warnings.append("La cantidad normativa de EJEMPLARES_IMPRESOS permanece pendiente; no se calcula automáticamente.")
        event=post.eventos_defensa.filter(tipo_evento="DEFENSA_PUBLICA",estado="FINALIZADA",activo=True).order_by("-fecha_fin_real").first()
        if not event: missing.append("EVENTO_DEFENSA_PUBLICA_FINALIZADO")
        configured,approved,doc_missing=cls._documents(post,cls.FINAL_DOCUMENT_CODES,event,require_configured=True)
        missing.extend(f"DOCUMENTO:{x}" for x in doc_missing)
        if "ACTA_DEFENSA" not in configured: warnings.append("ACTA_DEFENSA no está configurada como TipoDocumento inequívoco.")
        if "HOJA_APROBACION" not in configured: warnings.append("HOJA_APROBACION no está configurada como TipoDocumento inequívoco.")
        detail.update(condiciones=conditions,condiciones_faltantes=condition_missing,entregas=deliveries,entregas_faltantes=delivery_missing,documentos_configurados=sorted(configured),documentos_aprobados=approved,documentos_faltantes=doc_missing)
        return {"cumple":not missing,"faltantes":missing,"advertencias":warnings,"detalle":detail}

    obtener_faltantes_revision_final=classmethod(lambda cls,p:cls.evaluar_revision_final(p)["faltantes"])
    obtener_faltantes_cierre=classmethod(lambda cls,p:cls.evaluar_cierre_documental(p)["faltantes"])
    puede_aprobar_revision_final=classmethod(lambda cls,p:cls.evaluar_revision_final(p)["cumple"])
    puede_concluir=classmethod(lambda cls,p: bool((s:=cls._stage(p,"CIERRE_DOCUMENTAL")) and s.estado=="APROBADA" and not p.seguimientos_etapa.filter(etapa__obligatoria=True,activo=True).exclude(estado="APROBADA").exists()))


class CierrePostulacionService:
    @staticmethod
    def _policy(postulacion):
        policy = ModalidadPolicyRegistry.get(postulacion)
        cierre = policy.get_cierre_policy()
        if not cierre: raise ValidationError("La modalidad no tiene política de cierre configurada.")
        cierre.inicializar_requisitos(postulacion)
        return cierre
    @staticmethod
    def _audit(user,action,post,before,after,stage,detail=""):
        AuditLog.objects.create(usuario=user,accion=action,modulo="CIERRE_POSTULACION",descripcion=f"Postulación {post.codigo}; estado {before}->{after}; etapa {stage}; {detail}")
    @staticmethod
    def _stage(post,code):
        obj=post.seguimientos_etapa.select_for_update().filter(etapa__codigo=code,activo=True).order_by("-numero_intento").first()
        if not obj: raise ValidationError(f"No existe seguimiento para {code}.")
        return obj
    @staticmethod
    def _prepare(stage,user):
        if stage.estado=="PENDIENTE": stage=WorkflowService.iniciar_etapa(stage,user)
        return stage

    @classmethod
    def consultar_estado_cierre(cls,postulacion,usuario=None,auditar=False):
        policy=cls._policy(postulacion); rev=policy.evaluar_revision_final(postulacion); close=policy.evaluar_cierre_documental(postulacion)
        stages={x.etapa.codigo:x for x in postulacion.seguimientos_etapa.select_related("etapa").filter(activo=True).order_by("etapa__orden","numero_intento")}
        result={"postulacion_id":postulacion.pk,"modalidad":postulacion.modalidad.codigo,"estado_general":postulacion.estado_actual.codigo if postulacion.estado_actual else None,"etapa_actual":next((x.etapa.codigo for x in stages.values() if x.estado in ("PENDIENTE","EN_PROCESO","OBSERVADA")),None),"defensa_publica_aprobada":rev["detalle"]["defensa_publica_aprobada"],"revision_final_aprobada":getattr(stages.get("REVISION_FINAL_POST_PUBLICA"),"estado",None)=="APROBADA","cierre_documental_aprobado":getattr(stages.get("CIERRE_DOCUMENTAL"),"estado",None)=="APROBADA","condiciones_requeridas":list(policy.CONDITION_CODES),"condiciones_cumplidas":[k for k,v in close["detalle"]["condiciones"].items() if v=="CUMPLE"],"condiciones_faltantes":close["detalle"]["condiciones_faltantes"],"entregas_requeridas":list(policy.DELIVERY_CODES),"entregas_completas":[k for k,v in close["detalle"]["entregas"].items() if v=="COMPLETA"],"entregas_faltantes":close["detalle"]["entregas_faltantes"],"documentos_requeridos":close["detalle"]["documentos_configurados"],"documentos_aprobados":close["detalle"]["documentos_aprobados"],"documentos_faltantes":close["detalle"]["documentos_faltantes"],"advertencias_normativas":list(dict.fromkeys(rev["advertencias"]+close["advertencias"])),"puede_aprobar_revision_final":rev["cumple"],"puede_aprobar_cierre":close["cumple"],"puede_concluir":policy.puede_concluir(postulacion),"concluida":bool(postulacion.estado_actual and postulacion.estado_actual.codigo=="CONCLUIDA")}
        if auditar and usuario: cls._audit(usuario,"CHECK_CLOSURE",postulacion,result["estado_general"],result["estado_general"],result["etapa_actual"],str(rev["faltantes"]+close["faltantes"]))
        return result

    @classmethod
    @transaction.atomic
    def aprobar_revision_final(cls,postulacion,usuario,observaciones=""):
        post=Postulacion.objects.select_for_update().get(pk=postulacion.pk); result=cls._policy(post).evaluar_revision_final(post)
        if not result["cumple"]: raise ValidationError({"faltantes":result["faltantes"],"advertencias":result["advertencias"]})
        stage=cls._prepare(cls._stage(post,"REVISION_FINAL_POST_PUBLICA"),usuario); WorkflowService.aprobar_etapa(stage,usuario,observaciones)
        cls._audit(usuario,"APPROVE_FINAL_REVIEW",post,stage.estado,"APROBADA",stage.etapa.codigo,str(result))
        publish_domain_event(EventTypes.REVISION_FINAL_APROBADA,stage,usuario,post,{"etapa":stage.etapa.nombre},f"REVISION_FINAL_APROBADA:{stage.pk}:{stage.updated_at.isoformat()}"); return post

    @classmethod
    @transaction.atomic
    def aprobar_cierre_documental(cls,postulacion,usuario,observaciones=""):
        post=Postulacion.objects.select_for_update().get(pk=postulacion.pk); result=cls._policy(post).evaluar_cierre_documental(post)
        if not result["cumple"]: raise ValidationError({"faltantes":result["faltantes"],"advertencias":result["advertencias"]})
        stage=cls._prepare(cls._stage(post,"CIERRE_DOCUMENTAL"),usuario); WorkflowService.aprobar_etapa(stage,usuario,observaciones,actualizar_estado_general=False)
        cls._audit(usuario,"APPROVE_DOCUMENTARY_CLOSURE",post,stage.estado,"APROBADA",stage.etapa.codigo,str(result))
        publish_domain_event(EventTypes.CIERRE_DOCUMENTAL_APROBADO,stage,usuario,post,{"etapa":stage.etapa.nombre},f"CIERRE_DOCUMENTAL_APROBADO:{stage.pk}:{stage.updated_at.isoformat()}"); return post

    @classmethod
    @transaction.atomic
    def concluir_postulacion(cls,postulacion,usuario,observaciones=""):
        post=Postulacion.objects.select_for_update().get(pk=postulacion.pk)
        if post.estado_actual and post.estado_actual.codigo=="CONCLUIDA": return post
        if not cls._policy(post).puede_concluir(post): raise ValidationError("El cierre documental y todas las etapas obligatorias deben estar aprobados.")
        before=post.estado_actual.codigo if post.estado_actual else None; WorkflowService._actualizar_estado_general(post,"CONCLUIDA",usuario,observaciones or "Conclusión controlada posterior al cierre documental.",True); post.refresh_from_db()
        cls._audit(usuario,"CONCLUDE_APPLICATION",post,before,"CONCLUIDA","CIERRE_DOCUMENTAL",observaciones)
        history=HistorialEstado.objects.filter(postulacion=post,estado_nuevo__codigo="CONCLUIDA").order_by("-pk").first()
        publish_domain_event(EventTypes.POSTULACION_CONCLUIDA,history,usuario,post,{},f"POSTULACION_CONCLUIDA:{post.pk}:{history.pk}"); return post

    @classmethod
    @transaction.atomic
    def reabrir_cierre(cls,postulacion,usuario,motivo):
        if not motivo.strip(): raise ValidationError("El motivo de reapertura es obligatorio.")
        post=Postulacion.objects.select_for_update().get(pk=postulacion.pk); cls._policy(post); stage=cls._stage(post,"CIERRE_DOCUMENTAL")
        if stage.estado!="APROBADA": raise ValidationError("El cierre documental no está aprobado.")
        before=post.estado_actual; stage.estado="EN_PROCESO"; stage.fecha_fin=None; stage.cerrada_por=None; stage.observaciones=(stage.observaciones+"\nReapertura: "+motivo).strip(); stage.save()
        target=(HistorialEstado.objects.filter(postulacion=post,estado_nuevo=before).order_by("-fecha_cambio").first().estado_anterior if before and before.codigo=="CONCLUIDA" else before)
        if target and before_id_not_equal(before,target):
            post.estado_actual=target; post.save(update_fields=["estado_actual","updated_at"]); HistorialEstado.objects.create(postulacion=post,estado_anterior=before,estado_nuevo=target,usuario=usuario,comentario=motivo)
        cls._audit(usuario,"REOPEN_CLOSURE",post,before.codigo if before else None,target.codigo if target else None,"CIERRE_DOCUMENTAL",motivo)
        publish_domain_event(EventTypes.CIERRE_REABIERTO,stage,usuario,post,{"etapa":stage.etapa.nombre},f"CIERRE_REABIERTO:{stage.pk}:{stage.updated_at.isoformat()}"); return post

def before_id_not_equal(before,target): return not before or before.pk!=target.pk
