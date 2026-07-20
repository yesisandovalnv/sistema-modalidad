from django.test import TestCase
from rest_framework.test import APIClient

from apps.academico.models import Modalidad, Periodo
from apps.postulantes.models import (
    AsignacionPostulacion,
    EstadoPostulacion,
    HistorialEstado,
    Postulacion,
)
from apps.usuarios.models import AuditLog, CustomUser, Role


class BasicApplicationDataContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(codigo="ADMIN", nombre="Administrador")
        cls.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        cls.staff = CustomUser.objects.create_user(
            "basic-staff", role=cls.admin_role, is_staff=True
        )
        cls.role_only_admin = CustomUser.objects.create_user(
            "basic-role-only", role=cls.admin_role
        )
        cls.owner = CustomUser.objects.create_user(
            "basic-owner",
            role=cls.student_role,
            nombres="María",
            apellido_paterno="Rojas",
            ru="RU-700",
        )
        cls.other_student = CustomUser.objects.create_user(
            "basic-other", role=cls.student_role
        )
        cls.assigned = CustomUser.objects.create_user(
            "basic-assigned", role=cls.teacher_role
        )
        cls.unassigned = CustomUser.objects.create_user(
            "basic-unassigned", role=cls.teacher_role
        )
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
        cls.registrada = EstadoPostulacion.objects.create(
            codigo="REGISTRADA", nombre="Registrada"
        )
        cls.en_proceso = EstadoPostulacion.objects.create(
            codigo="EN_PROCESO", nombre="En proceso"
        )
        cls.postulacion = Postulacion.objects.create(
            codigo="BASIC-001",
            estudiante=cls.owner,
            modalidad=cls.modalidad,
            periodo=cls.periodo,
            estado_actual=cls.registrada,
        )
        cls.ajena = Postulacion.objects.create(
            codigo="BASIC-002",
            estudiante=cls.other_student,
            modalidad=cls.modalidad,
            periodo=cls.periodo,
            estado_actual=cls.registrada,
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

    @property
    def url(self):
        return f"/api/v1/postulaciones/{self.postulacion.pk}/"

    def test_authorized_users_read_basic_labels(self):
        for user in (self.staff, self.owner, self.assigned):
            with self.subTest(user=user.username):
                response = self.client_for(user).get(self.url)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["estudiante_detalle"]["nombre_completo"], "María Rojas")
                self.assertEqual(response.data["modalidad_detalle"]["nombre"], "Proyecto de Grado")
                self.assertEqual(response.data["periodo_detalle"]["gestion"], 2026)
                self.assertEqual(response.data["estado_actual_detalle"]["nombre"], "Registrada")

    def test_unrelated_users_do_not_read_application(self):
        for user in (self.other_student, self.unassigned, self.role_only_admin):
            with self.subTest(user=user.username):
                self.assertEqual(self.client_for(user).get(self.url).status_code, 404)

    def test_anonymous_receives_401(self):
        self.assertEqual(self.client_for().get(self.url).status_code, 401)

    def test_only_staff_can_patch(self):
        for user in (self.owner, self.assigned, self.role_only_admin):
            with self.subTest(user=user.username):
                response = self.client_for(user).patch(
                    self.url, {"codigo": "FORBIDDEN"}, format="json"
                )
                self.assertEqual(response.status_code, 403)

    def test_staff_partial_patch_updates_only_sent_basic_fields_and_labels(self):
        response = self.client_for(self.staff).patch(
            self.url,
            {"codigo": "BASIC-001-A", "observaciones_generales": "Dato descriptivo actualizado."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["codigo"], "BASIC-001-A")
        self.assertEqual(response.data["observaciones_generales"], "Dato descriptivo actualizado.")
        self.assertEqual(response.data["estudiante_detalle"]["id"], self.owner.pk)
        self.assertEqual(response.data["modalidad_detalle"]["id"], self.modalidad.pk)
        self.assertEqual(response.data["periodo_detalle"]["id"], self.periodo.pk)

    def test_basic_patch_does_not_create_state_history_or_state_audit(self):
        history_before = HistorialEstado.objects.filter(postulacion=self.postulacion).count()
        audit_before = AuditLog.objects.filter(
            modulo="postulaciones", accion="cambiar_estado"
        ).count()
        response = self.client_for(self.staff).patch(
            self.url, {"observaciones_generales": "Sin transición."}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            HistorialEstado.objects.filter(postulacion=self.postulacion).count(), history_before
        )
        self.assertEqual(
            AuditLog.objects.filter(modulo="postulaciones", accion="cambiar_estado").count(),
            audit_before,
        )

    def test_state_patch_uses_domain_service_and_creates_history(self):
        response = self.client_for(self.staff).patch(
            self.url,
            {"estado_actual": self.en_proceso.pk, "comentario": "Inicio controlado."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        history = HistorialEstado.objects.get(
            postulacion=self.postulacion, estado_nuevo=self.en_proceso
        )
        self.assertEqual(history.estado_anterior, self.registrada)
        self.assertEqual(history.comentario, "Inicio controlado.")
        self.assertTrue(
            AuditLog.objects.filter(modulo="postulaciones", accion="cambiar_estado").exists()
        )

    def test_delete_is_405_for_every_authenticated_role_and_401_for_anonymous(self):
        for user in (self.staff, self.owner, self.assigned, self.role_only_admin):
            with self.subTest(user=user.username):
                self.assertEqual(self.client_for(user).delete(self.url).status_code, 405)
        self.assertEqual(self.client_for().delete(self.url).status_code, 401)
