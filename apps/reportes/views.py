import csv,io,json
from django.conf import settings
from django.http import HttpResponse
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema
from apps.reportes.permissions import CanViewInstitutionalReports,CanExportReports
from apps.reportes.serializers import ReportFilterSerializer,DashboardSerializer,ReportePostulacionSerializer
from apps.reportes.services import DashboardService,ReportePostulacionesService
from apps.usuarios.models import AuditLog
from core.pagination import StandardResultsSetPagination


def filters(request):
    s=ReportFilterSerializer(data=request.query_params); s.is_valid(raise_exception=True); return s.normalized()


class DashboardView(GenericAPIView):
    permission_classes=(CanViewInstitutionalReports,); serializer_class=DashboardSerializer
    @extend_schema(parameters=[ReportFilterSerializer],responses=DashboardSerializer,description="Dashboard institucional de solo lectura. etapa_actual espera el ID persistido de EtapaModalidad, no código ni nombre. Las métricas de notificaciones pertenecen únicamente al usuario autenticado.")
    def get(self,request): return Response(DashboardService.obtener_dashboard(filters(request),request.user))


ORDER={"postulante_nombre":"estudiante__apellido_paterno","modalidad":"modalidad__nombre","gestion":"periodo__gestion","semestre":"periodo__semestre","etapa_actual":"etapa_actual_codigo","estado_general":"estado_actual__codigo","fecha_creacion":"created_at","fecha_actualizacion":"updated_at"}
class PostulacionesReportView(GenericAPIView):
    permission_classes=(CanViewInstitutionalReports,); serializer_class=ReportePostulacionSerializer; pagination_class=StandardResultsSetPagination
    @extend_schema(parameters=[ReportFilterSerializer],responses=ReportePostulacionSerializer(many=True),description="Reporte paginado, sin datos personales sensibles y limitado al alcance del usuario. etapa_actual espera el ID persistido de EtapaModalidad.")
    def get(self,request):
        f=filters(request); qs=ReportePostulacionesService.construir_queryset_postulaciones(f,request.user); raw=f.get("ordering","-fecha_creacion"); prefix="-" if raw.startswith("-") else ""; qs=qs.order_by(prefix+ORDER[raw.lstrip("-")])
        page=self.paginate_queryset(qs); rows=[ReportePostulacionesService.row(x) for x in page]; return self.get_paginated_response(rows)


def safe_csv(v):
    text="" if v is None else str(v)
    candidate=text.lstrip(" \t\r\n")
    return "'"+text if candidate.startswith(("=","+","-","@")) or text.startswith(("\t","\r","\n")) else text
class ExportView(GenericAPIView):
    permission_classes=(CanExportReports,); serializer_class=ReportFilterSerializer
    @extend_schema(parameters=[ReportFilterSerializer],responses={200:bytes},description="Exportación CSV UTF-8 con BOM, protección contra fórmulas y límite configurable.")
    def get(self,request):
        if request.query_params.get("formato","csv").lower()!="csv": raise ValidationError({"formato":"Solo se admite CSV."})
        f=filters(request); qs=ReportePostulacionesService.construir_queryset_postulaciones(f,request.user).order_by("created_at"); limit=getattr(settings,"REPORT_EXPORT_MAX_ROWS",5000); count=qs.count()
        if count>limit: raise ValidationError({"detail":f"La exportación supera el límite de {limit} filas; aplique filtros."})
        stream=io.StringIO(); w=csv.writer(stream); headers=["Postulación","Postulante","Modalidad","Gestión","Semestre","Tutor","Etapa actual","Estado general","Avance (%)","Documentos pendientes","Próxima defensa","Concluida"]
        w.writerow(headers)
        for p in qs:
            r=ReportePostulacionesService.row(p); w.writerow([safe_csv(r["postulacion_id"]),safe_csv(r["postulante_nombre"]),safe_csv(r["modalidad"]["nombre"]),r["gestion"],r["semestre"],safe_csv(r["tutor_activo"]),safe_csv(r["etapa_actual"]),safe_csv(r["estado_general"]),r["porcentaje_etapas_aprobadas"],r["documentos_pendientes"],r["proxima_defensa"] or "",r["concluida"]])
        AuditLog.objects.create(usuario=request.user,accion="EXPORT_APPLICATION_REPORT",modulo="REPORTES",descripcion=f"CSV de postulaciones exportado; filas={count}; filtros={json.dumps(f,default=str,sort_keys=True)}")
        response=HttpResponse("\ufeff"+stream.getvalue(),content_type="text/csv; charset=utf-8"); response["Content-Disposition"]='attachment; filename="postulaciones.csv"'; return response
