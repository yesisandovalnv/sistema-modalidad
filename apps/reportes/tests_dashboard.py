import csv
from uuid import uuid4
from io import BytesIO, StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from django.conf import settings
from django.test import TestCase, override_settings
from PIL import Image as PillowImage
from openpyxl import load_workbook
from rest_framework.test import APIClient
from apps.academico.models import Modalidad,Periodo,EtapaModalidad
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento
from apps.postulantes.models import (CondicionPostulacion, EntregaFisica,
    EventoDefensa, EvaluacionDefensa, Postulacion, EstadoPostulacion,
    SeguimientoEtapa, AsignacionPostulacion)
from apps.notificaciones.models import Notificacion
from apps.usuarios.models import CustomUser,Role,AuditLog
from apps.reportes.views import INSTITUTIONAL_HEADERS, INSTITUTIONAL_IDENTITY, safe_csv, safe_spreadsheet_text


class ReportBase(TestCase):
    def setUp(self):
        ar=Role.objects.create(codigo="ADMINISTRADOR",nombre="Administrador R"); self.admin=CustomUser.objects.create_user(username="rep-admin",role=ar,is_staff=True); er=Role.objects.create(codigo="ESTUDIANTE",nombre="Estudiante R"); dr=Role.objects.create(codigo="DOCENTE",nombre="Docente R")
        self.student=CustomUser.objects.create_user(username="rep-est",nombres="Ana",apellido_paterno="Pérez",role=er); self.other=CustomUser.objects.create_user(username="rep-other",role=er); self.doc=CustomUser.objects.create_user(username="rep-doc",role=dr)
        self.mod=Modalidad.objects.create(codigo="PROYECTO_GRADO",nombre="Proyecto R"); self.period=Periodo.objects.create(nombre="2026-II-R",gestion=2026,semestre="II",fecha_inicio="2025-01-01",fecha_fin="2025-12-31"); self.reg=EstadoPostulacion.objects.create(codigo="REGISTRADA_R",nombre="Registrada R"); self.con=EstadoPostulacion.objects.create(codigo="CONCLUIDA",nombre="Concluida R")
        self.p=Postulacion.objects.create(codigo="REP-1",estudiante=self.student,modalidad=self.mod,periodo=self.period,estado_actual=self.reg); self.p2=Postulacion.objects.create(codigo="REP-2",estudiante=self.other,modalidad=self.mod,periodo=self.period,estado_actual=self.con)
        stage=EtapaModalidad.objects.create(modalidad=self.mod,codigo="INSCRIPCION",nombre="Inscripción",orden=1,origen_normativo="Norma"); SeguimientoEtapa.objects.create(postulacion=self.p,etapa=stage,estado="EN_PROCESO")
        AsignacionPostulacion.objects.create(postulacion=self.p,usuario=self.doc,tipo_participacion="TUTOR",designado_por=self.admin)
        self.client=APIClient(); self.client.force_authenticate(self.admin)


