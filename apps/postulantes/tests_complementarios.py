from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.academico.models import Modalidad,Periodo
from apps.postulantes.complementarios import CondicionService,EntregaFisicaService
from apps.postulantes.models import AsignacionPostulacion,CondicionPostulacion,EntregaFisica,EstadoPostulacion,Postulacion
from apps.usuarios.models import AuditLog,Role

User=get_user_model()

class Base:
    def setUp(self):
        super().setUp(); ar=Role.objects.create(codigo="ADMINISTRADOR",nombre="Admin C"); sr=Role.objects.create(codigo="ESTUDIANTE",nombre="Est C"); dr=Role.objects.create(codigo="DOCENTE",nombre="Doc C")
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

    def test_admin_verifica_condiciones_en_lote(self):
        first=CondicionService.crear(self.post,"PLAN_ESTUDIOS","Plan",self.admin)
        second=CondicionService.crear(self.post,"MATRICULA_VIGENTE","Matrícula",self.admin)
        self.client.force_authenticate(self.admin)

        response=self.client.post("/api/v1/gestion-complementaria/condiciones/verificar-multiples/",{
            "postulacion":self.post.pk,"condicion_ids":[first.pk,second.pk],"observaciones":"Verificación conjunta",
        },format="json")

        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual({item["id"] for item in response.data},{first.pk,second.pk})
        first.refresh_from_db(); second.refresh_from_db()
        self.assertEqual((first.estado,second.estado),("CUMPLE","CUMPLE"))
        self.assertEqual((first.verificado_por,second.verificado_por),(self.admin,self.admin))
        self.assertEqual((first.observaciones,second.observaciones),("Verificación conjunta","Verificación conjunta"))
        self.assertEqual(AuditLog.objects.filter(modulo="GESTION_COMPLEMENTARIA",accion="VERIFY_CONDITION").count(),2)

    def test_lote_requiere_administrador_y_rechaza_ids_de_otra_postulacion(self):
        own=CondicionService.crear(self.post,"PLAN_ESTUDIOS","Plan",self.admin)
        foreign=CondicionService.crear(self.other_post,"PLAN_ESTUDIOS","Plan ajeno",self.admin)
        endpoint="/api/v1/gestion-complementaria/condiciones/verificar-multiples/"

        self.client.force_authenticate(self.student)
        denied=self.client.post(endpoint,{"postulacion":self.post.pk,"condicion_ids":[own.pk]},format="json")
        self.assertEqual(denied.status_code,403)

        self.client.force_authenticate(self.admin)
        invalid=self.client.post(endpoint,{"postulacion":self.post.pk,"condicion_ids":[own.pk,foreign.pk]},format="json")
        self.assertEqual(invalid.status_code,400)
        own.refresh_from_db()
        foreign.refresh_from_db()
        self.assertEqual(own.estado,"PENDIENTE")
        self.assertEqual(foreign.estado,"PENDIENTE")
        self.assertFalse(AuditLog.objects.filter(modulo="GESTION_COMPLEMENTARIA",accion="VERIFY_CONDITION").exists())

    def test_lote_atomico_falla_si_una_condicion_ya_no_esta_pendiente(self):
        pending=CondicionService.crear(self.post,"PLAN_ESTUDIOS","Plan",self.admin)
        complete=CondicionService.crear(self.post,"MATRICULA_VIGENTE","Matrícula",self.admin)
        complete.estado=CondicionPostulacion.Estado.CUMPLE
        complete.fecha_verificacion=timezone.now()
        complete.verificado_por=self.admin
        complete.save()
        self.client.force_authenticate(self.admin)

        response=self.client.post("/api/v1/gestion-complementaria/condiciones/verificar-multiples/",{
            "postulacion":self.post.pk,"condicion_ids":[pending.pk,complete.pk],
        },format="json")

        self.assertEqual(response.status_code,400)
        pending.refresh_from_db(); complete.refresh_from_db()
        self.assertEqual(pending.estado,"PENDIENTE")
        self.assertEqual(complete.estado,"CUMPLE")
        self.assertFalse(AuditLog.objects.filter(modulo="GESTION_COMPLEMENTARIA",accion="VERIFY_CONDITION").exists())

    def test_admin_registra_entrega(self):
        obj=EntregaFisicaService.crear(self.post,"FOLDER_AMARILLO","Folder",self.admin,cantidad=1); self.client.force_authenticate(self.admin)
        response=self.client.post(f"/api/v1/gestion-complementaria/entregas-fisicas/{obj.pk}/registrar/",{"cantidad_recibida":1})
        self.assertEqual(response.status_code,200); self.assertEqual(response.data["estado"],"COMPLETA")

    def test_admin_registra_entregas_en_lote(self):
        first=EntregaFisicaService.crear(self.post,"CD_RESPALDO","CD",self.admin,cantidad=1)
        second=EntregaFisicaService.crear(self.post,"EJEMPLARES_IMPRESOS","Ejemplares",self.admin,cantidad=2)
        self.client.force_authenticate(self.admin)

        response=self.client.post("/api/v1/gestion-complementaria/entregas-fisicas/registrar-multiples/",{
            "postulacion":self.post.pk,
            "entregas":[
                {"id":first.pk,"cantidad_recibida":1,"observaciones":"Recepción de respaldo"},
                {"id":second.pk,"cantidad_recibida":2,"observaciones":"Módulo de ejemplares"},
            ],
        },format="json")

        self.assertEqual(response.status_code,200,response.data)
        self.assertEqual({item["id"] for item in response.data},{first.pk,second.pk})
        first.refresh_from_db(); second.refresh_from_db()
        self.assertEqual((first.estado,second.estado),("COMPLETA","COMPLETA"))
        self.assertEqual((first.cantidad_recibida,second.cantidad_recibida),(1,2))
        self.assertEqual((first.observaciones,second.observaciones),("Recepción de respaldo","Módulo de ejemplares"))

    def test_lote_de_entregas_requiere_administrador_y_respeta_ownership(self):
        own=EntregaFisicaService.crear(self.post,"CD_RESPALDO","CD",self.admin,cantidad=1)
        foreign=EntregaFisicaService.crear(self.other_post,"EJEMPLARES_IMPRESOS","Ejemplares",self.admin,cantidad=2)
        endpoint="/api/v1/gestion-complementaria/entregas-fisicas/registrar-multiples/"

        self.client.force_authenticate(self.student)
        denied=self.client.post(endpoint,{"postulacion":self.post.pk,"entregas":[{"id":own.pk,"cantidad_recibida":1}]},format="json")
        self.assertEqual(denied.status_code,403)

        self.client.force_authenticate(self.admin)
        invalid=self.client.post(endpoint,{"postulacion":self.post.pk,"entregas":[{"id":own.pk,"cantidad_recibida":1},{"id":foreign.pk,"cantidad_recibida":1}]},format="json")
        self.assertEqual(invalid.status_code,400)
        own.refresh_from_db(); foreign.refresh_from_db()
        self.assertEqual(own.estado,EntregaFisica.Estado.PENDIENTE)
        self.assertEqual(foreign.estado,EntregaFisica.Estado.PENDIENTE)

    def test_lote_de_entregas_es_atomico_si_una_ya_no_esta_pendiente(self):
        pending=EntregaFisicaService.crear(self.post,"CD_RESPALDO","CD",self.admin,cantidad=1)
        complete=EntregaFisicaService.crear(self.post,"EJEMPLARES_IMPRESOS","Ejemplares",self.admin,cantidad=2)
        complete.cantidad_recibida=2; complete.estado=EntregaFisica.Estado.COMPLETA; complete.fecha_entrega=timezone.now(); complete.recibido_por=self.admin; complete.save()
        self.client.force_authenticate(self.admin)

        response=self.client.post("/api/v1/gestion-complementaria/entregas-fisicas/registrar-multiples/",{
            "postulacion":self.post.pk,
            "entregas":[{"id":pending.pk,"cantidad_recibida":1},{"id":complete.pk,"cantidad_recibida":2}],
        },format="json")

        self.assertEqual(response.status_code,400)
        pending.refresh_from_db(); complete.refresh_from_db()
        self.assertEqual(pending.estado,EntregaFisica.Estado.PENDIENTE)
        self.assertEqual(complete.estado,EntregaFisica.Estado.COMPLETA)
