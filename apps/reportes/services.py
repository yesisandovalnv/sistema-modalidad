from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Count,Q,Subquery,OuterRef,Value,IntegerField,CharField,DateTimeField,F,Exists
from django.utils import timezone
from apps.postulantes.models import Postulacion,SeguimientoEtapa,EventoDefensa,EvaluacionDefensa,CondicionPostulacion,EntregaFisica,AsignacionPostulacion
from apps.documentos.models import DocumentoPostulacion
from apps.notificaciones.models import Notificacion
from apps.modalidades.policies import ModalidadPolicyRegistry
from core.permissions import is_staff_user, is_student_user, is_teacher_user


class ReportFilters:
    @staticmethod
    def apply(qs,f):
        if f.get("modalidad"): qs=qs.filter(modalidad_id=f["modalidad"])
        if f.get("gestion"): qs=qs.filter(periodo__gestion=f["gestion"])
        if f.get("semestre"): qs=qs.filter(periodo__semestre=f["semestre"])
        if f.get("estado_general"): qs=qs.filter(estado_actual_id=f["estado_general"])
        if f.get("tipo_registro"): qs=qs.filter(tipo_registro=f["tipo_registro"])
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
        if is_staff_user(usuario): return qs
        if is_student_user(usuario): return qs.filter(estudiante=usuario)
        if is_teacher_user(usuario): return qs.filter(asignaciones__usuario=usuario).distinct()
        return qs.none()


