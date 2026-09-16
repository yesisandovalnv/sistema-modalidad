from django.test import TestCase
from rest_framework.test import APIClient, APIRequestFactory

from apps.academico.models import Modalidad, Periodo
from apps.modalidades.diplomado_api import DiplomadoOverviewView
from apps.modalidades.examen_grado_api import ExamenGradoOverviewView
from apps.modalidades.excelencia_academica_api import ExcelenciaAcademicaOverviewView
from apps.modalidades.trabajo_dirigido_api import TrabajoDirigidoOverviewView
from apps.postulantes.models import AsignacionPostulacion, EstadoPostulacion, Postulacion
from apps.usuarios.models import CustomUser, Role
from apps.usuarios.serializers import UserAdminSerializer
from apps.usuarios.services import UserCapabilitiesService
from core.permissions import is_staff_user


class CanonicalRoleAuthorityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administrador")
        cls.administration_role = Role.objects.create(codigo="ADMINISTRACION", nombre="Administración")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        cls.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.unknown_role = Role.objects.create(codigo="OTRO", nombre="Otro")
        cls.admin = CustomUser.objects.create_user("role-admin", role=cls.admin_role, is_staff=True)
        cls.technical_superuser = CustomUser.objects.create_superuser("technical-superuser")
        cls.admin_without_staff = CustomUser.objects.create_user("role-admin-bad", role=cls.admin_role)
        cls.administration = CustomUser.objects.create_user("role-administration", role=cls.administration_role)
        cls.teacher = CustomUser.objects.create_user("role-teacher", role=cls.teacher_role)
        cls.teacher_with_staff = CustomUser.objects.create_user("role-teacher-bad", role=cls.teacher_role, is_staff=True)
        cls.student = CustomUser.objects.create_user("role-student", role=cls.student_role)
        cls.other_student = CustomUser.objects.create_user("role-student-other", role=cls.student_role)
        cls.unknown = CustomUser.objects.create_user("role-unknown", role=cls.unknown_role)
        period = Periodo.objects.create(
            nombre="Roles 2026", gestion=2026, semestre="I",
            fecha_inicio="2026-01-01", fecha_fin="2026-06-30",
        )
        modality = Modalidad.objects.create(codigo="ROLE_TEST", nombre="Roles")
        state = EstadoPostulacion.objects.create(codigo="ROLE_REG", nombre="Registrada")
        cls.assigned = Postulacion.objects.create(
            codigo="ROLE-ASSIGNED", estudiante=cls.student, modalidad=modality,
            periodo=period, estado_actual=state,
        )
        cls.foreign = Postulacion.objects.create(
            codigo="ROLE-FOREIGN", estudiante=cls.other_student, modalidad=modality,
            periodo=period, estado_actual=state,
        )
        AsignacionPostulacion.objects.create(
            postulacion=cls.assigned, usuario=cls.teacher, tipo_participacion="TUTOR",
            designado_por=cls.admin,
        )

    def client_as(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_administrator_role_has_internal_authority_independently_of_staff(self):
        self.assertTrue(is_staff_user(self.admin))
        self.assertTrue(is_staff_user(self.technical_superuser))
        self.assertTrue(is_staff_user(self.admin_without_staff))
        for user in (self.administration, self.teacher, self.teacher_with_staff, self.student, self.unknown):
            self.assertFalse(is_staff_user(user))
        self.assertTrue(UserCapabilitiesService.resolve(self.admin)["puede_gestionar_usuarios"])
        self.assertTrue(UserCapabilitiesService.resolve(self.technical_superuser)["puede_gestionar_usuarios"])
        self.assertTrue(UserCapabilitiesService.resolve(self.admin)["puede_ver_modalidades"])
        self.assertTrue(UserCapabilitiesService.resolve(self.student)["puede_ver_modalidades"])
        self.assertFalse(UserCapabilitiesService.resolve(self.teacher_with_staff)["puede_gestionar_usuarios"])
        self.assertTrue(UserCapabilitiesService.resolve(self.admin_without_staff)["puede_gestionar_usuarios"])
        self.assertFalse(UserCapabilitiesService.resolve(self.unknown)["puede_ver_dashboard"])

    def test_superuser_without_role_has_administrative_endpoint_access(self):
        paths = (
            "/api/v1/reportes/dashboard/",
            "/api/v1/usuarios/roles/",
            "/api/v1/academico/modalidades/",
            "/api/v1/academico/periodos/",
            "/api/v1/academico/requisitos/",
            "/api/v1/documentos/tipos-documento/",
        )
        client = self.client_as(self.technical_superuser)
        self.assertEqual(self.technical_superuser.role, None)
        for path in paths:
            self.assertEqual(client.get(path).status_code, 200, path)

    def test_staff_flag_does_not_grant_teacher_or_student_administration(self):
        for role in (self.teacher_role, self.student_role):
            user = CustomUser.objects.create_user(
                f"staff-{role.codigo.lower()}", role=role, is_staff=True,
            )
            self.assertFalse(is_staff_user(user))
            self.assertFalse(UserCapabilitiesService.resolve(user)["puede_gestionar_usuarios"])

    def test_user_serializer_enforces_role_staff_coherence(self):
        teacher = UserAdminSerializer(
            instance=self.teacher,
            data={"role_id": self.teacher_role.pk, "is_staff": True},
            partial=True,
        )
        self.assertFalse(teacher.is_valid())
        admin = UserAdminSerializer(
            instance=self.admin_without_staff,
            data={"role_id": self.admin_role.pk},
            partial=True,
        )
        self.assertTrue(admin.is_valid(), admin.errors)
        self.assertFalse(admin.validated_data["is_staff"])
        admin_with_staff = UserAdminSerializer(
            instance=self.admin_without_staff,
            data={"role_id": self.admin_role.pk, "is_staff": True},
            partial=True,
        )
        self.assertTrue(admin_with_staff.is_valid(), admin_with_staff.errors)
        self.assertTrue(admin_with_staff.validated_data["is_staff"])
        demoted_admin = UserAdminSerializer(
            instance=self.admin,
            data={"role_id": self.teacher_role.pk},
            partial=True,
        )
        self.assertTrue(demoted_admin.is_valid(), demoted_admin.errors)
        self.assertFalse(demoted_admin.validated_data["is_staff"])
        administration = UserAdminSerializer(
            instance=self.administration,
            data={"role_id": self.administration_role.pk, "is_staff": True},
            partial=True,
        )
        self.assertFalse(administration.is_valid())

    def test_technical_superuser_keeps_admin_role_and_django_staff_access(self):
        self.technical_superuser.role = self.admin_role
        self.technical_superuser.is_staff = True
        role_change = UserAdminSerializer(
            instance=self.technical_superuser,
            data={"role_id": self.teacher_role.pk},
            partial=True,
        )
        self.assertFalse(role_change.is_valid())
        staff_change = UserAdminSerializer(
            instance=self.technical_superuser,
            data={"role_id": self.admin_role.pk, "is_staff": False},
            partial=True,
        )
        self.assertFalse(staff_change.is_valid())

    def test_direct_api_access_preserves_role_matrix(self):
        url = "/api/v1/academico/modalidades/"
        self.assertEqual(self.client_as(self.admin).post(url, {"codigo": "DIRECT", "nombre": "Directa"}).status_code, 201)
        self.assertEqual(self.client_as(self.teacher_with_staff).post(url, {"codigo": "NO", "nombre": "No"}).status_code, 403)
        self.assertEqual(self.client_as(self.student).get(url).status_code, 200)
        self.assertEqual(self.client_as(self.teacher).get("/api/v1/reportes/dashboard/").status_code, 200)
        self.assertEqual(self.client_as(self.student).get("/api/v1/reportes/dashboard/").status_code, 403)

    def test_owner_assigned_and_foreign_application_scope(self):
        self.assertEqual(self.client_as(self.student).get(f"/api/v1/postulaciones/{self.assigned.pk}/").status_code, 200)
        self.assertEqual(self.client_as(self.student).get(f"/api/v1/postulaciones/{self.foreign.pk}/").status_code, 404)
        self.assertEqual(self.client_as(self.teacher).get(f"/api/v1/postulaciones/{self.assigned.pk}/").status_code, 200)
        self.assertEqual(self.client_as(self.teacher).get(f"/api/v1/postulaciones/{self.foreign.pk}/").status_code, 404)
        self.assertEqual(self.client_as(self.teacher_with_staff).get(f"/api/v1/postulaciones/{self.foreign.pk}/").status_code, 404)

    def test_specific_modality_overviews_share_assigned_read_scope(self):
        factory = APIRequestFactory()
        for view_class in (
            ExamenGradoOverviewView, ExcelenciaAcademicaOverviewView,
            DiplomadoOverviewView, TrabajoDirigidoOverviewView,
        ):
            request = factory.get("/")
            request.user = self.teacher
            self.assertEqual(view_class()._postulacion(request, self.assigned.pk).pk, self.assigned.pk)
            with self.assertRaisesMessage(Exception, "La postulacion no existe"):
                view_class()._postulacion(request, self.foreign.pk)

    def test_removed_residual_follow_up_url_returns_404(self):
        self.assertEqual(self.client_as(self.admin).get("/api/v1/seguimiento/").status_code, 404)
