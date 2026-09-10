from django.urls import reverse
from rest_framework.test import APITestCase

from apps.usuarios.models import CustomUser, Role


class AuthMeContractTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administración")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docencia")
        cls.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")

    def request_as(self, **kwargs):
        user = CustomUser.objects.create_user(password="secret", **kwargs)
        self.client.force_authenticate(user)
        return user, self.client.get(reverse("auth_me"))

    def test_admin_contract_has_stable_role_permissions_and_compatibility(self):
        _, response = self.request_as(username="contract-admin", role=self.admin_role, is_staff=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["rol"], {"codigo": "ADMINISTRADOR", "nombre": "Administración"})
        self.assertTrue(response.data["permisos"]["puede_ver_dashboard"])
        self.assertTrue(response.data["permisos"]["puede_exportar_reportes"])
        self.assertEqual(response.data["role"], "Administración")
        self.assertIn("nombre_completo", response.data)

    def test_teacher_and_student_receive_different_capabilities(self):
        _, teacher = self.request_as(username="contract-teacher", role=self.teacher_role)
        self.assertTrue(teacher.data["permisos"]["puede_ver_reportes"])
        self.assertFalse(teacher.data["permisos"]["puede_exportar_reportes"])
        self.assertFalse(teacher.data["permisos"]["puede_gestionar_defensas"])
        self.assertFalse(teacher.data["permisos"]["puede_gestionar_evaluaciones"])
        self.client.force_authenticate(user=None)
        _, student = self.request_as(username="contract-student", role=self.student_role)
        self.assertFalse(student.data["permisos"]["puede_ver_dashboard"])
        self.assertTrue(student.data["permisos"]["puede_ver_notificaciones"])

    def test_defense_management_capability_matches_effective_admin_authority(self):
        _, staff = self.request_as(username="contract-defense-staff", role=self.teacher_role, is_staff=True)
        self.assertFalse(staff.data["permisos"]["puede_gestionar_defensas"])
        self.client.force_authenticate(user=None)
        _, superuser = self.request_as(
            username="contract-defense-superuser",
            is_superuser=True,
        )
        self.assertTrue(superuser.data["permisos"]["puede_gestionar_defensas"])

    def test_contract_does_not_expose_sensitive_fields(self):
        _, response = self.request_as(username="contract-safe", role=self.teacher_role)
        for field in ("password", "access", "refresh", "is_staff", "is_superuser"):
            self.assertNotIn(field, response.data)

    def test_anonymous_is_unauthorized(self):
        self.assertEqual(self.client.get(reverse("auth_me")).status_code, 401)

    def test_inactive_user_gets_no_profile(self):
        user = CustomUser.objects.create_user(username="contract-inactive", password="x")
        user.is_active = False
        user.save(update_fields=["is_active"])
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get(reverse("auth_me")).status_code, 403)