class ResultadosAcademicosService:
    @staticmethod
    def construir_queryset(filtros, usuario):
        qs = ScopeService.postulaciones(usuario)
        if filtros.get("gestion"):
            qs = qs.filter(periodo__gestion=filtros["gestion"])
        if filtros.get("semestre"):
            qs = qs.filter(periodo__semestre=filtros["semestre"])
        if filtros.get("modalidad"):
            qs = qs.filter(modalidad_id=filtros["modalidad"])
        if filtros.get("estado_administrativo"):
            qs = qs.filter(estado_actual_id=filtros["estado_administrativo"])
        if filtros.get("buscar"):
            search = filtros["buscar"]
            qs = qs.filter(
                Q(codigo__icontains=search)
                | Q(estudiante__nombres__icontains=search)
                | Q(estudiante__apellido_paterno__icontains=search)
                | Q(estudiante__apellido_materno__icontains=search)
                | Q(estudiante__username__icontains=search)
                | Q(estudiante__ru__icontains=search)
            )
        return qs.select_related(
            "estudiante", "modalidad", "periodo", "estado_actual",
        ).order_by("-periodo__fecha_inicio", "-pk").distinct()

    @staticmethod
    def row(postulacion, resultado):
        return {
            "postulacion_id": postulacion.pk,
            "postulacion_codigo": postulacion.codigo,
            "estudiante": {
                "id": postulacion.estudiante_id,
                "nombre": postulacion.estudiante.nombre_completo or postulacion.estudiante.username,
                "ru": postulacion.estudiante.ru,
            },
            "modalidad": {
                "id": postulacion.modalidad_id,
                "codigo": postulacion.modalidad.codigo,
                "nombre": postulacion.modalidad.nombre,
            },
            "gestion": postulacion.periodo.gestion,
            "semestre": postulacion.periodo.semestre,
            "estado_administrativo": (
                {
                    "codigo": postulacion.estado_actual.codigo,
                    "nombre": postulacion.estado_actual.nombre,
                }
                if postulacion.estado_actual else None
            ),
            "resultado_academico": resultado.as_dict(),
        }


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
        tipo_registro=p.tipo_registro
        if tipo_registro == Postulacion.TipoRegistroChoices.HISTORICO:
            etapa_actual=None
            pct=None
            documentos_pendientes=None
            proxima_defensa=None
            cierre_aplicable=False
        else:
            etapa_actual=p.etapa_actual_codigo
            if p.total_etapas and p.etapas_aprobadas == 0:
                pct=Decimal("100.00")
            else:
                pct=Decimal("0.00") if not p.total_etapas else (Decimal(p.etapas_aprobadas)*100/Decimal(p.total_etapas)).quantize(Decimal("0.01"),ROUND_HALF_UP)
            documentos_pendientes=p.documentos_pendientes_count
            proxima_defensa=p.proxima_defensa
            cierre_aplicable=(
                ModalidadPolicyRegistry.has_policy(p.modalidad)
                and ModalidadPolicyRegistry.get(p.modalidad).get_cierre_policy() is not None
            )
        return {"postulacion_id":p.pk,"postulante_id":p.estudiante_id,"postulante_nombre":p.estudiante.nombre_completo or p.estudiante.username,
          "modalidad":{"codigo":p.modalidad.codigo,"nombre":p.modalidad.nombre},"gestion":p.periodo.gestion,"semestre":p.periodo.semestre,
          "titulo_trabajo":None,"tutor_activo":p.tutor_nombre,"tipo_registro":tipo_registro,"etapa_actual":etapa_actual,"estado_general":getattr(p.estado_actual,"codigo",None),
          "porcentaje_etapas_aprobadas":pct,"documentos_pendientes":documentos_pendientes,"proxima_defensa":proxima_defensa,
          "revision_final_aprobada":p.revision_final_aprobada,"cierre_documental_aprobado":p.cierre_documental_aprobado,"cierre_aplicable":cierre_aplicable,"concluida":getattr(p.estado_actual,"codigo",None)=="CONCLUIDA",
          "fecha_creacion":p.created_at,"fecha_actualizacion":p.updated_at}

    @classmethod
    def proyeccion_institucional(cls, queryset):
        rows = []
        for numero, postulacion in enumerate(queryset, start=1):
            report = cls.row(postulacion)
            tipo_registro = report.get("tipo_registro")
            rows.append({
                "numero": numero,
                "postulante": report["postulante_nombre"] or "Sin postulante",
                "modalidad": report["modalidad"]["nombre"] if report.get("modalidad") else "Sin modalidad",
                "gestion": report["gestion"],
                "semestre": "Primero" if report["semestre"] == "I" else "Segundo",
                "etapa_actual": (
                    "No aplica" if tipo_registro == Postulacion.TipoRegistroChoices.HISTORICO
                    else cls.etiqueta_codigo(report["etapa_actual"], "Sin etapa actual")
                ),
                "estado": cls.etiqueta_codigo(report["estado_general"], "Sin estado"),
            })
        return rows

    @staticmethod
    def etiqueta_codigo(value, empty="Sin dato"):
        if not value:
            return empty
        return str(value).replace("_", " ").capitalize()


