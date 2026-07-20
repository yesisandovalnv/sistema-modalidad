from django.test import TestCase
from rest_framework.test import APIClient

from apps.academico.models import EtapaModalidad, Modalidad, Periodo
from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    Postulacion,
    SeguimientoEtapa,
)
from apps.usuarios.models import CustomUser


class ExpedienteAccessContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = CustomUser.objects.create_user("exp-staff", is_staff=True)
        cls.owner = CustomUser.objects.create_user(
            "exp-owner", nombres="Ana", apellido_paterno="Pérez", ru="RU-100"
        )
        cls.other = CustomUser.objects.create_user("exp-other")
        cls.assigned = CustomUser.objects.create_user("exp-assigned")
        cls.unassigned = CustomUser.objects.create_user("exp-unassigned")
        cls.modalidad = Modalidad.objects.create(
            codigo="PROYECTO_GRADO", nombre="Proyecto de Grado"
        )
        cls.periodo = Periodo.objects.create(
            nombre="2026-II",
            gestion=2026,
            semestre="II",
            fecha_inicio="2026-07-01",
            fecha_fin="2026-12-31",
        )
        cls.estado = EstadoPostulacion.objects.create(
            codigo="EN_PROCESO", nombre="En proceso"
        )
        cls.postulacion = Postulacion.objects.create(
            codigo="EXP-001",
            estudiante=cls.owner,
            modalidad=cls.modalidad,
            periodo=cls.periodo,
            estado_actual=cls.estado,
        )
        cls.ajena = Postulacion.objects.create(
            codigo="EXP-002",
            estudiante=cls.other,
            modalidad=cls.modalidad,
            periodo=cls.periodo,
            estado_actual=cls.estado,
        )
        cls.inscripcion = EtapaModalidad.objects.create(
            modalidad=cls.modalidad,
            codigo="INSCRIPCION",
            nombre="Inscripción",
            orden=1,
            origen_normativo="Contrato funcional, etapa de inscripción",
        )
        cls.perfil = EtapaModalidad.objects.create(
            modalidad=cls.modalidad,
            codigo="PERFIL_PROYECTO",
            nombre="Perfil de Proyecto",
            orden=2,
            origen_normativo="Contrato funcional, etapa de perfil",
        )
        SeguimientoEtapa.objects.create(
            postulacion=cls.postulacion,
            etapa=cls.inscripcion,
            estado=SeguimientoEtapa.EstadoChoices.APROBADA,
        )
        SeguimientoEtapa.objects.create(
            postulacion=cls.postulacion,
            etapa=cls.perfil,
            estado=SeguimientoEtapa.EstadoChoices.EN_PROCESO,
        )
        AsignacionPostulacion.objects.create(
            postulacion=cls.postulacion,
            usuario=cls.assigned,
            tipo_participacion=AsignacionPostulacion.TipoParticipacionChoices.TUTOR,
            designado_por=cls.staff,
        )

    def client_for(self, user=None):
        client = APIClient()
        if user:
            client.force_authenticate(user)
        return client

    def urls(self, postulacion=None):
        postulacion = postulacion or self.postulacion
        base = f"/api/v1/postulaciones/{postulacion.pk}/"
        return base, f"{base}flujo/"

    def assert_access(self, user, expected):
        detail, flow = self.urls()
        client = self.client_for(user)
        self.assertEqual(client.get(detail).status_code, expected)
        self.assertEqual(client.get(flow).status_code, expected)

    def test_anonymous_receives_401_for_detail_and_flow(self):
        detail, flow = self.urls()
        client = self.client_for()
        self.assertEqual(client.get(detail).status_code, 401)
        self.assertEqual(client.get(flow).status_code, 401)

    def test_staff_owner_and_assigned_actor_access_detail_and_flow(self):
        for user in (self.staff, self.owner, self.assigned):
            with self.subTest(user=user.username):
                self.assert_access(user, 200)

    def test_other_student_and_unassigned_actor_cannot_access(self):
        for user in (self.other, self.unassigned):
            with self.subTest(user=user.username):
                self.assert_access(user, 404)

    def test_detail_exposes_basic_readable_data(self):
        detail, _ = self.urls()
        data = self.client_for(self.owner).get(detail).data
        self.assertEqual(data["codigo"], "EXP-001")
        self.assertEqual(data["estudiante_detalle"]["nombre_completo"], "Ana Pérez")
        self.assertEqual(data["estudiante_detalle"]["ru"], "RU-100")
        self.assertEqual(data["modalidad_detalle"]["nombre"], "Proyecto de Grado")
        self.assertEqual(data["periodo_detalle"]["gestion"], 2026)
        self.assertEqual(data["periodo_detalle"]["semestre"], "II")
        self.assertEqual(data["estado_actual_detalle"]["nombre"], "En proceso")

    def test_flow_exposes_modality_current_stage_progress_and_ordered_stages(self):
        _, flow = self.urls()
        data = self.client_for(self.assigned).get(flow).data
        self.assertEqual(data["modalidad"]["codigo"], "PROYECTO_GRADO")
        self.assertEqual(data["etapa_actual"]["codigo"], "PERFIL_PROYECTO")
        self.assertEqual(data["porcentaje_avance"], 50.0)
        self.assertEqual([item["codigo"] for item in data["etapas"]], ["INSCRIPCION", "PERFIL_PROYECTO"])
