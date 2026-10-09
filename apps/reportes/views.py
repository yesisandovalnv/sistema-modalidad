import base64
import csv,io,json
import logging
from pathlib import Path
from decimal import Decimal
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.utils.html import escape
from openpyxl import Workbook
from openpyxl.drawing.image import Image as SpreadsheetImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.page import PageMargins
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
INSTITUTIONAL_HEADERS = ["N.º", "Postulante", "Modalidad", "Gestión", "Semestre", "Etapa actual", "Estado"]
INSTITUTIONAL_KEYS = ["numero", "postulante", "modalidad", "gestion", "semestre", "etapa_actual", "estado"]
INSTITUTIONAL_IDENTITY = {
    "university": "UNIVERSIDAD AUTÓNOMA DEL BENI",
    "university_name": "“JOSÉ BALLIVIÁN”",
    "faculty": "INGENIERÍA Y TECNOLOGÍA",
    "career": "INGENIERÍA DE SISTEMAS (LICENCIATURA - TRINIDAD)",
    "system": "SISTEMA DE REGISTRO Y SEGUIMIENTO DE MODALIDADES DE GRADUACIÓN",
    "report": "REPORTE DE POSTULACIONES",
    "location": "TRINIDAD - BENI - BOLIVIA",
}
INSTITUTIONAL_DETAIL_LABELS = {
    "faculty": "FACULTAD",
    "career": "CARRERA",
}
EXPORT_ACTIONS = {
    "csv": "EXPORT_APPLICATION_REPORT_CSV",
    "xlsx": "EXPORT_APPLICATION_REPORT_XLSX",
    "html": "PRINT_APPLICATION_REPORT",
}
REPORT_LOGO_PATH = Path("uab") / "logo" / "Logo-ac.png"
logger = logging.getLogger(__name__)
XLSX_LAYOUT = {
    "column_widths": (9, 30, 26, 12, 14, 27, 21),
    "identity_rows": (
        ("university", 13, True, 19),
        ("university_name", 12, True, 17),
        ("location", 8.5, False, 15),
    ),
    "identity_text_columns": (1, 7),
    "logo_cell": "A1",
    "logo_max_size": (62, 68),
    "title_size": 14,
    "title_height": 21,
    "identity_detail_columns": (1, 7),
    "identity_detail_height": 18,
    "section_gap_rows": 1,
    "filter_groups": ((1, 2, 3, 3), (4, 5, 6, 7)),
    "metadata_groups": ((1, 2, 3, 4), (6, 6, 7, 7)),
    "table_gap_rows": 1,
}


def readable_code(value, empty="Sin dato"):
    if not value:
        return empty
    return str(value).replace("_", " ").title()


def institutional_detail_line(key):
    return f"{INSTITUTIONAL_DETAIL_LABELS[key]}: {INSTITUTIONAL_IDENTITY[key]}"


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


def safe_spreadsheet_text(value):
    if not isinstance(value, str):
        return value
    candidate = value.lstrip(" \t\r\n")
    return "'" + value if candidate.startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n")) else value


def report_logo_bytes():
    logo_path = Path(settings.BASE_DIR) / REPORT_LOGO_PATH
    try:
        return logo_path.read_bytes()
    except FileNotFoundError:
        logger.warning("Institutional report logo is missing: %s", logo_path)
        return None


def filter_summary(filtros):
    from apps.academico.models import EtapaModalidad, Modalidad
    from apps.postulantes.models import EstadoPostulacion

    modalidad = Modalidad.objects.filter(pk=filtros.get("modalidad")).values_list("nombre", flat=True).first()
    estado = EstadoPostulacion.objects.filter(pk=filtros.get("estado_general")).values_list("nombre", flat=True).first()
    etapa = EtapaModalidad.objects.filter(pk=filtros.get("etapa_actual")).values_list("nombre", flat=True).first()
    summary = [
        ("Gestión", filtros.get("gestion") or "Todas"),
        ("Semestre", filtros.get("semestre") or "Todos"),
        ("Modalidad", modalidad or "Todas"),
        ("Estado", estado or "Todos"),
    ]
    if filtros.get("tipo_registro"):
        summary.append(("Tipo de registro", "Histórico" if filtros["tipo_registro"] == "HISTORICO" else "Seguimiento"))
    if etapa:
        summary.append(("Etapa", etapa))
    if filtros.get("buscar"):
        summary.append(("Búsqueda", filtros["buscar"]))
    if filtros.get("fecha_desde") or filtros.get("fecha_hasta"):
        summary.append(("Rango de fechas", f"{filtros.get('fecha_desde') or 'Inicio'} a {filtros.get('fecha_hasta') or 'Actualidad'}"))
    return summary