class DashboardService:
    @classmethod
    def obtener_dashboard(cls,filtros,usuario):
        qs=ReportFilters.apply(ScopeService.postulaciones(usuario),filtros)
        operational_qs=qs.filter(tipo_registro=Postulacion.TipoRegistroChoices.SEGUIMIENTO)
        ids=qs.values("pk"); operational_ids=operational_qs.values("pk")
        total=qs.count(); states_raw=list(qs.values("estado_actual__codigo","estado_actual__nombre").annotate(total=Count("pk")).order_by("estado_actual__codigo"))
        states=[{"codigo":x["estado_actual__codigo"],"nombre":x["estado_actual__nombre"],"total":x["total"]} for x in states_raw]
        modalities_raw=list(qs.values("modalidad__codigo","modalidad__nombre").annotate(total=Count("pk")).order_by("modalidad__codigo"))
        modalities=[{"codigo":x["modalidad__codigo"],"nombre":x["modalidad__nombre"],"total":x["total"]} for x in modalities_raw]
        unresolved=SeguimientoEtapa.objects.filter(postulacion=OuterRef("pk"),activo=True,estado__in=["PENDIENTE","EN_PROCESO","OBSERVADA"]).order_by("etapa__orden")
        stage_qs=operational_qs.annotate(stage=Subquery(unresolved.values("etapa__codigo")[:1])).filter(stage__isnull=False).values("stage").annotate(total=Count("pk")).order_by("stage")
        docs=DocumentoPostulacion.objects.filter(postulacion_id__in=ids,activo=True)
        operational_docs=docs.filter(postulacion_id__in=operational_ids)
        defenses=EventoDefensa.objects.filter(postulacion_id__in=operational_ids,activo=True)
        now=timezone.now()
        notifications=Notificacion.objects.filter(destinatario=usuario)
        concluded=qs.filter(estado_actual__codigo="CONCLUIDA").count(); rejected=qs.filter(estado_actual__codigo="RECHAZADA").count()
        return {"filtros_aplicados":filtros,"resumen":{"total_postulaciones":total,"en_proceso":total-concluded-rejected,"concluidas":concluded,"rechazadas":rejected,
          "sin_etapa_actual":operational_qs.annotate(has=Exists(unresolved)).filter(has=False).count()},"modalidades":modalities,"etapas":[{"codigo":x["stage"],"total":x["total"]} for x in stage_qs],"estados":states,
          "documentos":{"total":docs.count(),"pendientes":operational_docs.exclude(estado__codigo__in=["APR","REC"]).count(),"observados":docs.filter(requiere_correccion=True).count(),"aprobados":docs.filter(estado__codigo="APR").count(),"rechazados":docs.filter(estado__codigo="REC").count(),"sin_version_vigente":docs.exclude(versiones__es_version_actual=True,versiones__activo=True).distinct().count(),"postulaciones_con_correcciones":docs.filter(requiere_correccion=True).values("postulacion").distinct().count()},
          "defensas":{"programadas":defenses.filter(estado="PROGRAMADA").count(),"en_curso":defenses.filter(estado="EN_CURSO").count(),"finalizadas":defenses.filter(estado="FINALIZADA").count(),"suspendidas":defenses.filter(estado="SUSPENDIDA").count(),"canceladas":defenses.filter(estado="CANCELADA").count(),"proximas":defenses.filter(estado="PROGRAMADA",fecha_programada__gte=now).count(),"por_tipo":list(defenses.values("tipo_evento").annotate(total=Count("pk"))),"evaluaciones_consolidadas":EvaluacionDefensa.objects.filter(evento__postulacion_id__in=operational_ids,tipo_evaluacion="RESULTADO_FINAL").count()},
          "cierre":{"revision_final_aprobada":SeguimientoEtapa.objects.filter(postulacion_id__in=operational_ids,etapa__codigo="REVISION_FINAL_POST_PUBLICA",estado="APROBADA").values("postulacion").distinct().count(),"cierre_documental_aprobado":SeguimientoEtapa.objects.filter(postulacion_id__in=operational_ids,etapa__codigo="CIERRE_DOCUMENTAL",estado="APROBADA").values("postulacion").distinct().count(),"concluidas":concluded,"condiciones_pendientes":CondicionPostulacion.objects.filter(postulacion_id__in=operational_ids).exclude(estado="CUMPLE").count(),"entregas_pendientes":EntregaFisica.objects.filter(postulacion_id__in=operational_ids).exclude(estado="COMPLETA").count()},
          "notificaciones":{"no_leidas":notifications.filter(leida=False).count(),"leidas":notifications.filter(leida=True).count(),"por_nivel":list(notifications.values("nivel").annotate(total=Count("pk"))),"por_tipo":list(notifications.values("tipo").annotate(total=Count("pk")))},
          "tendencia":list(qs.values(gestion=F("periodo__gestion")).annotate(total=Count("pk")).order_by("gestion")),"advertencias":["Cierre no evaluado para modalidades sin policy; solo se agregan evidencias persistidas."]}