class DashboardTests(ReportBase):
    def test_resumen_distribuciones(self):
        r=self.client.get("/api/v1/reportes/dashboard/"); self.assertEqual(r.status_code,200); self.assertEqual(r.data["resumen"]["total_postulaciones"],2); self.assertEqual(r.data["resumen"]["concluidas"],1); self.assertEqual(r.data["modalidades"][0]["total"],2)
    def test_filtros_gestion_semestre(self): self.assertEqual(self.client.get("/api/v1/reportes/dashboard/?gestion=2026&semestre=II").data["resumen"]["total_postulaciones"],2)

    def test_reportes_no_infieren_clasificacion_desde_fechas(self):
        row = self.client.get("/api/v1/reportes/postulaciones/").data["results"][0]
        self.assertEqual((row["gestion"], row["semestre"]), (2026, "II"))
        self.assertEqual(self.client.get("/api/v1/reportes/dashboard/?gestion=2025&semestre=I").data["resumen"]["total_postulaciones"], 0)
    def test_modalidad_etapa_incoherente_400(self):
        m=Modalidad.objects.create(codigo="TESIS_GRADO",nombre="Tesis R"); e=EtapaModalidad.objects.create(modalidad=m,codigo="X",nombre="X",orden=1,origen_normativo="N")
        self.assertEqual(self.client.get(f"/api/v1/reportes/dashboard/?modalidad={self.mod.pk}&etapa_actual={e.pk}").status_code,400)
    def test_get_sin_efectos(self):
        before=AuditLog.objects.count(); self.client.get("/api/v1/reportes/dashboard/"); self.assertEqual(AuditLog.objects.count(),before); self.assertEqual(Notificacion.objects.count(),0)
    def test_notificaciones_solo_usuario(self):
        Notificacion.objects.create(destinatario=self.admin,tipo="A",titulo="T",mensaje="M",event_id=uuid4(),deduplication_key="ra",aggregate_type="X",aggregate_id="1")
        Notificacion.objects.create(destinatario=self.student,tipo="A",titulo="T",mensaje="M",event_id=uuid4(),deduplication_key="rb",aggregate_type="X",aggregate_id="1")
        self.assertEqual(self.client.get("/api/v1/reportes/dashboard/").data["notificaciones"]["no_leidas"],1)
    def test_cero_sin_division(self):
        Postulacion.objects.all().delete(); self.assertEqual(self.client.get("/api/v1/reportes/dashboard/").data["resumen"]["total_postulaciones"],0)

    def test_dashboard_historico_conserva_descriptivas_y_excluye_operativas(self):
        historico = Postulacion.objects.create(
            codigo="REP-DASH-HIST",
            estudiante=self.student,
            modalidad=self.mod,
            periodo=self.period,
            estado_actual=self.con,
            vigencia=Postulacion.VigenciaChoices.CERRADA,
            tipo_registro=Postulacion.TipoRegistroChoices.HISTORICO,
        )
        etapa = EtapaModalidad.objects.create(
            modalidad=self.mod,
            codigo="DEFENSA_PUBLICA",
            nombre="Defensa Pública",
            orden=2,
            origen_normativo="Norma",
        )
        seguimiento = SeguimientoEtapa.objects.create(
            postulacion=historico,
            etapa=etapa,
            estado=SeguimientoEtapa.EstadoChoices.APROBADA,
        )
        estado_env = EstadoDocumento.objects.create(codigo="ENV_DASH", nombre="Enviado")
        estado_apr = EstadoDocumento.objects.create(codigo="APR", nombre="Aprobado")
        estado_rec = EstadoDocumento.objects.create(codigo="REC", nombre="Rechazado")
        for codigo, estado, requiere_correccion in (
            ("DASH_ENV", estado_env, True),
            ("DASH_APR", estado_apr, False),
            ("DASH_REC", estado_rec, False),
        ):
            DocumentoPostulacion.objects.create(
                postulacion=historico,
                tipo_documento=TipoDocumento.objects.create(codigo=codigo, nombre=codigo),
                estado=estado,
                requiere_correccion=requiere_correccion,
            )
        CondicionPostulacion.objects.create(
            postulacion=historico,
            codigo="PLAN_ESTUDIOS",
            tipo="PLAN_ESTUDIOS",
            nombre="Plan de estudios",
            estado=CondicionPostulacion.Estado.PENDIENTE,
        )
        EntregaFisica.objects.create(
            postulacion=historico,
            codigo="CD_RESPALDO",
            nombre="CD de respaldo",
            estado=EntregaFisica.Estado.PENDIENTE,
        )
        evento = EventoDefensa.objects.create(
            postulacion=historico,
            seguimiento_etapa=seguimiento,
            tipo_evento=EventoDefensa.Tipo.DEFENSA_PUBLICA,
            fecha_programada="2026-12-01T10:00:00Z",
            lugar="Sala RED",
            programado_por=self.admin,
        )
        EvaluacionDefensa.objects.create(
            evento=evento,
            tipo_evaluacion=EvaluacionDefensa.Tipo.RESULTADO_FINAL,
            modalidad_registro=EvaluacionDefensa.ModalidadRegistro.CONSENSO,
            es_resultado_final_evento=True,
            registrado_por=self.admin,
        )

        response = self.client.get("/api/v1/reportes/dashboard/?tipo_registro=HISTORICO")
        self.assertEqual(response.status_code, 200)
        data = response.data
        expectations = {
            "total_postulaciones": (data["resumen"]["total_postulaciones"], 1),
            "concluidas": (data["resumen"]["concluidas"], 1),
            "sin_etapa_actual": (data["resumen"]["sin_etapa_actual"], 0),
            "modalidades": (data["modalidades"], [{"codigo": "PROYECTO_GRADO", "nombre": "Proyecto R", "total": 1}]),
            "estados": (data["estados"], [{"codigo": "CONCLUIDA", "nombre": "Concluida R", "total": 1}]),
            "tendencia": (data["tendencia"], [{"gestion": 2026, "total": 1}]),
            "etapas": (data["etapas"], []),
            "documentos.total": (data["documentos"]["total"], 3),
            "documentos.pendientes": (data["documentos"]["pendientes"], 0),
            "documentos.aprobados": (data["documentos"]["aprobados"], 1),
            "documentos.rechazados": (data["documentos"]["rechazados"], 1),
            "documentos.observados": (data["documentos"]["observados"], 1),
            "documentos.sin_version_vigente": (data["documentos"]["sin_version_vigente"], 3),
            "documentos.postulaciones_con_correcciones": (data["documentos"]["postulaciones_con_correcciones"], 1),
            "defensas.programadas": (data["defensas"]["programadas"], 0),
            "defensas.en_curso": (data["defensas"]["en_curso"], 0),
            "defensas.finalizadas": (data["defensas"]["finalizadas"], 0),
            "defensas.suspendidas": (data["defensas"]["suspendidas"], 0),
            "defensas.canceladas": (data["defensas"]["canceladas"], 0),
            "defensas.proximas": (data["defensas"]["proximas"], 0),
            "defensas.evaluaciones_consolidadas": (data["defensas"]["evaluaciones_consolidadas"], 0),
            "cierre.revision_final_aprobada": (data["cierre"]["revision_final_aprobada"], 0),
            "cierre.cierre_documental_aprobado": (data["cierre"]["cierre_documental_aprobado"], 0),
            "cierre.condiciones_pendientes": (data["cierre"]["condiciones_pendientes"], 0),
            "cierre.entregas_pendientes": (data["cierre"]["entregas_pendientes"], 0),
        }
        for metric, (actual, expected) in expectations.items():
            with self.subTest(metric=metric):
                self.assertEqual(actual, expected)

    def test_dashboard_seguimiento_conserva_metricas_operativas(self):
        self.p.tipo_registro = Postulacion.TipoRegistroChoices.SEGUIMIENTO
        self.p.save(update_fields=["tipo_registro"])
        self.p2.tipo_registro = Postulacion.TipoRegistroChoices.HISTORICO
        self.p2.vigencia = Postulacion.VigenciaChoices.CERRADA
        self.p2.save(update_fields=["tipo_registro", "vigencia"])
        response = self.client.get("/api/v1/reportes/dashboard/?tipo_registro=SEGUIMIENTO")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resumen"], {
            "total_postulaciones": 1,
            "en_proceso": 1,
            "concluidas": 0,
            "rechazadas": 0,
            "sin_etapa_actual": 0,
        })
        self.assertEqual(response.data["documentos"]["pendientes"], 0)
        self.assertEqual(response.data["defensas"]["programadas"], 0)
        self.assertEqual(response.data["cierre"]["condiciones_pendientes"], 0)