def write_xlsx_identity(sheet):
    return write_xlsx_identity_for_columns(sheet, XLSX_LAYOUT["identity_text_columns"][1])


def write_xlsx_identity_for_columns(sheet, last_column):
    first_column = XLSX_LAYOUT["identity_text_columns"][0]
    for row_number, (key, font_size, bold, row_height) in enumerate(XLSX_LAYOUT["identity_rows"], start=1):
        sheet.merge_cells(
            start_row=row_number,
            start_column=first_column,
            end_row=row_number,
            end_column=last_column,
        )
        cell = sheet.cell(row_number, first_column, INSTITUTIONAL_IDENTITY[key])
        cell.font = Font(size=font_size, bold=bold, color="174A5B")
        cell.alignment = Alignment(horizontal="center", vertical="center")
        sheet.row_dimensions[row_number].height = row_height

    logo_content = report_logo_bytes()
    if logo_content is not None:
        logo = SpreadsheetImage(io.BytesIO(logo_content))
        max_width, max_height = XLSX_LAYOUT["logo_max_size"]
        scale = min(1, max_width / logo.width, max_height / logo.height)
        logo.width *= scale
        logo.height *= scale
        sheet.add_image(logo, XLSX_LAYOUT["logo_cell"])

    return len(XLSX_LAYOUT["identity_rows"])


def write_xlsx_label_value(sheet, row_number, label, value, columns, value_number_format=None):
    label_start, label_end, value_start, value_end = columns
    sheet.merge_cells(
        start_row=row_number,
        start_column=label_start,
        end_row=row_number,
        end_column=label_end,
    )
    sheet.merge_cells(
        start_row=row_number,
        start_column=value_start,
        end_row=row_number,
        end_column=value_end,
    )
    label_cell = sheet.cell(row_number, label_start, label)
    label_cell.font = Font(bold=True)
    label_cell.alignment = Alignment(vertical="center", wrap_text=True)
    value_cell = sheet.cell(row_number, value_start, value)
    value_cell.alignment = Alignment(vertical="center", wrap_text=True)
    if value_number_format:
        value_cell.number_format = value_number_format


