import csv,io,json
from datetime import datetime
from decimal import Decimal
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema
from apps.reportes.permissions import CanViewInstitutionalReports,CanExportReports
from apps.reportes.serializers import (ReportFilterSerializer,DashboardSerializer,ReportePostulacionSerializer,
    ResultadoReportFilterSerializer,ReporteResultadoAcademicoSerializer)
from apps.reportes.services import DashboardService,ReportePostulacionesService,ResultadosAcademicosService
from apps.reportes.resultados import ResultadoAcademicoReportService
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


class ResultadosAcademicosReportView(GenericAPIView):
    permission_classes=(CanViewInstitutionalReports,)
    serializer_class=ReporteResultadoAcademicoSerializer
    pagination_class=StandardResultsSetPagination

    @extend_schema(
        parameters=[ResultadoReportFilterSerializer],
        responses=ReporteResultadoAcademicoSerializer(many=True),
        description="Resultados académicos paginados, normalizados por modalidad y limitados al alcance autorizado.",
    )
    def get(self, request):
        serializer = ResultadoReportFilterSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        queryset = ResultadosAcademicosService.construir_queryset(serializer.normalized(), request.user)
        page = self.paginate_queryset(queryset)
        resultados = ResultadoAcademicoReportService.resolver_lote(page)
        rows = [ResultadosAcademicosService.row(item, resultados[item.pk]) for item in page]
        return self.get_paginated_response(rows)


def safe_csv(v):
    text="" if v is None else str(v)
    candidate=text.lstrip(" \t\r\n")
    return "'"+text if candidate.startswith(("=","+","-","@")) or text.startswith(("\t","\r","\n")) else text


EXPORT_HEADERS = ["Postulación", "Postulante", "Modalidad", "Gestión", "Semestre", "Tutor", "Etapa actual", "Estado general", "Avance (%)", "Documentos pendientes", "Próxima defensa", "Cierre"]
CSV_EXPORT_HEADERS = EXPORT_HEADERS + ["Tipo de registro"]
XLSX_EXPORT_HEADERS = EXPORT_HEADERS + ["Tipo de registro"]
EXPORT_ACTIONS = {"csv": "EXPORT_APPLICATION_REPORT_CSV", "xlsx": "EXPORT_APPLICATION_REPORT_XLSX"}


def readable_code(value, empty="Sin dato"):
    if not value:
        return empty
    return str(value).replace("_", " ").title()


def export_row(report):
    tipo_registro = report.get("tipo_registro")
    tipo_label = "Seguimiento" if tipo_registro == "SEGUIMIENTO" else "Histórico" if tipo_registro == "HISTORICO" else "Sin tipo"
    fila = [
        f"Postulación #{report['postulacion_id']}",
        report["postulante_nombre"] or "Sin postulante",
        report["modalidad"]["nombre"] if report.get("modalidad") else "Sin modalidad",
        report["gestion"],
        "Primero" if report["semestre"] == "I" else "Segundo",
        report["tutor_activo"] or "Sin tutor",
        "No aplica" if tipo_registro == "HISTORICO" else readable_code(report["etapa_actual"], "Sin etapa actual"),
        readable_code(report["estado_general"], "Sin estado"),
        "No aplica" if tipo_registro == "HISTORICO" else Decimal(report["porcentaje_etapas_aprobadas"] or 0),
        "No aplica" if tipo_registro == "HISTORICO" else report["documentos_pendientes"],
        "No aplica" if tipo_registro == "HISTORICO" else report["proxima_defensa"],
        "No aplica" if tipo_registro == "HISTORICO" else ("Sí" if report["concluida"] else "No"),
    ]
    return fila + [tipo_label]