class ReportListPermissionTests(ReportBase):
    def test_listado_paginado_campos(self):
        r=self.client.get("/api/v1/reportes/postulaciones/"); self.assertEqual(r.status_code,200); self.assertEqual(r.data["count"],2); self.assertIn("porcentaje_etapas_aprobadas",r.data["results"][0])
    def test_tutor_y_etapa_sin_n1_funcional(self):
        row=next(x for x in self.client.get("/api/v1/reportes/postulaciones/").data["results"] if x["postulacion_id"]==self.p.pk); self.assertEqual(row["tutor_activo"],self.doc.username); self.assertEqual(row["etapa_actual"],"INSCRIPCION")
    def test_reporte_expone_tipo_registro(self):
        self.p.tipo_registro = Postulacion.TipoRegistroChoices.SEGUIMIENTO
        self.p.save(update_fields=["tipo_registro"])
        self.p2.tipo_registro = Postulacion.TipoRegistroChoices.HISTORICO
        self.p2.vigencia = Postulacion.VigenciaChoices.CERRADA
        self.p2.save(update_fields=["tipo_registro", "vigencia"])
        rows = self.client.get("/api/v1/reportes/postulaciones/").data["results"]
        self.assertEqual({row["postulacion_id"]: row["tipo_registro"] for row in rows}[self.p.pk], Postulacion.TipoRegistroChoices.SEGUIMIENTO)
        self.assertEqual({row["postulacion_id"]: row["tipo_registro"] for row in rows}[self.p2.pk], Postulacion.TipoRegistroChoices.HISTORICO)
    def test_filtro_tipo_registro(self):
        self.p.tipo_registro = Postulacion.TipoRegistroChoices.SEGUIMIENTO
        self.p.save(update_fields=["tipo_registro"])
        self.p2.tipo_registro = Postulacion.TipoRegistroChoices.HISTORICO
        self.p2.vigencia = Postulacion.VigenciaChoices.CERRADA
        self.p2.save(update_fields=["tipo_registro", "vigencia"])
        seguimiento = self.client.get("/api/v1/reportes/postulaciones/?tipo_registro=SEGUIMIENTO")
        historico = self.client.get("/api/v1/reportes/postulaciones/?tipo_registro=HISTORICO")
        self.assertEqual(seguimiento.status_code, 200)
        self.assertEqual(seguimiento.data["count"], 1)
        self.assertTrue(all(row["tipo_registro"] == Postulacion.TipoRegistroChoices.SEGUIMIENTO for row in seguimiento.data["results"]))
        self.assertEqual(historico.status_code, 200)
        self.assertEqual(historico.data["count"], 1)
        self.assertTrue(all(row["tipo_registro"] == Postulacion.TipoRegistroChoices.HISTORICO for row in historico.data["results"]))
        self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/?tipo_registro=INVALIDO").status_code, 400)
    def test_historico_sin_etapas_no_inventa_avance(self):
        tipo_doc = TipoDocumento.objects.create(codigo="DOC_HISTORICO", nombre="Documento histórico", obligatorio=True)
        estado_doc = EstadoDocumento.objects.create(codigo="ENV", nombre="En validación")
        historico = Postulacion.objects.create(
            codigo="REP-HIST-1",
            estudiante=self.student,
            modalidad=self.mod,
            periodo=self.period,
            estado_actual=self.con,
            vigencia=Postulacion.VigenciaChoices.CERRADA,
            tipo_registro=Postulacion.TipoRegistroChoices.HISTORICO,
        )
        DocumentoPostulacion.objects.create(postulacion=historico, tipo_documento=tipo_doc, estado=estado_doc)
        row = next(x for x in self.client.get("/api/v1/reportes/postulaciones/").data["results"] if x["postulacion_id"] == historico.pk)
        self.assertEqual(row["tipo_registro"], Postulacion.TipoRegistroChoices.HISTORICO)
        self.assertIsNone(row["etapa_actual"])
        self.assertIsNone(row["porcentaje_etapas_aprobadas"])
        self.assertIsNone(row["documentos_pendientes"])
        self.assertIsNone(row["proxima_defensa"])
        self.assertFalse(row["cierre_aplicable"])
    def test_seguimiento_conserva_etapa_y_porcentaje(self):
        self.p.tipo_registro = Postulacion.TipoRegistroChoices.SEGUIMIENTO
        self.p.save(update_fields=["tipo_registro"])
        row = next(x for x in self.client.get("/api/v1/reportes/postulaciones/").data["results"] if x["postulacion_id"] == self.p.pk)
        self.assertEqual(row["etapa_actual"], "INSCRIPCION")
        self.assertIsNotNone(row["porcentaje_etapas_aprobadas"])
        self.assertNotEqual(row["porcentaje_etapas_aprobadas"], 0)
    def test_tesis_no_hereda_semantica_de_cierre_de_proyecto(self):
        tesis=Modalidad.objects.create(codigo="TESIS_GRADO",nombre="Tesis R")
        estudiante_tesis = CustomUser.objects.create_user(username="rep-tesis", role=self.student.role)
        post=Postulacion.objects.create(codigo="REP-TESIS",estudiante=estudiante_tesis,modalidad=tesis,periodo=self.period,estado_actual=self.reg)
        row=next(x for x in self.client.get("/api/v1/reportes/postulaciones/").data["results"] if x["postulacion_id"]==post.pk)
        self.assertFalse(row["cierre_aplicable"])
    def test_busqueda(self): self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/?buscar=Ana").data["count"],1)
    def test_ordering_invalido(self): self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/?ordering=password").status_code,400)
    def test_estudiante_prohibido(self): self.client.force_authenticate(self.student); self.assertEqual(self.client.get("/api/v1/reportes/dashboard/").status_code,403); self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/").status_code,403)
    def test_docente_solo_asignada(self): self.client.force_authenticate(self.doc); r=self.client.get("/api/v1/reportes/postulaciones/"); self.assertEqual(r.status_code,200); self.assertEqual(r.data["count"],1)
    def test_anonimo_401(self): self.client.force_authenticate(None); self.assertEqual(self.client.get("/api/v1/reportes/dashboard/").status_code,401)


