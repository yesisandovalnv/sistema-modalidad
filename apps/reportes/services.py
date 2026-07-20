from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Count,Q,Subquery,OuterRef,Value,IntegerField,CharField,DateTimeField,F,Exists
from django.utils import timezone
from apps.postulantes.models import Postulacion,SeguimientoEtapa,EventoDefensa,EvaluacionDefensa,CondicionPostulacion,EntregaFisica,AsignacionPostulacion
from apps.documentos.models import DocumentoPostulacion
from apps.notificaciones.models import Notificacion


class ReportFilters:
    @staticmethod
    def apply(qs,f):
        if f.get("modalidad"): qs=qs.filter(modalidad_id=f["modalidad"])
        if f.get("gestion"): qs=qs.filter(periodo__gestion=f["gestion"])
        if f.get("semestre"): qs=qs.filter(periodo__semestre=f["semestre"])
        if f.get("estado_general"): qs=qs.filter(estado_actual_id=f["estado_general"])
        if f.get("tutor"): qs=qs.filter(asignaciones__usuario_id=f["tutor"],asignaciones__tipo_participacion="TUTOR",asignaciones__activo=True)
        if f.get("fecha_desde"): qs=qs.filter(fecha_postulacion__date__gte=f["fecha_desde"])
        if f.get("fecha_hasta"): qs=qs.filter(fecha_postulacion__date__lte=f["fecha_hasta"])
        if f.get("etapa_actual"): qs=qs.filter(seguimientos_etapa__etapa_id=f["etapa_actual"],seguimientos_etapa__estado__in=["PENDIENTE","EN_PROCESO","OBSERVADA"])
        if f.get("buscar"):
            s=f["buscar"]; qs=qs.filter(Q(codigo__icontains=s)|Q(estudiante__nombres__icontains=s)|Q(estudiante__apellido_paterno__icontains=s)|Q(estudiante__username__icontains=s))
        return qs.distinct()


class ScopeService:
    @staticmethod
    def postulaciones(usuario):
        qs=Postulacion.objects.all()
        if usuario.is_staff or usuario.is_superuser: return qs
        role=getattr(getattr(usuario,"role",None),"codigo","")
        if role in {"EST","ESTUDIANTE"}: return qs.filter(estudiante=usuario)
        return qs.filter(asignaciones__usuario=usuario).distinct()


class ReportePostulacionesService:
    @classmethod
    def construir_queryset_postulaciones(cls,filtros,usuario):
        qs=ReportFilters.apply(ScopeService.postulaciones(usuario),filtros)
        current=SeguimientoEtapa.objects.filter(postulacion=OuterRef("pk"),activo=True,estado__in=["PENDIENTE","EN_PROCESO","OBSERVADA"]).order_by("etapa__orden","-numero_intento")
        tutor=AsignacionPostulacion.objects.filter(postulacion=OuterRef("pk"),activo=True,tipo_participacion="TUTOR").order_by("-fecha_designacion")
        next_def=EventoDefensa.objects.filter(postulacion=OuterRef("pk"),estado="PROGRAMADA",fecha_programada__gte=timezone.now()).order_by("fecha_programada")
        return qs.select_related("estudiante","modalidad","periodo","estado_actual").annotate(
          etapa_actual_codigo=Subquery(current.values("etapa__codigo")[:1]),tutor_nombre=Subquery(tutor.values("usuario__username")[:1]),
          total_etapas=Count("seguimientos_etapa__etapa",distinct=True),etapas_aprobadas=Count("seguimientos_etapa__etapa",filter=Q(seguimientos_etapa__estado="APROBADA"),distinct=True),
          documentos_pendientes_count=Count("documentos",filter=~Q(documentos__estado__codigo="APR"),distinct=True),proxima_defensa=Subquery(next_def.values("fecha_programada")[:1]),
          revision_final_aprobada=Exists(SeguimientoEtapa.objects.filter(postulacion=OuterRef("pk"),etapa__codigo="REVISION_FINAL_POST_PUBLICA",estado="APROBADA",activo=True)),
          cierre_documental_aprobado=Exists(SeguimientoEtapa.objects.filter(postulacion=OuterRef("pk"),etapa__codigo="CIERRE_DOCUMENTAL",estado="APROBADA",activo=True)))
    @staticmethod
    def row(p):
        pct=Decimal("0.00") if not p.total_etapas else (Decimal(p.etapas_aprobadas)*100/Decimal(p.total_etapas)).quantize(Decimal("0.01"),ROUND_HALF_UP)
        return {"postulacion_id":p.pk,"postulante_id":p.estudiante_id,"postulante_nombre":p.estudiante.nombre_completo or p.estudiante.username,
          "modalidad":{"codigo":p.modalidad.codigo,"nombre":p.modalidad.nombre},"gestion":p.periodo.gestion,"semestre":p.periodo.semestre,
          "titulo_trabajo":None,"tutor_activo":p.tutor_nombre,"etapa_actual":p.etapa_actual_codigo,"estado_general":getattr(p.estado_actual,"codigo",None),
          "porcentaje_etapas_aprobadas":pct,"documentos_pendientes":p.documentos_pendientes_count,"proxima_defensa":p.proxima_defensa,
          "revision_final_aprobada":p.revision_final_aprobada,"cierre_documental_aprobado":p.cierre_documental_aprobado,"concluida":getattr(p.estado_actual,"codigo",None)=="CONCLUIDA",
          "fecha_creacion":p.created_at,"fecha_actualizacion":p.updated_at}


