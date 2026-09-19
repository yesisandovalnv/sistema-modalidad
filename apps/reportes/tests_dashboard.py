import csv
from uuid import uuid4
from io import BytesIO, StringIO
from django.test import TestCase, override_settings
from openpyxl import load_workbook
from rest_framework.test import APIClient
from apps.academico.models import Modalidad,Periodo,EtapaModalidad
from apps.documentos.models import DocumentoPostulacion, EstadoDocumento, TipoDocumento
from apps.postulantes.models import Postulacion,EstadoPostulacion,SeguimientoEtapa,AsignacionPostulacion
from apps.notificaciones.models import Notificacion
from apps.usuarios.models import CustomUser,Role,AuditLog
from apps.reportes.views import safe_csv


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
        headers = [cell.value for cell in sheet[7]]
        self.assertIn("Tipo de registro", headers)
        header_map = {header: index + 1 for index, header in enumerate(headers)}
        target_row = next(row for row in sheet.iter_rows(min_row=8, values_only=False) if row[0].value == f"Postulación #{historico.pk}")
        self.assertEqual(target_row[header_map["Etapa actual"] - 1].value, "No aplica")
        self.assertEqual(target_row[header_map["Avance (%)"] - 1].value, "No aplica")
        self.assertEqual(target_row[header_map["Tipo de registro"] - 1].value, "Histórico")
        self.assertEqual(target_row[header_map["Documentos pendientes"] - 1].value, "No aplica")
        self.assertEqual(target_row[header_map["Próxima defensa"] - 1].value, "No aplica")
        self.assertEqual(target_row[header_map["Cierre"] - 1].value, "No aplica")

    def test_xlsx_profesional_filtrado_y_auditoria(self):
        r=self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=xlsx&gestion=2026"); self.assertEqual(r.status_code,200)
        self.assertEqual(r["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); self.assertIn("reporte_postulaciones.xlsx", r["Content-Disposition"])
        sheet=load_workbook(BytesIO(r.content), data_only=False).active
        self.assertEqual(sheet["A1"].value, "SISTEMA DE GRADUACIÓN"); self.assertEqual(sheet["A2"].value, "REPORTE DE POSTULACIONES")
        headers = [sheet.cell(7, column).value for column in range(1, 14)]
        self.assertEqual(headers, ["Postulación", "Postulante", "Modalidad", "Gestión", "Semestre", "Tutor", "Etapa actual", "Estado general", "Avance (%)", "Documentos pendientes", "Próxima defensa", "Cierre", "Tipo de registro"])
        self.assertEqual(sheet.max_row, 9); self.assertEqual(sheet.freeze_panes, "A8"); self.assertTrue(sheet.auto_filter.ref)
        header_map = {header: index + 1 for index, header in enumerate(headers)}
        target_row = next(row for row in sheet.iter_rows(min_row=8, max_row=sheet.max_row, values_only=False) if row[0].value == f"Postulación #{self.p.pk}")
        self.assertEqual(target_row[header_map["Avance (%)"] - 1].value, 1)
        self.assertEqual(target_row[header_map["Avance (%)"] - 1].number_format, "0.00%")
        self.assertEqual(sheet["M7"].value, "Tipo de registro")
        self.assertTrue(sheet.auto_filter.ref.startswith("A7:M"))
        self.assertEqual(AuditLog.objects.filter(accion="EXPORT_APPLICATION_REPORT_XLSX").count(),1)

    @override_settings(REPORT_EXPORT_MAX_ROWS=1)
    def test_xlsx_respeta_limite(self): self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=xlsx").status_code,400)
    def test_formato_no_soportado(self): self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=pdf").status_code,400)
    def test_estudiante_no_exporta(self): self.client.force_authenticate(self.student); self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/").status_code,403)