class ExportTests(ReportBase):
    def test_formula_injection_variants(self):
        for value in ("=1+1", "+SUM(A1)", "-2+3", "@cmd", "  =1+1", "\t=1+1", "\r+cmd", "\n-cmd"):
            with self.subTest(value=value): self.assertTrue(safe_csv(value).startswith("'"))
        self.assertEqual(safe_csv('texto, "seguro" ñ'), 'texto, "seguro" ñ')
        self.assertEqual(safe_spreadsheet_text("=1+1"), "'=1+1")
        self.assertEqual(safe_spreadsheet_text("Texto seguro"), "Texto seguro")
    def test_csv_y_auditoria(self):
        r=self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=csv"); self.assertEqual(r.status_code,200); self.assertTrue(r.content.startswith(b"\xef\xbb\xbf")); self.assertIn(b";", r.content.splitlines()[1]); self.assertEqual(AuditLog.objects.filter(accion="EXPORT_APPLICATION_REPORT_CSV").count(),1)
    def test_csv_incluye_tipo_de_registro_y_historico_no_aplica(self):
        tipo_doc = TipoDocumento.objects.create(codigo="DOC_HISTORICO_CSV", nombre="Documento histórico CSV", obligatorio=True)
        estado_doc = EstadoDocumento.objects.create(codigo="ENV_CSV", nombre="En validación CSV")
        self.p.tipo_registro = Postulacion.TipoRegistroChoices.SEGUIMIENTO
        self.p.save(update_fields=["tipo_registro"])
        self.p2.tipo_registro = Postulacion.TipoRegistroChoices.HISTORICO
        self.p2.vigencia = Postulacion.VigenciaChoices.CERRADA
        self.p2.save(update_fields=["tipo_registro", "vigencia"])
        DocumentoPostulacion.objects.create(postulacion=self.p2, tipo_documento=tipo_doc, estado=estado_doc)
        r = self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=csv")
        self.assertEqual(r.status_code, 200)
        rows = list(csv.reader(StringIO(r.content.decode("utf-8-sig")), delimiter=";"))
        headers = rows[0]
        header_map = {header: index for index, header in enumerate(headers)}
        historic_row = next(row for row in rows[1:] if f"Postulación #{self.p2.pk}" in row)
        self.assertEqual(historic_row[header_map["Tipo de registro"]], "Histórico")
        self.assertEqual(historic_row[header_map["Etapa actual"]], "No aplica")
        self.assertEqual(historic_row[header_map["Avance (%)"]], "No aplica")
        self.assertEqual(historic_row[header_map["Documentos pendientes"]], "No aplica")
        self.assertEqual(historic_row[header_map["Próxima defensa"]], "No aplica")
        self.assertEqual(historic_row[header_map["Cierre"]], "No aplica")
    def test_export_filtra_por_tipo_registro(self):
        self.p.tipo_registro = Postulacion.TipoRegistroChoices.SEGUIMIENTO
        self.p.save(update_fields=["tipo_registro"])
        self.p2.tipo_registro = Postulacion.TipoRegistroChoices.HISTORICO
        self.p2.vigencia = Postulacion.VigenciaChoices.CERRADA
        self.p2.save(update_fields=["tipo_registro", "vigencia"])
        r = self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=csv&tipo_registro=HISTORICO")
        self.assertEqual(r.status_code, 200)
        rows = list(csv.reader(StringIO(r.content.decode("utf-8-sig")), delimiter=";"))
        historico_rows = [row for row in rows[1:] if "Histórico" in row]
        self.assertEqual(len(rows) - 1, 1)
        self.assertEqual(len(historico_rows), 1)
        self.assertIn("No aplica", historico_rows[0])
    def test_xlsx_historico_no_aplica_no_rompe(self):
        tipo_doc = TipoDocumento.objects.create(codigo="DOC_HISTORICO_XLSX", nombre="Documento histórico XLSX", obligatorio=True)
        estado_doc = EstadoDocumento.objects.create(codigo="ENV_XLSX", nombre="En validación XLSX")
        historico = Postulacion.objects.create(
            codigo="XLSX-HIST-1",
            estudiante=self.student,
            modalidad=self.mod,
            periodo=self.period,
            estado_actual=self.con,
            vigencia=Postulacion.VigenciaChoices.CERRADA,
            tipo_registro=Postulacion.TipoRegistroChoices.HISTORICO,
        )
        DocumentoPostulacion.objects.create(postulacion=historico, tipo_documento=tipo_doc, estado=estado_doc)
        r=self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=xlsx")
        self.assertEqual(r.status_code,200)
        self.assertEqual(r["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        sheet=load_workbook(BytesIO(r.content), data_only=False).active
        header_row = int(sheet.auto_filter.ref.split(":")[0][1:])
        headers = [sheet.cell(header_row, column).value for column in range(1, 8)]
        self.assertEqual(headers, INSTITUTIONAL_HEADERS)
        target_row = next(row for row in sheet.iter_rows(min_row=header_row + 1, values_only=True) if row[5] == "No aplica")
        self.assertEqual(target_row[5], "No aplica")
        self.assertEqual(len(target_row), 7)

    def test_xlsx_profesional_filtrado_y_auditoria(self):
        r=self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=xlsx&gestion=2026"); self.assertEqual(r.status_code,200)
        self.assertEqual(r["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); self.assertIn("reporte_postulaciones.xlsx", r["Content-Disposition"])
        sheet=load_workbook(BytesIO(r.content), data_only=False).active
        self.assertEqual(sheet["A1"].value, INSTITUTIONAL_IDENTITY["university"])
        self.assertEqual(sheet["A2"].value, INSTITUTIONAL_IDENTITY["university_name"])
        self.assertEqual(sheet["A3"].value, INSTITUTIONAL_IDENTITY["location"])
        self.assertEqual(sheet["A4"].value, INSTITUTIONAL_IDENTITY["report"])
        self.assertEqual(sheet["A5"].value, f"FACULTAD: {INSTITUTIONAL_IDENTITY['faculty']}")
        self.assertEqual(sheet["A6"].value, f"CARRERA: {INSTITUTIONAL_IDENTITY['career']}")
        self.assertEqual(sheet["A5"].alignment.horizontal, "left")
        self.assertEqual(sheet["A6"].alignment.horizontal, "left")
        self.assertEqual(sheet["A1"].alignment.horizontal, "center")
        self.assertEqual(sheet["A4"].alignment.horizontal, "center")
        merged_ranges = {str(cell_range) for cell_range in sheet.merged_cells.ranges}
        self.assertIn("A1:G1", merged_ranges)
        self.assertIn("A4:G4", merged_ranges)
        self.assertIn("A5:G5", merged_ranges)
        self.assertIn("A6:G6", merged_ranges)
        self.assertEqual(sheet["A8"].value, "FILTROS APLICADOS")
        self.assertEqual(sheet["A9"].value, "Gestión:")
        self.assertEqual(sheet["C9"].value, "2026")
        self.assertEqual(sheet["D9"].value, "Semestre:")
        self.assertEqual(sheet["F9"].value, "Todos")
        self.assertEqual(sheet["A10"].value, "Modalidad:")
        self.assertEqual(sheet["D10"].value, "Estado:")
        self.assertEqual(sheet["A11"].value, "Fecha de generación:")
        self.assertIsNone(sheet["E11"].value)
        self.assertEqual(sheet["F11"].value, "Total de registros:")
        self.assertEqual(sheet["G11"].value, 2)
        self.assertFalse(sheet.sheet_view.showGridLines)
        self.assertEqual(len(sheet._images), 1)
        with PillowImage.open(Path(settings.BASE_DIR) / "uab" / "logo" / "Logo-ac.png") as source_logo:
            self.assertAlmostEqual(
                sheet._images[0].width / sheet._images[0].height,
                source_logo.width / source_logo.height,
            )
        self.assertEqual(sheet._images[0].anchor._from.col, 0)
        self.assertEqual(sheet._images[0].anchor._from.row, 0)
        header_row = int(sheet.auto_filter.ref.split(":")[0][1:])
        headers = [sheet.cell(header_row, column).value for column in range(1, 8)]
        self.assertEqual(headers, INSTITUTIONAL_HEADERS)
        self.assertEqual(header_row, 13)
        rows = list(sheet.iter_rows(min_row=header_row + 1, values_only=True))
        self.assertEqual([row[0] for row in rows], [1, 2])
        self.assertEqual(sheet.freeze_panes, f"A{header_row + 1}")
        self.assertEqual(sheet.auto_filter.ref, f"A{header_row}:G{sheet.max_row}")
        self.assertEqual(
            [sheet.column_dimensions[column].width for column in "ABCDEFG"],
            [9, 30, 26, 12, 14, 27, 21],
        )
        self.assertEqual(
            [sheet.cell(header_row, column).alignment.horizontal for column in range(1, 8)],
            ["center"] * 7,
        )
        self.assertEqual(sheet.cell(header_row + 1, 1).alignment.horizontal, "center")
        self.assertEqual(sheet.cell(header_row + 1, 2).alignment.horizontal, "left")
        self.assertEqual(sheet.cell(header_row + 1, 4).alignment.horizontal, "center")
        self.assertEqual(sheet.cell(header_row + 1, 5).alignment.horizontal, "center")
        self.assertEqual(sheet.cell(header_row + 1, 6).alignment.horizontal, "left")
        self.assertEqual(sheet.cell(header_row + 1, 7).alignment.horizontal, "left")
        self.assertEqual(sheet.page_setup.orientation, "landscape")
        self.assertEqual(sheet.page_setup.paperSize, 9)
        self.assertEqual(sheet.page_setup.fitToWidth, 1)
        self.assertEqual(sheet.page_setup.fitToHeight, 0)
        self.assertEqual(sheet.sheet_properties.pageSetUpPr.fitToPage, True)
        self.assertEqual(sheet.page_margins.left, 0.3)
        self.assertEqual(sheet.page_margins.right, 0.3)
        self.assertEqual(sheet.print_title_rows, f"${header_row}:${header_row}")
        self.assertEqual(sheet.print_area, f"'Postulaciones'!$A$1:$G${sheet.max_row}")
        self.assertTrue(sheet.auto_filter.ref.startswith(f"A{header_row}:G"))
        self.assertNotIn("Usuario", [cell.value for row in sheet.iter_rows() for cell in row])
        self.assertNotIn(INSTITUTIONAL_IDENTITY["system"], [cell.value for row in sheet.iter_rows() for cell in row])
        self.assertEqual(AuditLog.objects.filter(accion="EXPORT_APPLICATION_REPORT_XLSX").count(),1)

    def test_xlsx_filtros_avanzados_expanden_layout_y_conservan_datos(self):
        response = self.client.get(
            "/api/v1/reportes/postulaciones/exportar/?formato=xlsx&buscar=Ana"
        )
        self.assertEqual(response.status_code, 200)
        sheet = load_workbook(BytesIO(response.content), data_only=False).active
        self.assertEqual(sheet["A11"].value, "Búsqueda:")
        self.assertEqual(sheet["C11"].value, "Ana")
        self.assertEqual(sheet["A12"].value, "Fecha de generación:")
        self.assertIsNone(sheet["E12"].value)
        self.assertEqual(sheet["F12"].value, "Total de registros:")
        self.assertEqual(sheet["G12"].value, 1)
        header_row = int(sheet.auto_filter.ref.split(":")[0][1:])
        self.assertEqual(header_row, 14)
        self.assertEqual(
            [sheet.cell(header_row, column).value for column in range(1, 8)],
            INSTITUTIONAL_HEADERS,
        )
        exported_rows = list(sheet.iter_rows(min_row=header_row + 1, values_only=True))
        self.assertEqual(len(exported_rows), 1)
        self.assertEqual(exported_rows[0][1], self.p.estudiante.nombre_completo)

    def test_xlsx_sanitiza_celdas_textuales(self):
        self.student.nombres = "=SUM(A1:A2)"
        self.student.apellido_paterno = ""
        self.student.save(update_fields=["nombres", "apellido_paterno"])
        response = self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=xlsx")
        sheet = load_workbook(BytesIO(response.content), data_only=False).active
        header_row = int(sheet.auto_filter.ref.split(":")[0][1:])
        names = [row[1] for row in sheet.iter_rows(min_row=header_row + 1, values_only=True)]
        self.assertIn("'=SUM(A1:A2)", names)

    def test_html_comparte_columnas_filtros_orden_total_y_auditoria(self):
        response = self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=html&gestion=2026&semestre=II")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/html; charset=utf-8")
        html = response.content.decode("utf-8")
        for header in INSTITUTIONAL_HEADERS:
            self.assertIn(f"<th>{header}</th>", html)
        self.assertEqual(html.count("<th>"), 7)
        self.assertIn("<strong>Gestión:</strong> 2026", html)
        self.assertIn("<strong>Semestre:</strong> II", html)
        self.assertIn("FILTROS APLICADOS", html)
        self.assertIn("<strong>Total de registros:</strong> 2", html)
        self.assertIn('<img class="institutional-logo" src="data:image/png;base64,', html)
        for key in ("university", "university_name", "location", "report", "faculty", "career"):
            self.assertIn(INSTITUTIONAL_IDENTITY[key], html)
        self.assertIn(f"<p>FACULTAD: {INSTITUTIONAL_IDENTITY['faculty']}</p>", html)
        self.assertIn(f"<p>CARRERA: {INSTITUTIONAL_IDENTITY['career']}</p>", html)
        self.assertNotIn(INSTITUTIONAL_IDENTITY["system"], html)
        self.assertNotIn("<strong>Búsqueda:</strong>", html)
        self.assertNotIn("<strong>Tipo de registro:</strong>", html)
        self.assertLess(html.index(self.p.estudiante.nombre_completo), html.index(self.p2.estudiante.username))
        self.assertNotIn("Postulación #", html)
        self.assertNotIn("window.print()", html)
        self.assertIn("</style></head><body><header", html)
        self.assertIn("@page { size: A4 landscape; margin: 10mm; }", html)
        self.assertIn("-webkit-print-color-adjust: exact", html)
        self.assertIn("print-color-adjust: exact", html)
        self.assertIn("table-layout: fixed", html)
        self.assertIn("thead { display: table-header-group; }", html)
        self.assertIn("break-inside: avoid", html)
        self.assertIn("page-break-inside: avoid", html)
        self.assertEqual(AuditLog.objects.filter(accion="PRINT_APPLICATION_REPORT").count(), 1)

    def test_html_muestra_filtro_avanzado_solo_si_se_aplica(self):
        default_html = self.client.get(
            "/api/v1/reportes/postulaciones/exportar/?formato=html"
        ).content.decode("utf-8")
        filtered_html = self.client.get(
            "/api/v1/reportes/postulaciones/exportar/?formato=html&buscar=Ana"
        ).content.decode("utf-8")

        self.assertNotIn("<strong>Búsqueda:</strong>", default_html)
        self.assertIn("<strong>Búsqueda:</strong> Ana", filtered_html)

    def test_exports_sin_logo_se_mantienen_validos_y_registran_aviso(self):
        with TemporaryDirectory() as temporary_directory:
            with override_settings(BASE_DIR=Path(temporary_directory)):
                with self.assertLogs("apps.reportes.views", level="WARNING") as captured:
                    html_response = self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=html")
                    xlsx_response = self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=xlsx")

        self.assertEqual(html_response.status_code, 200)
        self.assertNotIn('class="institutional-logo"', html_response.content.decode("utf-8"))
        self.assertEqual(xlsx_response.status_code, 200)
        sheet = load_workbook(BytesIO(xlsx_response.content), data_only=False).active
        self.assertEqual(len(sheet._images), 0)
        self.assertEqual(len(captured.records), 2)
        header_row = int(sheet.auto_filter.ref.split(":")[0][1:])
        self.assertEqual(
            [sheet.cell(header_row, column).value for column in range(1, 8)],
            INSTITUTIONAL_HEADERS,
        )

    def test_xlsx_y_html_comparten_el_mismo_universo_y_orden(self):
        xlsx = self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=xlsx&gestion=2026")
        html = self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=html&gestion=2026").content.decode("utf-8")
        sheet = load_workbook(BytesIO(xlsx.content), data_only=False).active
        header_row = int(sheet.auto_filter.ref.split(":")[0][1:])
        names = [row[1] for row in sheet.iter_rows(min_row=header_row + 1, values_only=True)]
        self.assertEqual(names, [self.p.estudiante.nombre_completo, self.p2.estudiante.username])
        self.assertLess(html.index(names[0]), html.index(names[1]))

    @override_settings(REPORT_EXPORT_MAX_ROWS=1)
    def test_html_respeta_limite(self):
        self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=html").status_code, 400)

    @override_settings(REPORT_EXPORT_MAX_ROWS=1)
    def test_xlsx_respeta_limite(self): self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=xlsx").status_code,400)
    def test_formato_no_soportado(self): self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=pdf").status_code,400)
    def test_estudiante_no_exporta(self): self.client.force_authenticate(self.student); self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/").status_code,403)
    def test_estudiante_no_imprime(self): self.client.force_authenticate(self.student); self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=html").status_code,403)