class DashboardService:
    @classmethod
    def obtener_dashboard(cls,filtros,usuario):
        qs=ReportFilters.apply(ScopeService.postulaciones(usuario),filtros); ids=qs.values("pk")
        total=qs.count(); states_raw=list(qs.values("estado_actual__codigo","estado_actual__nombre").annotate(total=Count("pk")).order_by("estado_actual__codigo"))
        states=[{"codigo":x["estado_actual__codigo"],"nombre":x["estado_actual__nombre"],"total":x["total"]} for x in states_raw]
        modalities_raw=list(qs.values("modalidad__codigo","modalidad__nombre").annotate(total=Count("pk")).order_by("modalidad__codigo"))
        modalities=[{"codigo":x["modalidad__codigo"],"nombre":x["modalidad__nombre"],"total":x["total"]} for x in modalities_raw]
        unresolved=SeguimientoEtapa.objects.filter(postulacion=OuterRef("pk"),activo=True,estado__in=["PENDIENTE","EN_PROCESO","OBSERVADA"]).order_by("etapa__orden")
        stage_qs=qs.annotate(stage=Subquery(unresolved.values("etapa__codigo")[:1])).values("stage").annotate(total=Count("pk")).order_by("stage")
        docs=DocumentoPostulacion.objects.filter(postulacion_id__in=ids,activo=True)
        defenses=EventoDefensa.objects.filter(postulacion_id__in=ids,activo=True)
        now=timezone.now()
        notifications=Notificacion.objects.filter(destinatario=usuario)
        concluded=qs.filter(estado_actual__codigo="CONCLUIDA").count(); rejected=qs.filter(estado_actual__codigo="RECHAZADA").count()
        return {"filtros_aplicados":filtros,"resumen":{"total_postulaciones":total,"en_proceso":total-concluded-rejected,"concluidas":concluded,"rechazadas":rejected,
          "sin_etapa_actual":qs.annotate(has=Exists(unresolved)).filter(has=False).count()},"modalidades":modalities,"etapas":[{"codigo":x["stage"],"total":x["total"]} for x in stage_qs],"estados":states,
          "documentos":{"total":docs.count(),"pendientes":docs.exclude(estado__codigo__in=["APR","REC"]).count(),"observados":docs.filter(requiere_correccion=True).count(),"aprobados":docs.filter(estado__codigo="APR").count(),"rechazados":docs.filter(estado__codigo="REC").count(),"sin_version_vigente":docs.exclude(versiones__es_version_actual=True,versiones__activo=True).distinct().count(),"postulaciones_con_correcciones":docs.filter(requiere_correccion=True).values("postulacion").distinct().count()},
          "defensas":{"programadas":defenses.filter(estado="PROGRAMADA").count(),"en_curso":defenses.filter(estado="EN_CURSO").count(),"finalizadas":defenses.filter(estado="FINALIZADA").count(),"suspendidas":defenses.filter(estado="SUSPENDIDA").count(),"canceladas":defenses.filter(estado="CANCELADA").count(),"proximas":defenses.filter(estado="PROGRAMADA",fecha_programada__gte=now).count(),"por_tipo":list(defenses.values("tipo_evento").annotate(total=Count("pk"))),"evaluaciones_consolidadas":EvaluacionDefensa.objects.filter(evento__postulacion_id__in=ids,tipo_evaluacion="RESULTADO_FINAL").count()},
          "cierre":{"revision_final_aprobada":SeguimientoEtapa.objects.filter(postulacion_id__in=ids,etapa__codigo="REVISION_FINAL_POST_PUBLICA",estado="APROBADA").values("postulacion").distinct().count(),"cierre_documental_aprobado":SeguimientoEtapa.objects.filter(postulacion_id__in=ids,etapa__codigo="CIERRE_DOCUMENTAL",estado="APROBADA").values("postulacion").distinct().count(),"concluidas":concluded,"condiciones_pendientes":CondicionPostulacion.objects.filter(postulacion_id__in=ids).exclude(estado="CUMPLE").count(),"entregas_pendientes":EntregaFisica.objects.filter(postulacion_id__in=ids).exclude(estado="COMPLETA").count()},
          "notificaciones":{"no_leidas":notifications.filter(leida=False).count(),"leidas":notifications.filter(leida=True).count(),"por_nivel":list(notifications.values("nivel").annotate(total=Count("pk"))),"por_tipo":list(notifications.values("tipo").annotate(total=Count("pk")))},
          "tendencia":list(qs.values(gestion=F("periodo__gestion")).annotate(total=Count("pk")).order_by("gestion")),"advertencias":["Cierre no evaluado para modalidades sin policy; solo se agregan evidencias persistidas."]}