def export_xlsx(rows, request, filtros):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Postulaciones"
    last_column = get_column_letter(len(XLSX_EXPORT_HEADERS))
    title_fill = PatternFill("solid", fgColor="0F4C5C")
    header_fill = PatternFill("solid", fgColor="1D7874")
    sheet.merge_cells(f"A1:{last_column}1")
    sheet["A1"] = "SISTEMA DE GRADUACIÓN"
    sheet["A1"].font = Font(color="FFFFFF", bold=True, size=14)
    sheet["A1"].fill = title_fill
    sheet["A1"].alignment = Alignment(horizontal="center")
    sheet.merge_cells(f"A2:{last_column}2")
    sheet["A2"] = "REPORTE DE POSTULACIONES"
    sheet["A2"].font = Font(bold=True, size=12, color="0F4C5C")
    sheet["A3"] = "Generado:"
    sheet["B3"] = timezone.localtime(timezone.now()).replace(tzinfo=None)
    sheet["B3"].number_format = "dd/mm/yyyy hh:mm"
    sheet["A4"] = "Usuario:"
    sheet["B4"] = request.user.get_username()
    sheet["A5"] = "Filtros aplicados:"
    sheet["B5"] = ", ".join(f"{key}={value}" for key, value in sorted(filtros.items())) or "Ninguno"
    header_row = 7
    for column, header in enumerate(XLSX_EXPORT_HEADERS, 1):
        cell = sheet.cell(header_row, column, header)
        cell.font = Font(color="FFFFFF", bold=True)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for row_number, row in enumerate(rows, header_row + 1):
        for column, value in enumerate(row, 1):
            cell = sheet.cell(row_number, column, value)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            if column == 9:
                if value == "No aplica":
                    cell.value = "No aplica"
                else:
                    cell.value = float(value) / 100
                    cell.number_format = "0.00%"
            if column == 11 and isinstance(value, datetime):
                cell.value = value.replace(tzinfo=None)
                cell.number_format = "dd/mm/yyyy hh:mm"
    sheet.freeze_panes = "A8"
    sheet.auto_filter.ref = f"A{header_row}:{last_column}{max(header_row, header_row + len(rows))}"
    for index, width in enumerate([18, 28, 28, 10, 12, 24, 24, 20, 14, 22, 24, 12, 18], 1):
        sheet.column_dimensions[get_column_letter(index)].width = width
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


class ExportView(GenericAPIView):
    permission_classes=(CanExportReports,); serializer_class=ReportFilterSerializer
    @extend_schema(parameters=[ReportFilterSerializer],responses={200:bytes},description="Exportación CSV UTF-8 con BOM o XLSX profesional, protección contra fórmulas y límite configurable.")
    def get(self,request):
        formato = request.query_params.get("formato", "csv").lower()
        if formato not in EXPORT_ACTIONS: raise ValidationError({"formato":"Solo se admite CSV o XLSX."})
        f=filters(request); qs=ReportePostulacionesService.construir_queryset_postulaciones(f,request.user).order_by("created_at"); limit=getattr(settings,"REPORT_EXPORT_MAX_ROWS",5000); count=qs.count()
        if count>limit: raise ValidationError({"detail":f"La exportación supera el límite de {limit} filas; aplique filtros."})
        rows = [export_row(ReportePostulacionesService.row(postulacion)) for postulacion in qs]
        AuditLog.objects.create(usuario=request.user,accion=EXPORT_ACTIONS[formato],modulo="REPORTES",descripcion=f"{formato.upper()} de postulaciones exportado; filas={count}; filtros={json.dumps(f,default=str,sort_keys=True)}")
        if formato == "xlsx":
            response = HttpResponse(export_xlsx(rows, request, f), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            response["Content-Disposition"] = 'attachment; filename="reporte_postulaciones.xlsx"'
            return response
        stream=io.StringIO(); w=csv.writer(stream, delimiter=";", lineterminator="\r\n"); w.writerow(CSV_EXPORT_HEADERS)
        for row in rows: w.writerow([safe_csv(value) for value in row])
        response=HttpResponse("\ufeff"+stream.getvalue(),content_type="text/csv; charset=utf-8"); response["Content-Disposition"]='attachment; filename="postulaciones.csv"'; return response
