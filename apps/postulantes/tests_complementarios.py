from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

from apps.academico.models import Modalidad,Periodo
from apps.postulantes.complementarios import CondicionService,EntregaFisicaService
from apps.postulantes.models import AsignacionPostulacion,CondicionPostulacion,EntregaFisica,EstadoPostulacion,Postulacion
from apps.usuarios.models import AuditLog,Role

User=get_user_model()

class Base:
    def setUp(self):
        super().setUp(); ar=Role.objects.create(codigo="ADMC",nombre="Admin C"); sr=Role.objects.create(codigo="ESTC",nombre="Est C"); dr=Role.objects.create(codigo="DOCC",nombre="Doc C")
        self.admin=User.objects.create_user(username="adminc",role=ar,is_staff=True); self.student=User.objects.create_user(username="estc",role=sr); self.other=User.objects.create_user(username="otherc",role=sr); self.doc=User.objects.create_user(username="docc",role=dr)
        mod=Modalidad.objects.create(codigo="PGC",nombre="PG C"); period=Periodo.objects.create(nombre="PC",gestion=2026,semestre="I",fecha_inicio="2026-01-01",fecha_fin="2026-12-31"); state=EstadoPostulacion.objects.create(codigo="RC",nombre="Registrada C")
        self.post=Postulacion.objects.create(codigo="POST-C",estudiante=self.student,modalidad=mod,periodo=period,estado_actual=state)
        self.other_post=Postulacion.objects.create(codigo="POST-OC",estudiante=self.other,modalidad=mod,periodo=period,estado_actual=state)
        self.assignment=AsignacionPostulacion.objects.create(postulacion=self.post,usuario=self.doc,tipo_participacion="TUTOR",designado_por=self.admin)

class ModelServiceTests(Base,TestCase):
    def test_condicion_unica_y_usuario_activo(self):
        CondicionService.crear(self.post,"PLAN_ESTUDIOS","Plan",self.admin)
        with self.assertRaises(ValidationError): CondicionService.crear(self.post,"PLAN_ESTUDIOS","Plan",self.admin)
        inactive=User.objects.create_user(username="inactivec",is_active=False)
        obj=CondicionPostulacion(postulacion=self.post,codigo="MATRICULA_VIGENTE",tipo="MATRICULA_VIGENTE",nombre="Matrícula",estado="CUMPLE",verificado_por=inactive)
        with self.assertRaises(ValidationError): obj.full_clean()

    def test_verificar_rechazar_listados_y_auditoria(self):
        ok=CondicionService.crear(self.post,"PLAN_ESTUDIOS","Plan",self.admin); no=CondicionService.crear(self.post,"PLAZO_MAXIMO","Plazo",self.admin)
        CondicionService.verificar(ok,self.admin); CondicionService.rechazar(no,self.admin,"No cumple")
        self.assertEqual(CondicionService.listar_completadas(self.post).count(),1); self.assertEqual(CondicionService.listar_pendientes(self.post).count(),0)
        self.assertTrue(AuditLog.objects.filter(modulo="GESTION_COMPLEMENTARIA",accion="VERIFY_CONDITION").exists())

    def test_entrega_no_asume_cantidad_y_registra_parcial(self):
        obj=EntregaFisicaService.crear(self.post,"EJEMPLARES_IMPRESOS","Ejemplares",self.admin)
        obj=EntregaFisicaService.registrar_entrega(obj,2,self.admin)
        self.assertIsNone(obj.cantidad); self.assertEqual(obj.cantidad_recibida,2); self.assertEqual(obj.estado,"COMPLETA")

    def test_entrega_completa_y_listados(self):
        obj=EntregaFisicaService.crear(self.post,"CD_RESPALDO","CD",self.admin,cantidad=1)
        obj=EntregaFisicaService.actualizar_cantidad(obj,1,self.admin)
        self.assertEqual(obj.estado,"COMPLETA"); self.assertEqual(EntregaFisicaService.listar_completadas(self.post).count(),1)

    def test_workflow_no_cambia(self):
        before=self.post.estado_actual_id; obj=CondicionService.crear(self.post,"ADMISION_COMPLETA","Admisión",self.admin); CondicionService.verificar(obj,self.admin)
        self.post.refresh_from_db(); self.assertEqual(self.post.estado_actual_id,before)

class ApiTests(Base,APITestCase):
    def test_sin_autenticacion(self):
        self.assertEqual(self.client.get("/api/v1/gestion-complementaria/condiciones/").status_code,401)

    def test_estudiante_solo_lee_propias(self):
        CondicionService.crear(self.post,"PLAN_ESTUDIOS","Plan",self.admin); CondicionService.crear(self.other_post,"PLAN_ESTUDIOS","Plan",self.admin)
        self.client.force_authenticate(self.student); response=self.client.get("/api/v1/gestion-complementaria/condiciones/")
        self.assertEqual(response.status_code,200); self.assertEqual(response.data["count"],1); self.assertEqual(self.client.post("/api/v1/gestion-complementaria/condiciones/",{}).status_code,403)

    def test_docente_participante_puede_leer(self):
        CondicionService.crear(self.post,"PLAN_ESTUDIOS","Plan",self.admin); self.client.force_authenticate(self.doc)
        self.assertEqual(self.client.get("/api/v1/gestion-complementaria/condiciones/").data["count"],1)

    def test_admin_verifica_y_no_hay_patch(self):
        obj=CondicionService.crear(self.post,"PLAN_ESTUDIOS","Plan",self.admin); self.client.force_authenticate(self.admin); url=f"/api/v1/gestion-complementaria/condiciones/{obj.pk}/"
        self.assertEqual(self.client.patch(url,{"estado":"CUMPLE"}).status_code,405); self.assertEqual(self.client.post(url+"verificar/",{}).status_code,200)

    def test_admin_registra_entrega(self):
        obj=EntregaFisicaService.crear(self.post,"FOLDER_AMARILLO","Folder",self.admin,cantidad=1); self.client.force_authenticate(self.admin)
        response=self.client.post(f"/api/v1/gestion-complementaria/entregas-fisicas/{obj.pk}/registrar/",{"cantidad_recibida":1})
        self.assertEqual(response.status_code,200); self.assertEqual(response.data["estado"],"COMPLETA")