def write_xlsx_filters(sheet, summary, start_row, filter_groups=None):
    filter_groups = filter_groups or XLSX_LAYOUT["filter_groups"]
    for index in range(0, len(summary), len(filter_groups)):
        row_number = start_row + index // len(filter_groups)
        for group, (label, value) in zip(filter_groups, summary[index:index + len(filter_groups)]):
            label_start, label_end, value_start, value_end = group
            write_xlsx_label_value(
                sheet,
                row_number,
                f"{label}:",
                safe_spreadsheet_text(str(value)),
                (label_start, label_end, value_start, value_end),
            )
        sheet.row_dimensions[row_number].height = 19
    return start_row + max(0, (len(summary) - 1) // len(filter_groups))


def export_xlsx(rows, filtros, generated_at):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Postulaciones"
    last_column = get_column_letter(len(INSTITUTIONAL_HEADERS))
    header_fill = PatternFill("solid", fgColor="276678")
    thin = Side(style="thin", color="B8C2CC")
    summary = filter_summary(filtros)
    sheet.sheet_view.showGridLines = False
    for column, width in enumerate(XLSX_LAYOUT["column_widths"], start=1):
        sheet.column_dimensions[get_column_letter(column)].width = width

    identity_end_row = write_xlsx_identity(sheet)
    title_row = identity_end_row + 1
    sheet.merge_cells(
        start_row=title_row,
        start_column=1,
        end_row=title_row,
        end_column=len(INSTITUTIONAL_HEADERS),
    )
    document_title_cell = sheet.cell(title_row, 1, INSTITUTIONAL_IDENTITY["report"])
    document_title_cell.font = Font(size=XLSX_LAYOUT["title_size"], bold=True, color="174A5B")
    document_title_cell.alignment = Alignment(horizontal="center", vertical="center")
    sheet.row_dimensions[title_row].height = XLSX_LAYOUT["title_height"]

    faculty_row = title_row + 1
    detail_start_column, detail_end_column = XLSX_LAYOUT["identity_detail_columns"]
    sheet.merge_cells(
        start_row=faculty_row,
        start_column=detail_start_column,
        end_row=faculty_row,
        end_column=detail_end_column,
    )
    faculty_cell = sheet.cell(faculty_row, detail_start_column, institutional_detail_line("faculty"))
    faculty_cell.font = Font(size=10)
    faculty_cell.alignment = Alignment(horizontal="left", vertical="center")
    sheet.row_dimensions[faculty_row].height = XLSX_LAYOUT["identity_detail_height"]

    career_row = faculty_row + 1
    sheet.merge_cells(
        start_row=career_row,
        start_column=detail_start_column,
        end_row=career_row,
        end_column=detail_end_column,
    )
    career_cell = sheet.cell(career_row, detail_start_column, institutional_detail_line("career"))
    career_cell.font = Font(size=10)
    career_cell.alignment = Alignment(horizontal="left", vertical="center")
    identity_border = Side(style="thin", color="D5DEE3")
    for column in range(1, len(INSTITUTIONAL_HEADERS) + 1):
        sheet.cell(career_row, column).border = Border(bottom=identity_border)
    sheet.row_dimensions[career_row].height = XLSX_LAYOUT["identity_detail_height"]

    filters_title_row = career_row + XLSX_LAYOUT["section_gap_rows"] + 1
    sheet.merge_cells(
        start_row=filters_title_row,
        start_column=1,
        end_row=filters_title_row,
        end_column=len(INSTITUTIONAL_HEADERS),
    )
    title_cell = sheet.cell(filters_title_row, 1, "FILTROS APLICADOS")
    title_cell.font = Font(bold=True, color="174A5B")
    title_cell.alignment = Alignment(vertical="center")
    sheet.row_dimensions[filters_title_row].height = 19

    filters_start_row = filters_title_row + 1
    filters_end_row = write_xlsx_filters(sheet, summary, filters_start_row)
    metadata_row = filters_end_row + 1
    for group, (label, value, number_format) in zip(
        XLSX_LAYOUT["metadata_groups"],
        (
            ("Fecha de generación:", generated_at.replace(tzinfo=None), "dd/mm/yyyy hh:mm"),
            ("Total de registros:", len(rows), None),
        ),
    ):
        write_xlsx_label_value(
            sheet,
            metadata_row,
            label,
            value,
            group,
            value_number_format=number_format,
        )
    metadata_border = Side(style="thin", color="D5DEE3")
    for column in range(1, len(INSTITUTIONAL_HEADERS) + 1):
        sheet.cell(metadata_row, column).border = Border(top=metadata_border)
    sheet.row_dimensions[metadata_row].height = 19

    table_header_row = metadata_row + XLSX_LAYOUT["table_gap_rows"] + 1
    sheet.row_dimensions[table_header_row - 1].height = 7
    for column, header in enumerate(INSTITUTIONAL_HEADERS, 1):
        cell = sheet.cell(table_header_row, column, header)
        cell.font = Font(color="FFFFFF", bold=True)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = Border(top=thin, bottom=thin, left=thin, right=thin)
    sheet.row_dimensions[table_header_row].height = 30
    for row_number, row in enumerate(rows, table_header_row + 1):
        for column, key in enumerate(INSTITUTIONAL_KEYS, 1):
            cell = sheet.cell(row_number, column, safe_spreadsheet_text(row[key]))
            cell.alignment = Alignment(horizontal="center" if column in {1, 4, 5} else "left", vertical="top", wrap_text=True)
            cell.border = Border(top=thin, bottom=thin, left=thin, right=thin)
    first_data_row = table_header_row + 1
    sheet.freeze_panes = f"A{first_data_row}"
    sheet.auto_filter.ref = f"A{table_header_row}:{last_column}{max(table_header_row, table_header_row + len(rows))}"
    sheet.page_setup.paperSize = sheet.PAPERSIZE_A4
    sheet.page_setup.orientation = sheet.ORIENTATION_LANDSCAPE
    sheet.page_setup.fitToWidth = 1; sheet.page_setup.fitToHeight = 0
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.page_margins = PageMargins(left=0.3, right=0.3, top=0.5, bottom=0.5, header=0.2, footer=0.2)
    sheet.print_title_rows = f"{table_header_row}:{table_header_row}"
    sheet.print_area = f"A1:{last_column}{max(table_header_row, table_header_row + len(rows))}"
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


def export_html(rows, filtros, generated_at):
    summary = "".join(f"<div><strong>{escape(str(label))}:</strong> {escape(str(value))}</div>" for label, value in filter_summary(filtros))
    body_rows = "".join(
        "<tr>" + "".join(f"<td>{escape(str(row[key]))}</td>" for key in INSTITUTIONAL_KEYS) + "</tr>"
        for row in rows
    )
    headers = "".join(f"<th>{escape(header)}</th>" for header in INSTITUTIONAL_HEADERS)
    generated = timezone.localtime(generated_at).strftime("%d/%m/%Y %H:%M")
    identity = INSTITUTIONAL_IDENTITY
    logo_content = report_logo_bytes()
    logo = (
        f'<img class="institutional-logo" src="data:image/png;base64,{base64.b64encode(logo_content).decode("ascii")}" '
        f'alt="{escape(identity["university"])}">'
        if logo_content is not None else ""
    )
    return f"""<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Reporte de postulaciones</title><style>
@page {{ size: A4 landscape; margin: 10mm; }}
* {{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
html, body {{ width: 100%; margin: 0; padding: 0; }}
body {{ font-family: Arial, sans-serif; color: #111; font-size: 10.5pt; line-height: 1.25; }}
.report-header {{ position: relative; margin-bottom: 10px; border-bottom: 1px solid #9ca3af; padding-bottom: 6px; }}
.logo-wrap {{ position: absolute; top: 0; left: 0; width: 92px; display: flex; justify-content: center; align-items: center; }}
.institutional-logo {{ display: block; max-width: 62px; max-height: 68px; object-fit: contain; }}
.identity {{ min-height: 68px; text-align: center; }}
.identity p, .identity h1 {{ margin: 2px 0; }}
.university {{ font-size: 14pt; font-weight: bold; }}
.university-name {{ font-size: 13pt; font-weight: bold; }}
.location {{ font-size: 9pt; }}
.identity h1 {{ margin-top: 7px; font-size: 15pt; }}
.institution-details {{ margin-top: 6px; text-align: left; font-size: 10pt; line-height: 1.35; }}
.institution-details p {{ margin: 1px 0; }}
.filter-title {{ margin: 0 0 4px; font-size: 10.5pt; }}
.meta {{ display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 3px 28px; margin: 0 0 10px; font-size: 10pt; }}
table {{ width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10pt; }}
thead {{ display: table-header-group; }}
tr {{ break-inside: avoid; page-break-inside: avoid; }}
th,td {{ border: 1px solid #777; padding: 5px 6px; vertical-align: top; overflow-wrap: anywhere; }}
th {{ background: #e5e7eb; text-align: center; font-weight: bold; }}
th:nth-child(1), td:nth-child(1) {{ width: 5.5%; }}
th:nth-child(2), td:nth-child(2) {{ width: 21%; }}
th:nth-child(3), td:nth-child(3) {{ width: 19%; }}
th:nth-child(4), td:nth-child(4) {{ width: 9%; }}
th:nth-child(5), td:nth-child(5) {{ width: 10%; }}
th:nth-child(6), td:nth-child(6) {{ width: 20.5%; }}
th:nth-child(7), td:nth-child(7) {{ width: 15%; }}
td:nth-child(1),td:nth-child(4),td:nth-child(5) {{ text-align: center; }}
</style></head><body><header class=\"report-header\"><div class=\"logo-wrap\">{logo}</div><div class=\"identity\"><p class=\"university\">{escape(identity["university"])}</p><p class=\"university-name\">{escape(identity["university_name"])}</p><p class=\"location\">{escape(identity["location"])}</p><h1>{escape(identity["report"])}</h1></div><div class=\"institution-details\"><p>{escape(institutional_detail_line("faculty"))}</p><p>{escape(institutional_detail_line("career"))}</p></div></header><h2 class=\"filter-title\">FILTROS APLICADOS</h2><section class=\"meta\">{summary}<div><strong>Fecha de generación:</strong> {generated}</div><div><strong>Total de registros:</strong> {len(rows)}</div></section><table><thead><tr>{headers}</tr></thead><tbody>{body_rows}</tbody></table></body></html>"""


ACADEMIC_RESULT_HEADERS = [
    "N.º",
    "Estudiante",
    "RU",
    "Modalidad",
    "Periodo",
    "Estado",
    "Valor académico",
    "Resultado académico",
]
ACADEMIC_RESULT_XLSX_HEADERS = [
    *ACADEMIC_RESULT_HEADERS[:-1],
    "Resultado académico",
]
ACADEMIC_RESULTS_REPORT_TITLE = "REPORTE DE RESULTADOS ACADÉMICOS"
ACADEMIC_RESULT_WIDTHS = (8, 28, 15, 23, 14, 22, 22, 44)
ACADEMIC_RESULT_XLSX_LABELS = {
    "POSTERGADO": "Postergado",
    "APROBADO": "Aprobado",
    "APROBACION_PLENA": "Aprobación plena",
    "APROBACION_PLENA_CON_FELICITACION": "Aprobación plena con felicitación",
    "BUENO": "Bueno",
    "MUY_BUENO": "Muy Bueno",
    "EXCELENTE": "Excelente",
    "FAVORABLE": "Favorable",
    "DESFAVORABLE": "Desfavorable",
}
ACADEMIC_EXPORT_ACTIONS = {
    "xlsx": "EXPORT_ACADEMIC_RESULTS_XLSX",
    "html": "PRINT_ACADEMIC_RESULTS",
}
ACADEMIC_FILTER_KEYS = {
    "buscar",
    "gestion",
    "semestre",
    "modalidad",
    "estado_administrativo",
}
ACADEMIC_AVAILABILITY_LABELS = {
    "INCOMPLETO": "Información incompleta",
    "SIN_RESULTADO": "Sin resultado disponible",
    "SIN_NOTA_NUMERICA": "Sin valor numérico",
    "HISTORICO_SIN_EVIDENCIA": "Sin evidencia histórica",
    "NO_SOPORTADO": "Resultado académico no disponible para esta modalidad",
}


def academic_filter_summary(filtros):
    from apps.academico.models import Modalidad
    from apps.postulantes.models import EstadoPostulacion

    modalidad = Modalidad.objects.filter(pk=filtros.get("modalidad")).values_list("nombre", flat=True).first()
    estado = EstadoPostulacion.objects.filter(pk=filtros.get("estado_administrativo")).values_list("nombre", flat=True).first()
    return [
        ("Búsqueda", filtros.get("buscar") or "Sin filtro"),
        ("Gestión", filtros.get("gestion") or "Todas"),
        ("Semestre", filtros.get("semestre") or "Todos"),
        ("Modalidad", modalidad or "Todas"),
        ("Estado administrativo", estado or "Todos"),
    ]


def academic_result_value(result):
    semantic = result["semantica_valor_numerico"]
    if semantic == "CALIFICACION_FINAL" and result["nota_final"] is not None:
        value = str(result["nota_final"])
    elif semantic == "PROMEDIO_ACADEMICO" and result["promedio_academico"] is not None:
        value = str(result["promedio_academico"])
    else:
        return "—"
    return f"{value}\nEscala {result['escala']}" if result["escala"] else value


def academic_result_description(result):
    lines = []
    if result["resultado"]:
        lines.append(f"Resultado: {readable_code(result['resultado'])}")
    if result["clasificacion"]:
        lines.append(f"Clasificación: {readable_code(result['clasificacion'])}")
    if result["reconocimiento"]:
        lines.append(f"Reconocimiento: {result['reconocimiento']}")
    if result["definitivo"]:
        lines.append("Resultado definitivo")
    else:
        lines.append("Resultado no definitivo")
    availability = ACADEMIC_AVAILABILITY_LABELS.get(result["estado_disponibilidad"])
    if availability:
        lines.append(availability)
    if result["proceso_concluido"] is True:
        lines.append("Proceso concluido")
    if result["limitacion"]:
        lines.append(f"Limitación: {result['limitacion']}")
    return "\n".join(lines)


def academic_result_row(result, numero):
    academic_result = result["resultado_academico"]
    estado_administrativo = result["estado_administrativo"]
    if estado_administrativo:
        estado = estado_administrativo["nombre"] or readable_code(estado_administrativo["codigo"])
    else:
        estado = "Sin estado"
    return [
        numero,
        result["estudiante"]["nombre"],
        result["estudiante"]["ru"] or "—",
        result["modalidad"]["nombre"],
        result["periodo"],
        estado,
        academic_result_value(academic_result),
        academic_result_description(academic_result),
    ]


def academic_result_xlsx_row(result, numero):
    row = academic_result_row(result, numero)
    academic_result = result["resultado_academico"]
    semantic = academic_result["semantica_valor_numerico"]
    if semantic == "CALIFICACION_FINAL" and academic_result["nota_final"] is not None:
        row[6] = str(academic_result["nota_final"])
    elif semantic == "PROMEDIO_ACADEMICO" and academic_result["promedio_academico"] is not None:
        row[6] = str(academic_result["promedio_academico"])
    else:
        row[6] = "—"

    if not academic_result["definitivo"]:
        row[7] = "—"
    else:
        canonical_result = academic_result["clasificacion"] or academic_result["resultado"]
        row[7] = ACADEMIC_RESULT_XLSX_LABELS.get(
            canonical_result,
            readable_code(canonical_result, "—"),
        )
    return row


def export_academic_results_xlsx(rows, filtros, generated_at):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Resultados académicos"
    headers = ACADEMIC_RESULT_XLSX_HEADERS
    last_column = get_column_letter(len(headers))
    sheet.sheet_view.showGridLines = False
    for column, width in enumerate(ACADEMIC_RESULT_WIDTHS, start=1):
        sheet.column_dimensions[get_column_letter(column)].width = width

    identity_end_row = write_xlsx_identity_for_columns(sheet, len(headers))
    title_row = identity_end_row + 1
    sheet.merge_cells(start_row=title_row, start_column=1, end_row=title_row, end_column=len(headers))
    title_cell = sheet.cell(title_row, 1, ACADEMIC_RESULTS_REPORT_TITLE)
    title_cell.font = Font(size=XLSX_LAYOUT["title_size"], bold=True, color="174A5B")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    sheet.row_dimensions[title_row].height = XLSX_LAYOUT["title_height"]

    faculty_row = title_row + 1
    for row_number, detail_key in (
        (faculty_row, "faculty"),
        (faculty_row + 1, "career"),
    ):
        sheet.merge_cells(start_row=row_number, start_column=1, end_row=row_number, end_column=len(headers))
        cell = sheet.cell(row_number, 1, institutional_detail_line(detail_key))
        cell.font = Font(size=10)
        cell.alignment = Alignment(horizontal="left", vertical="center")
        sheet.row_dimensions[row_number].height = XLSX_LAYOUT["identity_detail_height"]
    identity_border = Side(style="thin", color="D5DEE3")
    for column in range(1, len(headers) + 1):
        sheet.cell(faculty_row + 1, column).border = Border(bottom=identity_border)

    filters_title_row = faculty_row + XLSX_LAYOUT["section_gap_rows"] + 2
    sheet.merge_cells(start_row=filters_title_row, start_column=1, end_row=filters_title_row, end_column=len(headers))
    filters_title = sheet.cell(filters_title_row, 1, "FILTROS APLICADOS")
    filters_title.font = Font(bold=True, color="174A5B")
    filters_title.alignment = Alignment(vertical="center")
    sheet.row_dimensions[filters_title_row].height = 19
    filter_groups = ((1, 2, 3, 4), (5, 5, 6, 8))
    filters_end_row = write_xlsx_filters(sheet, academic_filter_summary(filtros), filters_title_row + 1, filter_groups)

    metadata_row = filters_end_row + 1
    write_xlsx_label_value(
        sheet,
        metadata_row,
        "Fecha de generación:",
        generated_at.replace(tzinfo=None),
        (1, 2, 3, 4),
        value_number_format="dd/mm/yyyy hh:mm",
    )
    write_xlsx_label_value(sheet, metadata_row, "Total de registros:", len(rows), (5, 6, 7, 8))
    for column in range(1, len(headers) + 1):
        sheet.cell(metadata_row, column).border = Border(top=identity_border)
    sheet.row_dimensions[metadata_row].height = 19

    header_row = metadata_row + XLSX_LAYOUT["table_gap_rows"] + 1
    table_border = Side(style="thin", color="B8C2CC")
    cell_border = Border(top=table_border, bottom=table_border, left=table_border, right=table_border)
    for column, header in enumerate(headers, 1):
        cell = sheet.cell(header_row, column, header)
        cell.font = Font(color="FFFFFF", bold=True)
        cell.fill = PatternFill("solid", fgColor="276678")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = cell_border
    sheet.row_dimensions[header_row].height = 30

    for row_number, row in enumerate(rows, header_row + 1):
        for column, value in enumerate(row, 1):
            cell = sheet.cell(row_number, column, safe_spreadsheet_text(value))
            cell.alignment = Alignment(
                horizontal="center" if column in {1, 3, 5, 7} else "left",
                vertical="center",
                wrap_text=True,
            )
            cell.border = cell_border

    first_data_row = header_row + 1
    sheet.freeze_panes = f"A{first_data_row}"
    sheet.auto_filter.ref = f"A{header_row}:{last_column}{max(header_row, header_row + len(rows))}"
    sheet.page_setup.paperSize = sheet.PAPERSIZE_A4
    sheet.page_setup.orientation = sheet.ORIENTATION_LANDSCAPE
    sheet.page_setup.fitToWidth = 1
    sheet.page_setup.fitToHeight = 0
    sheet.sheet_properties.pageSetUpPr.fitToPage = True
    sheet.page_margins = PageMargins(left=0.3, right=0.3, top=0.5, bottom=0.5, header=0.2, footer=0.2)
    sheet.print_title_rows = f"{header_row}:{header_row}"
    sheet.print_area = f"A1:{last_column}{max(header_row, header_row + len(rows))}"
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


def export_academic_results_html(rows, filtros, generated_at):
    summary = "".join(
        f"<div><strong>{escape(label)}:</strong> {escape(str(value))}</div>"
        for label, value in academic_filter_summary(filtros)
    )
    headers = "".join(f"<th>{escape(header)}</th>" for header in ACADEMIC_RESULT_HEADERS)
    body_rows = "".join(
        "<tr>" + "".join(f"<td>{escape(str(value)).replace(chr(10), '<br>')}</td>" for value in row) + "</tr>"
        for row in rows
    )
    generated = timezone.localtime(generated_at).strftime("%d/%m/%Y %H:%M")
    identity = INSTITUTIONAL_IDENTITY
    logo_content = report_logo_bytes()
    logo = (
        f'<img class="institutional-logo" src="data:image/png;base64,{base64.b64encode(logo_content).decode("ascii")}" '
        f'alt="{escape(identity["university"])}">'
        if logo_content is not None else ""
    )
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte de resultados académicos</title><style>
@page {{ size: A4 landscape; margin: 10mm; }}
* {{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
html, body {{ width: 100%; margin: 0; padding: 0; }}
body {{ font-family: Arial, sans-serif; color: #111; font-size: 10pt; line-height: 1.25; }}
.report-header {{ position: relative; margin-bottom: 10px; border-bottom: 1px solid #9ca3af; padding-bottom: 6px; }}
.logo-wrap {{ position: absolute; top: 0; left: 0; width: 92px; display: flex; justify-content: center; align-items: center; }}
.institutional-logo {{ display: block; max-width: 62px; max-height: 68px; object-fit: contain; }}
.identity {{ min-height: 68px; text-align: center; }}
.identity p, .identity h1 {{ margin: 2px 0; }}
.university {{ font-size: 14pt; font-weight: bold; }}
.university-name {{ font-size: 13pt; font-weight: bold; }}
.location {{ font-size: 9pt; }}
.identity h1 {{ margin-top: 7px; font-size: 15pt; }}
.institution-details {{ margin-top: 6px; text-align: left; font-size: 10pt; line-height: 1.35; }}
.institution-details p {{ margin: 1px 0; }}
.filter-title {{ margin: 0 0 4px; font-size: 10pt; }}
.meta {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 28px; margin: 0 0 10px; font-size: 9pt; }}
table {{ width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 8.5pt; }}
thead {{ display: table-header-group; }}
tr {{ break-inside: avoid; page-break-inside: avoid; }}
th, td {{ border: 1px solid #777; padding: 4px 5px; vertical-align: top; overflow-wrap: anywhere; }}
th {{ background: #e5e7eb; text-align: center; font-weight: bold; }}
th:nth-child(1), td:nth-child(1) {{ width: 5%; text-align: center; }}
th:nth-child(2), td:nth-child(2) {{ width: 17%; }}
th:nth-child(3), td:nth-child(3) {{ width: 9%; text-align: center; }}
th:nth-child(4), td:nth-child(4) {{ width: 14%; }}
th:nth-child(5), td:nth-child(5) {{ width: 9%; text-align: center; }}
th:nth-child(6), td:nth-child(6) {{ width: 13%; }}
th:nth-child(7), td:nth-child(7) {{ width: 9%; text-align: center; }}
th:nth-child(8), td:nth-child(8) {{ width: 24%; }}
</style></head><body><header class="report-header"><div class="logo-wrap">{logo}</div><div class="identity"><p class="university">{escape(identity["university"])}</p><p class="university-name">{escape(identity["university_name"])}</p><p class="location">{escape(identity["location"])}</p><h1>{ACADEMIC_RESULTS_REPORT_TITLE}</h1></div><div class="institution-details"><p>{escape(institutional_detail_line("faculty"))}</p><p>{escape(institutional_detail_line("career"))}</p></div></header><h2 class="filter-title">FILTROS APLICADOS</h2><section class="meta">{summary}<div><strong>Fecha de generación:</strong> {generated}</div><div><strong>Total de registros:</strong> {len(rows)}</div></section><table><thead><tr>{headers}</tr></thead><tbody>{body_rows}</tbody></table></body></html>"""


class AcademicResultsExportView(GenericAPIView):
    permission_classes = (CanExportReports,)

    def get(self, request):
        formato = request.query_params.get("formato", "").lower()
        if formato not in ACADEMIC_EXPORT_ACTIONS:
            raise ValidationError({"formato": "Solo se admite XLSX o HTML."})
        unsupported = set(request.query_params) - ACADEMIC_FILTER_KEYS - {"formato"}
        if unsupported:
            raise ValidationError({key: "Filtro no soportado para la exportación de resultados." for key in sorted(unsupported)})
        filter_params = request.query_params.copy()
        filter_params.pop("formato", None)
        serializer = ResultadoReportFilterSerializer(data=filter_params)
        serializer.is_valid(raise_exception=True)
        filtros = serializer.normalized()
        queryset = ResultadosAcademicosService.construir_queryset(filtros, request.user)
        count = queryset.count()
        limit = getattr(settings, "REPORT_EXPORT_MAX_ROWS", 5000)
        if count > limit:
            raise ValidationError({"detail": f"La exportación supera el límite de {limit} filas; aplique filtros."})

        postulaciones = list(queryset)
        resultados = ResultadoAcademicoReportService.resolver_lote(postulaciones)
        rows = [
            academic_result_xlsx_row(
                ResultadosAcademicosService.row(postulacion, resultados[postulacion.pk])
                | {"periodo": f"{postulacion.periodo.gestion} · {postulacion.periodo.semestre}"},
                index,
            )
            for index, postulacion in enumerate(postulaciones, start=1)
        ]
        generated_at = timezone.now()
        AuditLog.objects.create(
            usuario=request.user,
            accion=ACADEMIC_EXPORT_ACTIONS[formato],
            modulo="REPORTES",
            descripcion=f"{formato.upper()} de resultados académicos; filas={count}; filtros={json.dumps(filtros, default=str, sort_keys=True)}",
        )
        if formato == "xlsx":
            response = HttpResponse(
                export_academic_results_xlsx(rows, filtros, timezone.localtime(generated_at)),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = 'attachment; filename="reporte_resultados_academicos.xlsx"'
            return response
        response = HttpResponse(
            export_academic_results_html(rows, filtros, generated_at),
            content_type="text/html; charset=utf-8",
        )
        response["Content-Disposition"] = 'inline; filename="reporte_resultados_academicos.html"'
        return response


class ExportView(GenericAPIView):
    permission_classes=(CanExportReports,); serializer_class=ReportFilterSerializer
    @extend_schema(parameters=[ReportFilterSerializer],responses={200:bytes},description="Exportación CSV, XLSX institucional o HTML imprimible, con protección y límite configurable.")
    def get(self,request):
        formato = request.query_params.get("formato", "csv").lower()
        if formato not in EXPORT_ACTIONS: raise ValidationError({"formato":"Solo se admite CSV, XLSX o HTML."})
        f=filters(request); qs=ReportePostulacionesService.construir_queryset_postulaciones(f,request.user).order_by("created_at"); limit=getattr(settings,"REPORT_EXPORT_MAX_ROWS",5000); count=qs.count()
        if count>limit: raise ValidationError({"detail":f"La exportación supera el límite de {limit} filas; aplique filtros."})
        AuditLog.objects.create(usuario=request.user,accion=EXPORT_ACTIONS[formato],modulo="REPORTES",descripcion=f"{formato.upper()} de postulaciones exportado; filas={count}; filtros={json.dumps(f,default=str,sort_keys=True)}")
        generated_at = timezone.now()
        if formato == "xlsx":
            rows = ReportePostulacionesService.proyeccion_institucional(qs)
            response = HttpResponse(export_xlsx(rows, f, timezone.localtime(generated_at)), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            response["Content-Disposition"] = 'attachment; filename="reporte_postulaciones.xlsx"'
            return response
        if formato == "html":
            rows = ReportePostulacionesService.proyeccion_institucional(qs)
            response = HttpResponse(export_html(rows, f, generated_at), content_type="text/html; charset=utf-8")
            response["Content-Disposition"] = 'inline; filename="reporte_postulaciones.html"'
            return response
        rows = [export_row(ReportePostulacionesService.row(postulacion)) for postulacion in qs]
        stream=io.StringIO(); w=csv.writer(stream, delimiter=";", lineterminator="\r\n"); w.writerow(CSV_EXPORT_HEADERS)
        for row in rows: w.writerow([safe_csv(value) for value in row])
        response=HttpResponse("\ufeff"+stream.getvalue(),content_type="text/csv; charset=utf-8"); response["Content-Disposition"]='attachment; filename="postulaciones.csv"'; return response
