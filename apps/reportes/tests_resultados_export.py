from decimal import Decimal
from io import BytesIO
from unittest.mock import patch

from django.test import TestCase, override_settings
from openpyxl import load_workbook
from rest_framework.test import APIClient

from apps.academico.models import Modalidad, Periodo
from apps.postulantes.models import EstadoPostulacion, Postulacion
from apps.reportes.resultados import (
    EstadoDisponibilidad,
    ResultadoAcademicoDTO,
    SemanticaValorNumerico,
)
from apps.usuarios.models import AuditLog, CustomUser, Role


class AcademicResultsExportTests(TestCase):
    endpoint = "/api/v1/reportes/resultados/exportar/"

    def setUp(self):
        admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador exportación")
        teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente exportación")
        student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante exportación")
        self.admin = CustomUser.objects.create_user(username="academic-export-admin", role=admin_role, is_staff=True)
        self.teacher = CustomUser.objects.create_user(username="academic-export-teacher", role=teacher_role)
        self.student_role = student_role
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.period = Periodo.objects.create(
            nombre="2026-I-EXPORT",
            gestion=2026,
            semestre="I",
            fecha_inicio="2026-01-01",
            fecha_fin="2026-06-30",
        )
        self.modality = Modalidad.objects.create(codigo="PROYECTO_GRADO", nombre="Proyecto de Grado")
        diploma_modality = Modalidad.objects.create(codigo="DIPLOMADO", nombre="Diplomado")
        excellence_modality = Modalidad.objects.create(codigo="EXCELENCIA", nombre="Excelencia")
        self.status = EstadoPostulacion.objects.create(codigo="EN_PROCESO", nombre="En proceso")
        self.posts = []
        for index in range(1, 22):
            student = CustomUser.objects.create_user(
                username=f"academic-export-student-{index}",
                nombres="=SUM(A1:A2)" if index == 1 else f"Estudiante {index}",
                apellido_paterno="" if index == 1 else "Prueba",
                ru=f"RU-{index:03}",
                role=self.student_role,
            )
            self.posts.append(
                Postulacion.objects.create(
                    codigo=f"ACADEMIC-EXPORT-{index:03}",
                    estudiante=student,
                    modalidad=self.modality,
                    periodo=self.period,
                    estado_actual=self.status,
                )
            )
        self.posts[1].modalidad = excellence_modality
        self.posts[1].save(update_fields=("modalidad",))
        self.posts[5].modalidad = diploma_modality
        self.posts[5].save(update_fields=("modalidad",))
        self.posts[6].modalidad = excellence_modality
        self.posts[6].save(update_fields=("modalidad",))

    @staticmethod
    def dto(
        *,
        state=EstadoDisponibilidad.SIN_RESULTADO,
        definitive=False,
        note=None,
        average=None,
        semantic=None,
        result=None,
        classification=None,
        recognition=None,
        limitation=None,
        concluded=None,
        scale=None,
    ):
        return ResultadoAcademicoDTO(
            estado_disponibilidad=state,
            disponible=state not in {
                EstadoDisponibilidad.SIN_RESULTADO,
                EstadoDisponibilidad.HISTORICO_SIN_EVIDENCIA,
            },
            definitivo=definitive,
            nota_final=note,
            escala=scale,
            resultado=result,
            clasificacion=classification,
            reconocimiento=recognition,
            limitacion=limitation,
            semantica_valor_numerico=semantic,
            promedio_academico=average,
            proceso_concluido=concluded,
        )

    def resolver(self, posts):
        values = (
            self.dto(
                state=EstadoDisponibilidad.DEFINITIVO,
                definitive=True,
                note=Decimal("95.00"),
                semantic=SemanticaValorNumerico.CALIFICACION_FINAL,
                result="APROBACION_PLENA_CON_FELICITACION",
                classification="APROBACION_PLENA_CON_FELICITACION",
                concluded=True,
                scale="0-100",
            ),
            self.dto(
                state=EstadoDisponibilidad.DEFINITIVO,
                definitive=True,
                average=Decimal("88.50"),
                semantic=SemanticaValorNumerico.PROMEDIO_ACADEMICO,
                result="FAVORABLE",
                scale="0-100",
            ),
            self.dto(
                state=EstadoDisponibilidad.SIN_NOTA_NUMERICA,
                definitive=True,
                result="FAVORABLE",
                recognition="Reconocimiento institucional",
            ),
            self.dto(
                state=EstadoDisponibilidad.INCOMPLETO,
                definitive=False,
                classification="EXCELENTE",
                limitation="Falta consolidar el resultado.",
            ),
            self.dto(state=EstadoDisponibilidad.HISTORICO_SIN_EVIDENCIA),
            self.dto(
                state=EstadoDisponibilidad.DEFINITIVO,
                definitive=True,
                note=Decimal("95.00"),
                semantic=SemanticaValorNumerico.CALIFICACION_FINAL,
                result="EXCELENTE",
                classification="EXCELENTE",
                scale="1-100",
            ),
            self.dto(
                state=EstadoDisponibilidad.DEFINITIVO,
                definitive=True,
                result="DESFAVORABLE",
            ),
            self.dto(
                state=EstadoDisponibilidad.DEFINITIVO,
                definitive=True,
                note=Decimal("70.00"),
                semantic=SemanticaValorNumerico.CALIFICACION_FINAL,
                result="APROBADO",
                classification="APROBADO",
                scale="0-100",
            ),
        )
        return {
            post.pk: values[index] if index < len(values) else self.dto()
            for index, post in enumerate(sorted(posts, key=lambda item: item.pk))
        }

    @patch("apps.reportes.views.ResultadoAcademicoReportService.resolver_lote")
    def test_xlsx_ocho_columnas_universo_completo_identidad_y_semantica(self, resolver):
        resolver.side_effect = self.resolver
        response = self.client.get(self.endpoint + "?formato=xlsx")

        self.assertEqual(response.status_code, 200, response.content[:200].decode("utf-8", errors="replace"))
        self.assertEqual(response["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.assertIn("reporte_resultados_academicos.xlsx", response["Content-Disposition"])
        sheet = load_workbook(BytesIO(response.content), data_only=False).active
        self.assertEqual(sheet.title, "Resultados académicos")
        self.assertEqual(sheet["A1"].value, "UNIVERSIDAD AUTÓNOMA DEL BENI")
        self.assertEqual(sheet["A2"].value, "“JOSÉ BALLIVIÁN”")
        self.assertEqual(sheet["A3"].value, "TRINIDAD - BENI - BOLIVIA")
        self.assertEqual(sheet["A4"].value, "REPORTE DE RESULTADOS ACADÉMICOS")
        self.assertEqual(sheet["A5"].value, "FACULTAD: INGENIERÍA Y TECNOLOGÍA")
        self.assertEqual(sheet["A6"].value, "CARRERA: INGENIERÍA DE SISTEMAS (LICENCIATURA - TRINIDAD)")
        self.assertEqual(sheet["A8"].value, "FILTROS APLICADOS")
        self.assertEqual(sheet["A12"].value, "Fecha de generación:")
        self.assertEqual(sheet["E12"].value, "Total de registros:")
        self.assertEqual(sheet["G12"].value, 21)
        self.assertEqual(len(sheet._images), 1)

        header_row = int(sheet.auto_filter.ref.split(":")[0][1:])
        self.assertEqual(
            [sheet.cell(header_row, column).value for column in range(1, 9)],
            ["N.º", "Estudiante", "RU", "Modalidad", "Periodo", "Estado", "Valor académico", "Resultado académico"],
        )
        self.assertNotIn("Resultado / clasificación", [
            sheet.cell(header_row, column).value for column in range(1, 9)
        ])
        rows = {
            row[2]: row
            for row in sheet.iter_rows(min_row=header_row + 1, values_only=True)
        }
        self.assertEqual(len(rows), 21)
        self.assertEqual(rows["RU-001"][1], "'=SUM(A1:A2)")
        self.assertEqual(rows["RU-001"][6], "95.00")
        self.assertNotIn("Escala 0-100", rows["RU-001"][6])
        self.assertEqual(rows["RU-001"][7], "Aprobación plena con felicitación")
        self.assertEqual(rows["RU-002"][6], "88.50")
        self.assertEqual(rows["RU-002"][7], "Favorable")
        self.assertEqual(rows["RU-003"][6], "—")
        self.assertEqual(rows["RU-003"][7], "Favorable")
        self.assertEqual(rows["RU-004"][7], "—")
        self.assertEqual(rows["RU-005"][7], "—")
        self.assertEqual(rows["RU-006"][6], "95.00")
        self.assertEqual(rows["RU-006"][7], "Excelente")
        self.assertEqual(rows["RU-006"][3], "Diplomado")
        self.assertEqual(rows["RU-002"][3], "Excelencia")
        self.assertEqual(rows["RU-002"][7], "Favorable")
        self.assertEqual(rows["RU-007"][3], "Excelencia")
        self.assertEqual(rows["RU-007"][7], "Desfavorable")
        self.assertEqual(rows["RU-008"][6], "70.00")
        self.assertEqual(rows["RU-008"][7], "Aprobado")
        for row in rows.values():
            self.assertNotIn("Resultado:", str(row[7]))
            self.assertNotIn("Clasificación:", str(row[7]))
            self.assertNotIn("Resultado definitivo", str(row[7]))
            self.assertNotIn("Proceso concluido", str(row[7]))
        self.assertNotIn("SIN_NOTA_NUMERICA", str(rows["RU-003"]))
        self.assertEqual(sheet.column_dimensions["H"].width, 44)
        self.assertEqual(sheet.freeze_panes, f"A{header_row + 1}")
        self.assertEqual(sheet.auto_filter.ref, f"A{header_row}:H{header_row + 21}")
        self.assertEqual(sheet.page_setup.orientation, "landscape")
        self.assertEqual(sheet.page_setup.paperSize, 9)
        self.assertEqual(sheet.page_setup.fitToWidth, 1)
        self.assertEqual(sheet.page_setup.fitToHeight, 0)
        self.assertEqual(sheet.print_title_rows, f"${header_row}:${header_row}")
        self.assertTrue(sheet.print_area.endswith(f"$A$1:$H${header_row + 21}"))
        self.assertEqual(AuditLog.objects.filter(accion="EXPORT_ACADEMIC_RESULTS_XLSX").count(), 1)

    @patch("apps.reportes.views.ResultadoAcademicoReportService.resolver_lote")
    def test_html_filtros_tabla_imprimible_y_auditoria(self, resolver):
        resolver.side_effect = self.resolver
        response = self.client.get(self.endpoint + "?formato=html")

        self.assertEqual(response.status_code, 200)
        html = response.content.decode("utf-8")
        self.assertEqual(html.count("<th>"), 8)
        self.assertEqual(html.count("<tr>"), 22)
        self.assertIn("<th>Valor académico</th>", html)
        self.assertIn("<th>Resultado académico</th>", html)
        self.assertNotIn("Resultado / clasificación", html)
        self.assertIn("95.00", html)
        self.assertNotIn("Escala 0-100", html)
        self.assertIn("Aprobación plena con felicitación", html)
        self.assertIn("Aprobado", html)
        self.assertIn("Excelente", html)
        self.assertIn("Favorable", html)
        self.assertIn("Desfavorable", html)
        self.assertNotIn("Resultado:", html)
        self.assertNotIn("Clasificación:", html)
        self.assertNotIn("Resultado definitivo", html)
        self.assertNotIn("Proceso concluido", html)
        self.assertNotIn("Estado de disponibilidad", html)
        self.assertIn("<strong>Total de registros:</strong> 21", html)
        self.assertIn(
            "<td>RU-001</td><td>Proyecto de Grado</td><td>2026 · I</td><td>En proceso</td>"
            "<td>95.00</td><td>Aprobación plena con felicitación</td>",
            html,
        )
        self.assertIn(
            "<td>RU-008</td><td>Proyecto de Grado</td><td>2026 · I</td><td>En proceso</td>"
            "<td>70.00</td><td>Aprobado</td>",
            html,
        )
        self.assertIn(
            "<td>RU-006</td><td>Diplomado</td><td>2026 · I</td><td>En proceso</td>"
            "<td>95.00</td><td>Excelente</td>",
            html,
        )
        self.assertIn(
            "<td>RU-002</td><td>Excelencia</td><td>2026 · I</td><td>En proceso</td>"
            "<td>88.50</td><td>Favorable</td>",
            html,
        )
        self.assertIn(
            "<td>RU-007</td><td>Excelencia</td><td>2026 · I</td><td>En proceso</td>"
            "<td>—</td><td>Desfavorable</td>",
            html,
        )

        query = "formato=html&buscar=RU-001&gestion=2026&semestre=I&modalidad={}&estado_administrativo={}".format(
            self.modality.pk,
            self.status.pk,
        )
        filtered_response = self.client.get(self.endpoint + "?" + query)

        self.assertEqual(filtered_response.status_code, 200, filtered_response.content.decode("utf-8"))
        self.assertEqual(filtered_response["Content-Type"], "text/html; charset=utf-8")
        filtered_html = filtered_response.content.decode("utf-8")
        self.assertIn("<title>Reporte de resultados académicos</title>", filtered_html)
        self.assertIn("REPORTE DE RESULTADOS ACADÉMICOS", filtered_html)
        self.assertIn("UNIVERSIDAD AUTÓNOMA DEL BENI", filtered_html)
        self.assertIn("“JOSÉ BALLIVIÁN”", filtered_html)
        self.assertIn("TRINIDAD - BENI - BOLIVIA", filtered_html)
        self.assertIn("FACULTAD: INGENIERÍA Y TECNOLOGÍA", filtered_html)
        self.assertIn("CARRERA: INGENIERÍA DE SISTEMAS (LICENCIATURA - TRINIDAD)", filtered_html)
        self.assertIn('src="data:image/png;base64,', filtered_html)
        self.assertIn("<strong>Búsqueda:</strong> RU-001", filtered_html)
        self.assertIn("<strong>Gestión:</strong> 2026", filtered_html)
        self.assertIn("<strong>Semestre:</strong> I", filtered_html)
        self.assertIn("<strong>Total de registros:</strong> 1", filtered_html)
        self.assertIn("@page { size: A4 landscape; margin: 10mm; }", filtered_html)
        self.assertIn("thead { display: table-header-group; }", filtered_html)
        self.assertIn("break-inside: avoid", filtered_html)
        self.assertIn("page-break-inside: avoid", filtered_html)
        self.assertIn("th:nth-child(7), td:nth-child(7) { width: 9%; text-align: center; }", filtered_html)
        self.assertIn("th:nth-child(8), td:nth-child(8) { width: 24%; }", filtered_html)
        self.assertNotIn("window.print()", filtered_html)
        self.assertIn("</style></head><body><header", filtered_html)
        self.assertNotIn("Resultado / clasificación", filtered_html)
        self.assertNotIn("Resultado:", filtered_html)
        self.assertNotIn("Clasificación:", filtered_html)
        self.assertNotIn("Resultado definitivo", filtered_html)
        self.assertNotIn("Proceso concluido", filtered_html)
        self.assertNotIn("Graduado", filtered_html)
        self.assertEqual(AuditLog.objects.filter(accion="PRINT_ACADEMIC_RESULTS").count(), 2)
        self.assertEqual([len(call.args[0]) for call in resolver.call_args_list], [21, 1])

    def test_exportacion_rechaza_usuario_sin_permiso_y_formatos_no_soportados(self):
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.client.get(self.endpoint + "?formato=xlsx").status_code, 403)
        self.client.force_authenticate(self.posts[0].estudiante)
        self.assertEqual(self.client.get(self.endpoint + "?formato=html").status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(self.endpoint + "?formato=csv").status_code, 400)
        self.assertEqual(self.client.get(self.endpoint + "?formato=xlsx&definitivo=true").status_code, 400)
        self.assertEqual(self.client.get(self.endpoint + "?formato=xlsx&page=2").status_code, 400)

    @override_settings(REPORT_EXPORT_MAX_ROWS=20)
    def test_exportacion_respeta_limite_sin_auditar_rechazo(self):
        response = self.client.get(self.endpoint + "?formato=xlsx")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(AuditLog.objects.filter(accion="EXPORT_ACADEMIC_RESULTS_XLSX").count(), 0)
