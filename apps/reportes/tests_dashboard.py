from uuid import uuid4
from django.test import TestCase
from rest_framework.test import APIClient
from apps.academico.models import Modalidad,Periodo,EtapaModalidad
from apps.postulantes.models import Postulacion,EstadoPostulacion,SeguimientoEtapa,AsignacionPostulacion
from apps.notificaciones.models import Notificacion
from apps.usuarios.models import CustomUser,Role,AuditLog


class ReportBase(TestCase):
    def setUp(self):
        self.admin=CustomUser.objects.create_user(username="rep-admin",is_staff=True); er=Role.objects.create(codigo="ESTUDIANTE",nombre="Estudiante R"); dr=Role.objects.create(codigo="DOCENTE",nombre="Docente R")
        self.student=CustomUser.objects.create_user(username="rep-est",nombres="Ana",apellido_paterno="Pérez",role=er); self.other=CustomUser.objects.create_user(username="rep-other",role=er); self.doc=CustomUser.objects.create_user(username="rep-doc",role=dr)
        self.mod=Modalidad.objects.create(codigo="PROYECTO_GRADO",nombre="Proyecto R"); self.period=Periodo.objects.create(nombre="2026-II-R",fecha_inicio="2026-07-01",fecha_fin="2026-12-31"); self.reg=EstadoPostulacion.objects.create(codigo="REGISTRADA_R",nombre="Registrada R"); self.con=EstadoPostulacion.objects.create(codigo="CONCLUIDA",nombre="Concluida R")
        self.p=Postulacion.objects.create(codigo="REP-1",estudiante=self.student,modalidad=self.mod,periodo=self.period,estado_actual=self.reg); self.p2=Postulacion.objects.create(codigo="REP-2",estudiante=self.other,modalidad=self.mod,periodo=self.period,estado_actual=self.con)
        stage=EtapaModalidad.objects.create(modalidad=self.mod,codigo="INSCRIPCION",nombre="Inscripción",orden=1,origen_normativo="Norma"); SeguimientoEtapa.objects.create(postulacion=self.p,etapa=stage,estado="EN_PROCESO")
        AsignacionPostulacion.objects.create(postulacion=self.p,usuario=self.doc,tipo_participacion="TUTOR",designado_por=self.admin)
        self.client=APIClient(); self.client.force_authenticate(self.admin)


class DashboardTests(ReportBase):
    def test_resumen_distribuciones(self):
        r=self.client.get("/api/v1/reportes/dashboard/"); self.assertEqual(r.status_code,200); self.assertEqual(r.data["resumen"]["total_postulaciones"],2); self.assertEqual(r.data["resumen"]["concluidas"],1); self.assertEqual(r.data["modalidades"][0]["total"],2)
    def test_filtros_gestion_semestre(self): self.assertEqual(self.client.get("/api/v1/reportes/dashboard/?gestion=2026&semestre=2").data["resumen"]["total_postulaciones"],2)
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
    def test_busqueda(self): self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/?buscar=Ana").data["count"],1)
    def test_ordering_invalido(self): self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/?ordering=password").status_code,400)
    def test_estudiante_prohibido(self): self.client.force_authenticate(self.student); self.assertEqual(self.client.get("/api/v1/reportes/dashboard/").status_code,403); self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/").status_code,403)
    def test_docente_solo_asignada(self): self.client.force_authenticate(self.doc); r=self.client.get("/api/v1/reportes/postulaciones/"); self.assertEqual(r.status_code,200); self.assertEqual(r.data["count"],1)
    def test_anonimo_401(self): self.client.force_authenticate(None); self.assertEqual(self.client.get("/api/v1/reportes/dashboard/").status_code,401)


class ExportTests(ReportBase):
    def test_csv_y_auditoria(self):
        r=self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=csv"); self.assertEqual(r.status_code,200); self.assertTrue(r.content.startswith(b"\xef\xbb\xbf")); self.assertEqual(AuditLog.objects.filter(accion="EXPORT_APPLICATION_REPORT").count(),1)
    def test_formato_no_soportado(self): self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/?formato=xlsx").status_code,400)
    def test_estudiante_no_exporta(self): self.client.force_authenticate(self.student); self.assertEqual(self.client.get("/api/v1/reportes/postulaciones/exportar/").status_code,403)
